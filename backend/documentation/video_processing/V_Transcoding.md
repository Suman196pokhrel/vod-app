# Video Transcoding Task

## Overview
Converts raw uploaded videos into multiple quality renditions for adaptive bitrate streaming (ABR). Enables smooth playback across different network conditions and devices.

## Technical Decisions

### Codec: H.264 (libx264)

**Why H.264?**
- ✅ **99.9% compatibility** - All browsers, devices, platforms
- ✅ **Hardware acceleration** - Every device from 2010+ has H.264 decoding
- ✅ **Fast encoding** - Suitable for real-time processing
- ✅ **Industry standard** - Used by Vimeo, Twitch, most VOD platforms

**Alternatives Rejected:**
- **H.265/HEVC**: Better compression but only 30% browser support, 4x slower
- **VP9**: No Safari/iOS support (missing 30% of users)
- **AV1**: Best compression but 20x slower encoding, limited support

## Quality Ladder

| Quality | Resolution | Bitrate | Use Case |
|---------|-----------|---------|----------|
| 2160p* | 3840x2160 | 20 Mbps | 4K displays, premium content |
| 1440p | 2560x1440 | 10 Mbps | High-end displays, gaming monitors |
| 1080p | 1920x1080 | 5 Mbps | Desktop, fast connections |
| 720p | 1280x720 | 2.5 Mbps | Tablets, moderate bandwidth |
| 480p | 854x480 | 1 Mbps | Mobile, slower connections |
| 360p | 640x360 | 500 Kbps | Very slow connections |
| 240p | 426x240 | 300 Kbps | 2G/3G networks |
| 144p | 256x144 | 200 Kbps | Extreme bandwidth constraints, previews |

**\*Note:** 2160p is available but disabled during development to reduce testing time (~5min encoding).

**Logic:**
- No upscaling (720p source → max 720p output)
- Parallel processing via Celery groups (7 simultaneous tasks)
- Individual failures don't break workflow
- Comprehensive quality range from 4K to preview quality

## FFmpeg Command
```bash
ffmpeg -i raw.mp4 \
  -c:v libx264 \        # H.264 codec
  -preset medium \      # Speed vs compression balance
  -crf 23 \             # Quality (lower=better, 18-28 range)
  -vf scale=W:H \       # Target resolution
  -b:v 5000k \          # Video bitrate
  -c:a aac \            # Audio codec (universal)
  -b:a 128k \           # Audio bitrate
  -y output.mp4
```

**Parameters:**
- **Preset**: `medium` - Balanced speed/quality
- **CRF**: `23` - Standard web quality (Netflix default)
- **Audio**: AAC @ 128kbps - Universal compatibility

## Output Structure
```
/tmp/video_processing/{video_id}/
├── raw.mp4
└── transcoded/
    ├── 2160p.mp4  (when enabled)
    ├── 1440p.mp4
    ├── 1080p.mp4
    ├── 720p.mp4
    ├── 480p.mp4
    ├── 360p.mp4
    ├── 240p.mp4
    └── 144p.mp4
```

## Error Handling

- Max 2 retries per quality
- 60s delay between retries
- Failed qualities don't break entire workflow
- Comprehensive logging (FFmpeg output, timings, file sizes)



## Development Notes

- **2160p disabled**: Commented out in workflow to speed up development/testing cycles
- **Enable for production**: Uncomment `transcode_quality.s("2160p")` in workflow
- **Quality range**: Supports everything from 4K cinema displays to 2G mobile networks

## Future Improvements

- AV1 codec when browser support reaches 90%+
- GPU-accelerated encoding (NVENC/QuickSync) for 3-5x faster processing
- Smart source copying (skip re-encoding if source matches target quality)
- Multi-codec delivery (VP9 for Chrome, H.264 for Safari)