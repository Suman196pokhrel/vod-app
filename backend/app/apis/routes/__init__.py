#/backend/app/apis/__init__.py
from app.apis.routes.auth import auth_router
from app.apis.routes.health import healthRouter
from app.apis.routes.video import video_router



__all__ = ["auth_router","healthRouter","video_router"]