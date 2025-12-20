# app/tasks/dependencies.py
"""
Database and service dependencies for Celery tasks.
Celery workers run in separate processes - they can't use FastAPI's dependency injection.
"""

from app.core.database import SessionLocal
from app.services.minio_service import MinIOService
from contextlib import contextmanager


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