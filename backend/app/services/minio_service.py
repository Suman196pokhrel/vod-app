# app/services/minio_service.py

from minio import Minio
from minio.error import S3Error
from app.core.config import get_settings
from fastapi import UploadFile
import uuid
import logging
from datetime import timedelta

logger = logging.getLogger(__name__)
settings = get_settings()


class MinIOService:
    def __init__(self):
        logger.info("Initializing MinIO service")
        logger.info(f"MinIO endpoint: {settings.minio_endpoint}")
        
        try:
            self.client = Minio(
                settings.minio_endpoint,
                access_key=settings.minio_access_key,
                secret_key=settings.minio_secret_key,
                secure=settings.minio_secure
            )
            logger.info("MinIO client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize MinIO client: {str(e)}")
            raise
        
        self._ensure_buckets_exists()

    
    def _ensure_buckets_exists(self):
        """Create buckets if they don't exist"""
        logger.info("Checking MinIO buckets")
        
        buckets = [
            settings.minio_bucket_videos,
            settings.minio_bucket_thumbnails,
            settings.minio_bucket_processed_videos,

        ]

        for bucket in buckets:
            try:
                exists = self.client.bucket_exists(bucket)
                if not exists:
                    logger.info(f"Creating bucket: {bucket}")
                    self.client.make_bucket(bucket)
                    logger.info(f"Bucket created: {bucket}")
                else:
                    logger.debug(f"Bucket exists: {bucket}")
            except S3Error as e:
                logger.error(f"S3 error with bucket {bucket}: {str(e)}")
                raise
            except Exception as e:
                logger.error(f"Error with bucket {bucket}: {str(e)}")
                raise
    
    async def upload_video(
            self,
            file: UploadFile,
            user_id: str
    ) -> str:
        """Upload video file to MinIO"""
        
        logger.info("=" * 60)
        logger.info("MinIO upload_video called")
        logger.info(f"User ID: {user_id}")
        logger.info(f"Filename: {file.filename if file else 'None'}")
        logger.info(f"Content type: {file.content_type if file else 'None'}")
        
        try:
            # Validate inputs
            if not file:
                logger.error("Validation failed: file is None")
                raise ValueError("File object is required")
            
            if not file.filename:
                logger.error("Validation failed: filename is empty")
                raise ValueError("File must have a filename")
            
            logger.info("Input validation passed")
            
            # Generate unique filename
            file_extension = file.filename.split(".")[-1]
            unique_filename = f"user-{user_id}/{uuid.uuid4()}.{file_extension}"
            logger.info(f"Generated path: {unique_filename}")
            
            # Log upload parameters
            logger.info(f"Bucket: {settings.minio_bucket_videos}")
            logger.info(f"Object name: {unique_filename}")
            logger.info(f"Part size: 10 MB")
            
            # Reset file pointer
            try:
                await file.seek(0)
                logger.info("File pointer reset to beginning")
            except Exception as e:
                logger.warning(f"Could not reset file pointer: {str(e)}")
            
            # Perform upload
            logger.info("Calling MinIO put_object")
            
            result = self.client.put_object(
                bucket_name=settings.minio_bucket_videos,
                object_name=unique_filename,
                data=file.file,
                length=-1,
                part_size=10*1024*1024,
                content_type=file.content_type
            )
            
            logger.info(f"put_object completed, result: {result}")
            
            # Verify upload
            try:
                stat = self.client.stat_object(
                    bucket_name=settings.minio_bucket_videos,
                    object_name=unique_filename
                )
                logger.info(f"Upload verified, file size: {stat.size} bytes")
            except S3Error as e:
                logger.error(f"Verification failed: {str(e)}")
                raise Exception(f"Upload succeeded but file not found: {str(e)}")
            
            logger.info(f"Video upload successful: {unique_filename}")
            logger.info("=" * 60)
            
            return f"{settings.minio_bucket_videos}/{unique_filename}"
        
        except S3Error as e:
            logger.error("=" * 60)
            logger.error("MinIO S3 error during upload")
            logger.error(f"Error code: {e.code if hasattr(e, 'code') else 'Unknown'}")
            logger.error(f"Error message: {str(e)}")
            logger.error("=" * 60)
            raise Exception(f"MinIO S3 error: {str(e)}")
        
        except ValueError as e:
            logger.error(f"Validation error: {str(e)}")
            raise Exception(str(e))
        
        except Exception as e:
            logger.error("=" * 60)
            logger.error("Unexpected error during upload")
            logger.error(f"Error type: {type(e).__name__}")
            logger.error(f"Error message: {str(e)}")
            logger.error("=" * 60, exc_info=True)
            raise Exception(f"Upload failed: {str(e)}")
        
    async def upload_thumbnail(
            self,
            file: UploadFile,
            user_id: str
    ) -> str:
        """Upload thumbnail to MinIO"""
        
        logger.info("MinIO upload_thumbnail called")
        logger.info(f"Filename: {file.filename if file else 'None'}")
        
        try:
            if not file or not file.filename:
                raise ValueError("Invalid thumbnail file")
            
            file_extension = file.filename.split('.')[-1]
            unique_filename = f"user-{user_id}/{uuid.uuid4()}.{file_extension}"
            logger.info(f"Generated thumbnail path: {unique_filename}")
            
            # Reset file pointer
            try:
                await file.seek(0)
            except Exception as e:
                logger.warning(f"Could not reset thumbnail pointer: {str(e)}")
            
            # Upload
            logger.info("Calling MinIO put_object for thumbnail")
            
            self.client.put_object(
                bucket_name=settings.minio_bucket_thumbnails,
                object_name=unique_filename,
                data=file.file,
                length=-1,
                part_size=10*1024*1024,
                content_type=file.content_type
            )
            
            logger.info(f"Thumbnail uploaded: {unique_filename}")
            return f"{settings.minio_bucket_thumbnails}/{unique_filename}"

            
        except S3Error as e:
            logger.error(f"S3 error uploading thumbnail: {str(e)}")
            raise Exception(f"Failed to upload thumbnail: {str(e)}")
        
        except Exception as e:
            logger.error(f"Error uploading thumbnail: {str(e)}")
            raise Exception(f"Failed to upload thumbnail: {str(e)}")
             

    def upload_file(self, bucket_name: str, object_name: str, file_path: str, content_type: str = "application/octet-stream"):
        """Upload a local file to MinIO"""
        logger.info(f"Uploading file: {file_path} -> {bucket_name}/{object_name}")

        try:
            # Get file size
            import os
            file_size = os.path.getsize(file_path)

            # Upload file
            with open(file_path, 'rb') as file_data:
                self.client.put_object(
                    bucket_name=bucket_name,
                    object_name=object_name,
                    data=file_data,
                    length=file_size,
                    content_type=content_type
                )
            
            logger.info(f"File uploaded successfully: {object_name}")
            return object_name
            
        except S3Error as e:
            logger.error(f"S3 error uploading file: {str(e)}")
            raise Exception(f"Failed to upload file: {str(e)}")
        
        except Exception as e:
            logger.error(f"Error uploading file: {str(e)}")
            raise Exception(f"Failed to upload file: {str(e)}")


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

    def get_video_download_url(
        self,
        object_name: str,
        download_filename: str,
        public_host: str,
        public_scheme: str,
        expires: timedelta = timedelta(minutes=15),
    ) -> str:
        """Presigned URL that forces a browser download (not inline playback).

        A plain <a download> on the raw video URL doesn't work — that file
        is served from a different origin than the frontend (Caddy's
        /storage proxy to MinIO), and browsers ignore the `download`
        attribute cross-origin. Content-Disposition: attachment set here,
        on MinIO's own response, forces the save-as dialog regardless of
        origin.

        The signature is bound to a `host` header (S3 SigV4 signs it), and
        the browser will hit this through Caddy's /storage proxy under the
        API's own public domain (e.g. api.vod.example.com), not the internal
        `minio:9000` this service's default client talks to — signing with
        the internal host produces a URL Caddy forwards with a *different*
        Host header, which MinIO then rejects as SignatureDoesNotMatch. So
        this signs with a client built against the public host/scheme the
        admin's own request just came in on (passed in from the route,
        derived from the request's Host / X-Forwarded-Proto), then splices
        the /storage prefix into the resulting URL so it actually resolves
        through Caddy instead of a bare (unreachable, unproxied) MinIO host.
        """
        key = "/".join(object_name.split("/")[1:])
        try:
            # region= is required here, not just an optimization: without
            # it minio-py makes a real network call to public_host to look
            # up the bucket's region before it can sign anything — and
            # public_host (the admin's own request host, e.g. "localhost"
            # or the public domain) isn't reachable *from this container*,
            # only from the browser. "us-east-1" is MinIO's own default
            # single-region setup (matches the credential scope already
            # produced by the internal client).
            public_client = Minio(
                public_host,
                access_key=settings.minio_access_key,
                secret_key=settings.minio_secret_key,
                secure=public_scheme == "https",
                region="us-east-1",
            )
            signed_url = public_client.presigned_get_object(
                bucket_name=settings.minio_bucket_videos,
                object_name=key,
                expires=expires,
                response_headers={
                    "response-content-disposition": f'attachment; filename="{download_filename}"'
                },
            )
        except S3Error as e:
            logger.error(f"Failed to generate download URL for {key}: {str(e)}")
            raise Exception(f"Failed to generate download URL: {str(e)}")

        scheme, _, rest = signed_url.partition("://")
        netloc, _, path_and_query = rest.partition("/")
        return f"{scheme}://{netloc}/storage/{path_and_query}"

    def get_thumbnail_url(self, object_name: str) -> str:
        """Generate public thumbnail URL"""
        return f"http://{settings.minio_endpoint}/{settings.minio_bucket_thumbnails}/{object_name}"
    
    def delete_video(self, object_name: str):
        """Delete video from MinIO"""
        # Stored paths are bucket-prefixed (e.g. "vod-videos/user-x/uuid.mp4",
        # see upload_video's return value) — strip that leading segment since
        # bucket_name is already passed separately, or remove_object silently
        # no-ops on a key that was never uploaded (S3 delete is idempotent).
        key = "/".join(object_name.split("/")[1:])
        logger.info(f"Deleting video: {key}")
        try:
            self.client.remove_object(
                bucket_name=settings.minio_bucket_videos,
                object_name=key
            )
            logger.info(f"Video deleted: {key}")
        except S3Error as e:
            logger.error(f"Failed to delete video: {str(e)}")
            raise Exception(f"Failed to delete video: {str(e)}")

    def delete_thumbnail(self, object_name: str):
        """Delete thumbnail from MinIO"""
        key = "/".join(object_name.split("/")[1:])
        logger.info(f"Deleting thumbnail: {key}")
        try:
            self.client.remove_object(
                bucket_name=settings.minio_bucket_thumbnails,
                object_name=key
            )
            logger.info(f"Thumbnail deleted: {key}")
        except S3Error as e:
            logger.error(f"Failed to delete thumbnail: {str(e)}")
            raise Exception(f"Failed to delete thumbnail: {str(e)}")

    def download_video_to_file(self, object_name: str, local_path: str, chunk_size: int = 8*1024*1024):
        """Stream video from MinIO directly to local file"""
        
        pure_object_name = "/".join(object_name.split("/")[1:])
        logger.info(f"Downloading: {pure_object_name} -> {local_path}")
        
        try:
            print(f"From minio service, pure object name : {pure_object_name}, bucket name : {settings.minio_bucket_processed_videos}")
            response = self.client.get_object(
                bucket_name=settings.minio_bucket_videos,
                object_name=pure_object_name
            )

            bytes_downloaded = 0

            with open(local_path, 'wb') as f:
                for chunk in response.stream(chunk_size):
                    f.write(chunk)
                    bytes_downloaded += len(chunk)

            response.close()
            response.release_conn()
            
            logger.info(f"Download complete: {bytes_downloaded} bytes")
            return bytes_downloaded

        except S3Error as e:
            logger.error(f"Failed to download {pure_object_name}: {str(e)}")
            raise Exception(f"Failed to download video: {str(e)}")
        except Exception as e:
            logger.error(f"Error downloading {pure_object_name}: {str(e)}")
            raise Exception(f"Failed to download video: {str(e)}")


# Singleton instance
logger.info("Creating MinIO service singleton")
minio_service = MinIOService()
logger.info("MinIO service ready")