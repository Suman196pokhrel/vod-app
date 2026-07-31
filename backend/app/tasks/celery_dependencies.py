# app/tasks/celery_dependencies.py
"""
Database and service dependencies for Celery tasks.
Celery workers run in separate processes - they can't use FastAPI's dependency injection.
"""

from app.core.database import SessionLocal
from app.core.config import get_settings
from app.services.minio_service import MinIOService
from contextlib import contextmanager
import redis


@contextmanager
def get_db_session():
    """
    Context manager for database sessions in Celery tasks.
    
    Usage:
        with get_db_session() as db:
            video = db.query(Video).filter(Video.id == video_id).first()
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_minio_client():
    """
    Get MinIO service instance for Celery tasks.
    """
    return MinIOService()


_redis_client = None


def get_redis_client():
    """
    Shared Redis client for Celery tasks (mirrors app/services/tus_service.py's
    client, same connection settings, separate instance since tasks run in
    the worker process, not the API process).
    """
    global _redis_client
    if _redis_client is None:
        settings = get_settings()
        _redis_client = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            password=settings.redis_password,
            db=settings.redis_db,
            decode_responses=True,
        )
    return _redis_client