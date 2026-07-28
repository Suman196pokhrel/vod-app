# Router package init
from app.apis.routes.auth import auth_router
from app.apis.routes.health import healthRouter
from app.apis.routes.video import video_router
from app.apis.routes.user import user_router
from app.apis.routes.tus_hooks import tus_hooks_router



__all__ = ["auth_router","healthRouter","video_router","user_router","tus_hooks_router"]