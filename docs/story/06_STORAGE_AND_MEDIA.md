# 06 — Storage and Media

**Files covered:** `backend/app/services/minio_service.py` · `backend/app/services/ffmpeg_service.py`

---

## Starting Point

Auth is in place (chapter 05). An authenticated admin can now make requests. This chapter covers the two external systems the video pipeline depends on: MinIO (where files live) and FFmpeg (which reads and processes video files).

---

## `backend/app/services/minio_service.py`

### What Is MinIO?

MinIO is an S3-compatible object storage server you run yourself. "Object storage" stores files as blobs, each identified by a bucket name and an object name. There's no real directory tree — a path like `user-abc/video.mp4` is just a naming convention using `/` as a separator.

The main reason to use MinIO over a real filesystem is scale — object storage is designed for millions of large files, with no size limits or filesystem constraints. In production, you'd swap MinIO for AWS S3 with almost no code changes because MinIO uses the same S3 API.

### The Singleton Pattern

```python
# At the bottom of the file, at module level:
minio_service = MinIOService()
```

`MinIOService()` is created once when the module loads. Every other module that imports `minio_service` gets the same object. This is the singleton pattern.

Why? Creating a MinIO client involves establishing a network connection and checking credentials. You don't want to do that on every API request. One shared client handles all requests.

The client is created at import time (eagerly), not on first use (lazily). If MinIO is unreachable, the app crashes immediately at startup with a clear error — not silently on the first video upload.

### Three Buckets, Auto-Created

```python
def _ensure_buckets_exists(self):
    buckets = [
        settings.minio_bucket_videos,        # "vod-videos"
        settings.minio_bucket_thumbnails,     # "vod-thumbnails"
        settings.minio_bucket_processed_videos # "vod-processed"
    ]
    for bucket in buckets:
        if not self.client.bucket_exists(bucket):
            self.client.make_bucket(bucket)
```

On startup, the service checks that all three buckets exist and creates any that are missing. You never have to manually set up MinIO — the first time the app runs, the buckets appear automatically.

**vod-videos** — raw uploaded files, organized by user: `user-{user_id}/{uuid}.mp4`
**vod-thumbnails** — thumbnail images
**vod-processed** — HLS output after processing: `{video_id}/segments/master.m3u8` + all `.ts` files

### The Upload — `length=-1` and Multipart

```python
result = self.client.put_object(
    bucket_name=settings.minio_bucket_videos,
    object_name=unique_filename,
    data=file.file,           # ← raw file stream
    length=-1,                # ← unknown size
    part_size=10*1024*1024,   # ← 10 MB chunks
    content_type=file.content_type
)
```

`length=-1` tells the MinIO client "I don't know how big this file is." This triggers **multipart upload** — the client reads the stream in 10 MB chunks and uploads each chunk separately. MinIO assembles them server-side.

Why not read the whole file into memory first to get the size? A video file can be several gigabytes. Loading it entirely into RAM would exhaust the server's memory. Streaming it in chunks keeps memory usage flat regardless of file size.

**Verifying the upload:**
```python
stat = self.client.stat_object(bucket_name, unique_filename)
```

After uploading, the code fetches the object's metadata to confirm it exists. An extra round-trip, but it catches silent failures where `put_object` returned without error but the file didn't actually appear.

### Object Names, Not URLs

```python
return unique_filename  # "user-abc123/9f1e2a3b-....mp4"
```

The function returns just the object name — not `http://minio:9000/vod-videos/user-abc123/...`. 

Why? The full URL depends on your environment. In dev, MinIO is at `minio:9000`. In production, it might be on a different host or port. If you stored full URLs in the database, every environment change would require migrating all those URLs. Object names are environment-independent. The full URL is constructed at read time from current configuration.

### Presigned URLs — Time-Limited Access

```python
def get_video_url(self, object_name: str, expires: timedelta = timedelta(hours=1)) -> str:
    url = self.client.presigned_get_object(
        bucket_name=settings.minio_bucket_videos,
        object_name=object_name,
        expires=expires
    )
    return url
```

