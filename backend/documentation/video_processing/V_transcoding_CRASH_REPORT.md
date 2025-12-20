# System Freeze During Parallel Video Transcoding

## Incident Summary
System became completely unresponsive when uploading a 4K video, requiring hard reboot.

## Root Cause
**Resource Exhaustion** - Attempting to run 7 parallel FFmpeg transcoding processes simultaneously exceeded system capacity.

## Technical Details

### System Specifications
- **CPU**: Intel i7-12700H (14 cores, 20 threads)
- **RAM**: 15.36 GB
- **Workload**: 7 concurrent 4K → multi-quality video transcodes

### What Happened

**Workflow Configuration:**
```python
group(
    transcode_quality.s("1440p"),  # 7 parallel tasks
    transcode_quality.s("1080p"),
    transcode_quality.s("720p"),
    transcode_quality.s("480p"),
    transcode_quality.s("360p"),
    transcode_quality.s("240p"),
    transcode_quality.s("144p"),
)
```

**Celery Default**: `--concurrency=20` (matches CPU thread count)

**Result**: All 7 tasks started simultaneously, each spawning an FFmpeg process.

### The Problem: Resource Oversubscription

**Each FFmpeg process:**
- Requests ~16 CPU threads (80% of available threads)
- Uses ~2-4 GB RAM
- Performs heavy disk I/O

**Math:**
```
CPU:  7 processes × 16 threads = 112 threads demanded
      Available: 20 threads
      Oversubscription: 5.6× (560%)

RAM:  7 processes × 3 GB avg = ~21 GB demanded
      Available: 15 GB
      Deficit: 6 GB → forced disk swap

Disk: 7 simultaneous video read/writes
      SSD can handle ~3-4 efficiently
```

### Failure Cascade

1. **CPU thrashing**: 60-70% of CPU time spent context switching (not actual work)
2. **RAM exhaustion**: System swapped to disk (extremely slow)
3. **Disk bottleneck**: Handling swap + 7 video reads + 7 video writes
4. **Deadlock**: Processes waiting on disk, disk overloaded, system frozen

## Resolution

### Immediate Fix
Limit Celery worker concurrency to prevent parallel overload:
```bash
# Restart Celery with limited workers
celery -A app.celery_app worker --loglevel=info --concurrency=2
```

**Effect:**
- Max 2 FFmpeg processes run simultaneously
- CPU: 2 × 16 = 32 threads (160% load - manageable)
- RAM: 2 × 3 GB = 6 GB (well under limit)
- Remaining 5 tasks queue and execute as workers free up

### Alternative Solutions Considered

**Option 1: Sequential Processing**
- Run one task at a time
- Pros: No resource contention, very stable
- Cons: 3× slower total processing time

**Option 2: Limit FFmpeg Threads**
```python
cmd = ['ffmpeg', '-threads', '4', ...]  # Limit each FFmpeg to 4 threads
```
- Allows more parallel tasks
- Less efficient per-task performance

**Option 3: GPU Encoding** (future improvement)
```python
cmd = ['ffmpeg', '-hwaccel', 'cuda', '-c:v', 'h264_nvenc', ...]
```
- Offload to RTX 3060 GPU
- Could handle 4-6 parallel encodes without CPU overload

## Recommendations

### Development Environment
```bash
celery -A app.celery_app worker --concurrency=2
```
- Keeps system responsive for coding/testing
- Completes 7 qualities in ~6 minutes

### Production Environment
```bash
celery -A app.celery_app worker --concurrency=4
```
- Dedicated server with more RAM (32+ GB)
- No competing processes (browser, IDE, etc.)
- OR implement GPU encoding

