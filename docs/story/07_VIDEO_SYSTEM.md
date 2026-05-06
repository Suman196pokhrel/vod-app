# 07 — Video System

**Files covered:** `backend/app/services/video_service.py` · `backend/app/apis/routes/video.py`

---

## Starting Point

We can store files in MinIO and read video metadata (chapter 06). This chapter covers the video upload orchestrator — `VideoService` — and the HTTP endpoints that expose it.

---

## `backend/app/services/video_service.py`

### The Upload Orchestrator — `create_video_with_files()`

This is the most complex function in the backend. It coordinates three separate systems (MinIO, PostgreSQL, Celery) and handles rollback if anything fails.

The function runs 8 sequential steps:

```
1. Validate the video file is present
2. Parse and validate the JSON metadata string
3. Validate MIME types (video: mp4/mov/mkv, thumbnail: jpg/png/webp)
4. Upload video to MinIO → get back the object name
5. Upload thumbnail to MinIO (optional — failure here doesn't abort)
6. Parse the release date (optional — failure here doesn't abort)
7. Build the Video database record
8. INSERT into database → start Celery workflow
```

### Why the Metadata Comes as a JSON String

The API endpoint accepts `multipart/form-data` (because it has file uploads). In multipart requests, each "part" is a string or a file. You can't send a JSON body alongside file parts the normal way — the `Content-Type: application/json` header applies to the whole request body, which is already claimed by the multipart boundary.

The solution: the frontend serializes the metadata to a JSON string and sends it as a form field named `data`. The service parses it:

```python
metadata_dict = json.loads(metadata_json)
metadata = VideoMetadata(**metadata_dict)
```

This is a common pattern for multipart APIs. It's a bit awkward but works across all HTTP clients.

### The Rollback Strategy

```python
video_path = None
thumbnail_path = None
db_committed = False

# ... do the work ...

finally:
    if not db_committed:
        if video_path:
            minio_service.delete_video(video_path)
        if thumbnail_path:
            minio_service.delete_thumbnail(thumbnail_path)
```

Imagine: the video is uploaded to MinIO (step 4 succeeds), but then the database INSERT fails (step 8 fails). You now have a file in MinIO with no record in the database — an orphaned file wasting storage space. There's no way to find or clean it up later.

The `finally` block always runs, whether the function succeeded or threw an exception. If `db_committed` is still False when it runs, it deletes any MinIO files that were uploaded. This is a manual rollback — MinIO and PostgreSQL have no shared transaction mechanism.

**Thumbnail failure is non-fatal (step 5)**

If the thumbnail upload fails, the function logs a warning and continues without a thumbnail. Videos without thumbnails are valid — the missing thumbnail just means the UI shows a placeholder. Aborting the entire upload because the thumbnail failed would be a worse user experience.

**Release date failure is non-fatal (step 6)**

If the release date can't be parsed (malformed string from the frontend), it defaults to `None`. Not worth aborting the upload for.

### The Deferred Import — Avoiding Circular Imports

```python
if db_committed:
    from app.tasks.workflows import start_video_processing  # ← inside the function
    task_result = start_video_processing(db_video.id)
```

This import is inside the function body, not at the top of the file. This is circular import prevention. The dependency chain is:

```
video_service → (if at top level) workflows → video_tasks → minio_service → ... → video_service
```

If `workflows` were imported at the top of `video_service.py`, Python's module loader would hit the circular dependency and fail. By deferring the import to inside the function, it only runs when the function is actually called — by then all modules are fully loaded.

### The Admin Video Listing

```python
def get_all_videos_admin(self, db, skip, limit, status, processing_status, search, user_id, sort_by, sort_order):
    query = db.query(Video).options(joinedload(Video.user))
    if status:
        query = query.filter(Video.status == status)
    if search:
        query = query.filter(or_(
            Video.title.ilike(f"%{search}%"),
            Video.description.ilike(f"%{search}%")
        ))
    total = query.count()  # ← run the COUNT with all filters applied
    videos = query.order_by(...).offset(skip).limit(limit).all()
```

