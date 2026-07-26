# /app/models/tus_upload.py
from sqlalchemy import Column, String, BigInteger, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base


class TusUpload(Base):
    __tablename__ = "tus_uploads"

    upload_id = Column(String, primary_key=True)  # tusd's own upload ID
    user_id = Column(String(100), ForeignKey("users.id"), nullable=False, index=True)
    video_id = Column(String, ForeignKey("videos.id"), nullable=True, index=True)  # set on post-finish
    object_key = Column(String(500), nullable=True)  # final MinIO key, set on post-finish
    declared_size = Column(BigInteger, nullable=False)
    status = Column(String(30), default="created", index=True)  # created|completed|failed|terminated
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
