# Service layer - contains business logic for video operations
#/backend/app/service/video_service.py
from sqlalchemy.orm import Session
from app.schemas import VideoCreate
from app.models import Video
from fastapi import HTTPException




def create_video(db:Session, video_data: VideoCreate):
    new_video = Video(
        title=video_data.title,
        description=video_data.description,
        video_url=video_data.video_url,
        thumbnail_url = video_data.thumbnail_url,
        duration = video_data.duration,
        is_public = video_data.is_public,


        user_id="admin"

    )

    try:
        db.add(new_video)
        db.commit()
        db.refresh(new_video)
        return new_video
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error Creating video: {str(e)}")


def get_single_video_by_id():
    pass

def get_multiple_videos():
    pass

def update_video_metadata():
    pass


def delete_a_video():
    pass
