# app/services/minio_services.py
from minio import Minio
from minio.error import S3Error
from app.core.config import get_settings
from fastapi import UploadFile
import uuid
import logging
from typing import Optional
from datetime import timedelta

logger = logging.getLogger(__name__)  
settings = get_settings()


class MinIOService:
    def __init__(self):
        self.client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure
        )
        self._ensure_buckets_exists()

    
    def _ensure_buckets_exists(self):
        """Create buckets if they don't exist"""
        buckets = [
            settings.minio_bucket_videos,
            settings.minio_bucket_thumbnails
        ]

        for bucket in buckets:
            try:
                if not self.client.bucket_exists(bucket):
                    self.client.make_bucket(bucket)
                    logger.info(f"Created bucket: {bucket}")  
                else:
                    logger.debug(f"Bucket already exists: {bucket}")  
            except S3Error as e:
                logger.error(f"Error with bucket {bucket}: {e}")  
    async def upload_video(
            self,
            file: UploadFile,
            user_id: str
    ) -> str:
        """Upload video file to MinIO"""
        try:
            # Generate unique filename
            file_extension = file.filename.split(".")[-1]
            unique_filename = f"user-{user_id}/{uuid.uuid4()}.{file_extension}"

            # Upload file
            self.client.put_object(
                bucket_name=settings.minio_bucket_videos,
                object_name=unique_filename,
                data=file.file,
                length=-1,  # for unknown length, MinIO will handle it
                part_size=10*1024*1024,   # 10MB
                content_type=file.content_type
            )

            logger.info(f"Uploaded video: {unique_filename}")  
        
        except S3Error as e:
            logger.error(f"Failed to upload video: {str(e)}")  
            raise Exception(f"Failed to upload video: {str(e)}")
        
    async def upload_thumbnail(
            self,
            file: UploadFile,
            user_id: str
    ) -> str:
        """Upload thumbnail to MinIO"""
        try:
            file_extension = file.filename.split('.')[-1]
            unique_filename = f"user-{user_id}/{uuid.uuid4()}.{file_extension}"
            
            self.client.put_object(
                bucket_name=settings.minio_bucket_thumbnails,
                object_name=unique_filename,
                data=file.file,
                length=-1,
                part_size=10*1024*1024,
                content_type=file.content_type
            )
            
            logger.info(f"Uploaded thumbnail: {unique_filename}")  
            return unique_filename
        except S3Error as e:
            logger.error(f"Failed to upload thumbnail: {str(e)}")  
            raise Exception(f"Failed to upload thumbnail: {str(e)}")
             
    def get_video_url(self, object_name: str, expires: timedelta = timedelta(hours=1)) -> str:
        """Generate presigned URL for private video access"""
        try:
            url = self.client.presigned_get_object(
                bucket_name=settings.minio_bucket_videos,
                object_name=object_name,
                expires=expires
            )
            return url
        except S3Error as e:
            logger.error(f"Failed to generate video URL: {str(e)}")  
            raise Exception(f"Failed to generate video URL: {str(e)}")    

    def get_thumbnail_url(self, object_name: str) -> str:
        """Generate public thumbnail URL"""
        return f"http://{settings.minio_endpoint}/{settings.minio_bucket_thumbnails}/{object_name}"
    
    def delete_video(self, object_name: str):
        """Delete video from MinIO"""
        try:
            self.client.remove_object(
                bucket_name=settings.minio_bucket_videos,
                object_name=object_name
            )
            logger.info(f"Deleted video: {object_name}")  
        except S3Error as e:
            logger.error(f"Failed to delete video: {str(e)}")  
            raise Exception(f"Failed to delete video: {str(e)}")
    
    def delete_thumbnail(self, object_name: str):
        """Delete thumbnail from MinIO"""
        try:
            self.client.remove_object(
                bucket_name=settings.minio_bucket_thumbnails,
                object_name=object_name
            )
            logger.info(f"Deleted thumbnail: {object_name}")  
        except S3Error as e:
            logger.error(f"Failed to delete thumbnail: {str(e)}")  
            raise Exception(f"Failed to delete thumbnail: {str(e)}")

    def download_video_to_file(self, object_name: str, local_path: str, chunk_size: int = 8*1024*1024):
        """
        Stream video from MinIO directly to local file

        Args:
            object_name: Path in MinIO (e.g., "user-123/abc-def.mp4")
            local_path: Where to save locally (e.g., "/tmp/vod_processing/abc/raw.mp4")
            chunk_size: Download chunk size (default 8MB)
    
        Memory usage: Only chunk_size at a time, regardless of file size.
        """
        try:
            logger.debug(f"Downloading from MinIO: {object_name} -> {local_path}")  
            
            response = self.client.get_object(
                bucket_name=settings.minio_bucket_videos,
                object_name=object_name
            )

            bytes_downloaded = 0

            with open(local_path, 'wb') as f:
                for chunk in response.stream(chunk_size):
                    f.write(chunk)
                    bytes_downloaded += len(chunk)

            response.close()
            response.release_conn()
            
            logger.debug(f"Download complete: {bytes_downloaded} bytes")  
            return bytes_downloaded

        except S3Error as e:
            logger.error(f"Failed to download video {object_name}: {str(e)}")  
            raise Exception(f"Failed to download video: {str(e)}")


# Singleton instance
minio_service = MinIOService()