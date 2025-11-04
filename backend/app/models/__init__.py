# Makes this directory a Python package and simplifies imports
from app.models.user import User
from app.models.video import Video

__all__ = ["User", "Video"]