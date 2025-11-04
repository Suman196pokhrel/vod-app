#/backend/app/apis/routes/video.py
from fastapi import APIRouter, Depends, status
from app.schemas import VideoResponse, VideoCreate
from sqlalchemy.orm import Session
from app.core.database import get_db


from app.services import create_video




video_router = APIRouter(
    prefix="/videos",
    tags=["Video"]
)


@video_router.post(
    "/create",
    response_model= VideoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Created a new video"
)
def create_new_video(video_data:VideoCreate, db:Session= Depends(get_db)):
    new_video = create_video(db, video_data)
    return new_video