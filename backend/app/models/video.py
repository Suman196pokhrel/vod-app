from sqlalchemy import Column,Integer, String, Boolean, DateTime , ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from sqlalchemy.sql import func


class Video(Base):
    __tablename__ = "videos"

    # primary key
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)

    title = Column(String(200), index=True, nullable= False)
    description = Column(String(5000), unique=False)
    video_url = Column(String(500), unique=False, nullable=False)
    thumbnail_url = Column(String(500), unique=False,nullable=False)
    duration = Column(Integer, unique= False)

    views_count = Column(Integer, default=0)
    likes_count = Column(Integer, default=0)
    is_public = Column(Boolean, default=True)
    status = Column(String(20), default="ready") # video processing states

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(),onupdate=func.now())

    # foreign key Column
    user_id = Column(String(100), ForeignKey("users.id"), nullable=False, index=True)
    
    # Not a column but , python convenience, this allows us to use this property to directly access respective user for associated with this video
    user = relationship("User", back_populates="videos")
