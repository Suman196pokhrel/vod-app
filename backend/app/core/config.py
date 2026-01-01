# This is the place that reads env vars and gives the app a clean settings object.
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

class Settings(BaseSettings):
    database_url: str

    # video processing settings
    base_dir:str = str(Path(__file__).resolve().parent.parent.parent)
    processing_temp_dir: str = base_dir+ "/tmp" + "/video_processing"
    QUALITY_SETTINGS:dict = {
        "2160p": {"width": 3840, "height": 2160, "bitrate": "20000k"},  # 4K
        "1440p": {"width": 2560, "height": 1440, "bitrate": "10000k"},  # 2K
        "1080p": {"width": 1920, "height": 1080, "bitrate": "5000k"},   # Full HD
        "720p": {"width": 1280, "height": 720, "bitrate": "2500k"},     # HD
        "480p": {"width": 854, "height": 480, "bitrate": "1000k"},      # SD
        "360p": {"width": 640, "height": 360, "bitrate": "500k"},       # Low
        "240p": {"width": 426, "height": 240, "bitrate": "300k"},        # Mobile preview
        "144p": {"width": 256, "height": 144, "bitrate": "200k"}            # Mobile preview
    }
    FFMPEG_THREADS:int = 1,

    # JWT Settings
    jwt_secret_key: str
    jwt_algorithm: str
    access_token_expire_minutes: int = 30
    refresh_token_expire_days:int = 7

    # Email settings
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str
    smtp_password: str
    from_email: str
    frontend_url: str = "http://localhost:3000"

    # MinIO Settings
    minio_endpoint: str 
    minio_access_key: str  
    minio_secret_key: str  
    minio_bucket_videos: str
    minio_bucket_thumbnails: str
    minio_bucket_processed_videos: str
    minio_secure: bool = False  # True in production with HTTPS

    # Redis Settings
    redis_host: str
    redis_port: int = 6739
    redis_password:str
    redis_db:int = 0


    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


# So that this object is only created once , instead of multiple time if we used the env vars in the dependency
@lru_cache
def get_settings() -> Settings:
    return Settings()