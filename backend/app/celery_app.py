from celery import Celery
from app.core.config import get_settings

settings = get_settings()


# Build redis URL from settings
redis_connection_url = f"redis://:{settings.redis_password}@{settings.redis_host}:{settings.redis_port}/{settings.redis_db}"

# Create Celery app instance
celery_app = Celery(
    "vod_app",
    broker=redis_connection_url,   # where new tasks are sent to do
    backend=redis_connection_url   # where to store results for backend to collect
)


# Configure Celery settings
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Australia/Adelaide",
    enable_utc=True,
    result_expires=86400,  # 24 hours
    task_track_started=True,
    task_time_limit=3600,  # 1 hour hard limit
    task_soft_time_limit=3000,  # 50 min soft limit
)


# Auto-discover tasks from the tasks module
celery_app.autodiscover_tasks(['app.tasks'])