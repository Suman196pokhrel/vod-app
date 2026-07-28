# app/services/video/__init__.py — re-exports the video_service singleton for external imports
from .service import video_service, VideoService

__all__ = ["video_service", "VideoService"]