`joinedload(Video.user)` is an eager loading hint. Without it, accessing `video.user.email` for each video would fire one extra database query per video — the "N+1 query problem." `joinedload` tells SQLAlchemy to do a SQL JOIN and fetch all video + user data in one query.

`ilike` is case-insensitive LIKE search. Regular `like` is case-sensitive — searching for "Star" would miss "star wars". The `i` makes it case-insensitive.

`total = query.count()` is called before applying `offset(skip).limit(limit)`. This gives the total count across all pages (not just the current page), which the frontend needs to render pagination controls.

### The Live Bug — `delete_video`

```python
def delete_video(self, db, video_id, user_id):
    video = db.query(Video).filter(Video.id == video_id).first()
    ...
    minio_service.delete_video(video.video_url)  # ← AttributeError!
```

`video.video_url` doesn't exist on the `Video` model. The correct field is `video.raw_video_path`. Calling `DELETE /videos/by-id/{id}` will crash with a 500 error. This is a one-character fix:

```python
minio_service.delete_video(video.raw_video_path)  # ← correct
```

### Dead Code at the Bottom

The file ends with a legacy `create_video()` function:

```python
def create_video(db, video_data: VideoCreate, user_id: str):
    """Legacy function - creates video with URLs already provided"""
    db_video = Video(video_url=video_data.video_url, ...)
```

Nothing in the codebase calls this. It uses `video_url` — a field that doesn't exist on the Video model. It should be deleted entirely.

---

## `backend/app/apis/routes/video.py`

### The Upload Endpoint

```python
@video_router.post("/create", response_model=VideoResponse, status_code=201)
async def create_new_video(
    video: UploadFile = File(...),
    thumbnail: Optional[UploadFile] = File(None),
    data: str = Form(...),             # ← JSON string in a form field
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_video = await video_service.create_video_with_files(
        db=db, video_file=video, thumbnail_file=thumbnail,
        metadata_json=data, user_id=current_user.id
    )
    return new_video
```

This is `async def` because FastAPI needs to await the file reading. All other routes in this file are sync — FastAPI runs them in a thread pool.

### The Status Polling Endpoint

```python
@video_router.get("/{video_id}/status", response_model=VideoProcessingStatusResponse)
async def get_video_processing_status(
    video_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return video_service.get_video_processing_status_service(db, video_id, current_user)
```

Only the video's owner can poll its status. The response includes:
```json
{
  "video_id": "abc-123",
  "status": "transcoding",
  "progress": 40,
  "message": "Transcoding to multiple qualities...",
  "is_completed": false,
  "is_failed": false
}
```

The `progress` and `message` fields are derived from `STATUS_META` — a dictionary in `utils/video_helpers.py` that maps each status string to a progress percentage and display message. This is what powers the animated progress dialog in the frontend.

### The Admin Listing Endpoint

```python
@video_router.get("/list-all", response_model=PaginatedResponse[AdminVideoList])
def get_all_videos(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    current_admin: User = Depends(get_current_admin_user),  # ← admin only
    db: Session = Depends(get_db)
):
```

`Query(20, ge=1, le=100)` — default 20, minimum 1, maximum 100. FastAPI validates this automatically before the function runs. Send `limit=500` and you get a `422 Unprocessable Entity` without any code in the function.

`PaginatedResponse[AdminVideoList]` is a generic response model: `{"items": [...], "total": 100, "skip": 0, "limit": 20}`. This gives the frontend everything it needs to render a paginated table.

---

## Where We Go Next

The upload works — the video file is in MinIO, the database record exists, and a Celery task has been enqueued. Now we look at what happens in that background task: the 6-stage processing pipeline.

**➡️ [08 — Background Jobs](./08_BACKGROUND_JOBS.md)**