Raw video files (in `vod-videos`) are private — they shouldn't be directly accessible. To give someone temporary access, MinIO generates a presigned URL: a regular URL with a cryptographic signature embedded in the query string. The URL is valid for 1 hour. After that it stops working automatically.

Processed HLS segments (in `vod-processed`) need to be publicly accessible so the browser's HLS player can fetch them directly. This isn't fully implemented yet — bucket policies to make processed content public haven't been set up.

---

## `backend/app/services/ffmpeg_service.py`

### What Is FFmpeg?

FFmpeg is a command-line tool that reads, converts, and processes almost any audio/video format. This file uses Python's `subprocess` module to run FFmpeg commands and parse their output — not a Python wrapper library.

**Why subprocess instead of the `ffmpeg-python` library?**
The `ffmpeg-python` package is in `requirements.txt` but unused. The direct subprocess approach was chosen because you get full, exact control over the FFmpeg command, raw error messages for debugging, and no library abstraction that might behave differently across versions.

### `extract_metadata()` — Reading Video Info

```python
command = [
    "ffprobe",
    "-v", "quiet",          # suppress verbose logs
    "-print_format", "json",# output as JSON
    "-show_format",         # include container info (duration, file size)
    "-show_streams",        # include per-stream info (codec, resolution, fps)
    file_path
]
result = subprocess.run(command, capture_output=True, text=True, timeout=30)
data = json.loads(result.stdout)
```

`ffprobe` is FFmpeg's companion for inspecting files without processing them. It outputs a JSON structure with:
- **format** — the container type, total duration, file size, overall bitrate
- **streams** — one entry per stream (video, audio, subtitles)

### Parsing the Streams

```python
video_stream = None
audio_stream = None

for stream in data.get("streams", []):
    if stream.get("codec_type") == "video" and video_stream is None:
        video_stream = stream
    elif stream.get("codec_type") == "audio" and audio_stream is None:
        audio_stream = stream
```

A video file typically has one video stream and one audio stream. Some files have multiple audio tracks (different languages), subtitles, etc. The code takes only the first video and first audio stream.

### The Frame Rate Quirk

```python
frame_rate_str = video_stream.get("r_frame_rate", "0/1")  # e.g., "30/1" or "30000/1001"
```

Frame rates are stored as fractions, not decimals. `"30/1"` is 30 fps. `"30000/1001"` is 29.97 fps — the NTSC broadcast standard from the 1950s. American broadcast TV uses 29.97 for historical technical reasons that persist to this day.

```python
def _parse_frame_rate(frame_rate_str: str) -> float:
    if "/" in frame_rate_str:
        num, den = frame_rate_str.split("/")
        return float(num) / float(den)
    return float(frame_rate_str)
```

### The `VideoMetadata` Dataclass

```python
@dataclass
class VideoMetadata:
    duration_seconds: float
    width: int
    height: int
    codec: str
    bitrate: int
    frame_rate: float
    file_size: int
    audio_codec: Optional[str] = None

    def to_dict(self) -> dict:
        return {...}
```

A `@dataclass` is a class where Python auto-generates `__init__` from the annotated fields. It's cleaner than returning a plain dict (you get autocompletion and type checking) and cleaner than a full class with manually written `__init__`.

`to_dict()` converts it to a plain Python dict so it can be stored as JSON in the `processing_metadata` database column.

### The 30-Second Timeout

```python
result = subprocess.run(command, ..., timeout=30)
```

FFprobe on a normal video file takes under 1 second. 30 seconds is very generous. If it exceeds that, the file is likely corrupt or there's a system issue. Rather than hanging forever, the timeout raises an exception that marks the video as failed.

---

## Where We Go Next

We know how to store files in MinIO and read video metadata with FFprobe. Now we look at how those two services are combined in the video upload flow — the `VideoService` that orchestrates everything and the video API routes.

**➡️ [07 — Video System](./07_VIDEO_SYSTEM.md)**
