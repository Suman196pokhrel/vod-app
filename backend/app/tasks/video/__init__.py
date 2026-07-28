# app/tasks/video/__init__.py - re-exports every video-processing task for workflows.py
from .prepare import test_task, prepare_video
from .storyboard import generate_storyboard
from .transcode import transcode_quality, on_transcode_complete
from .segment import segment_videos
from .manifest import create_manifest
from .upload import upload_to_minio
from .finalize import finalize_processing

__all__ = [
    "test_task",
    "prepare_video",
    "generate_storyboard",
    "transcode_quality",
    "on_transcode_complete",
    "segment_videos",
    "create_manifest",
    "upload_to_minio",
    "finalize_processing",
]
