# This is the place that reads env vars and gives the app a clean settings object.
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

class Settings(BaseSettings):
    database_url: str

    # video processing settings
    base_dir:str = str(Path(__file__).resolve().parent.parent.parent.parent)
    processing_temp_dir: str = base_dir+ "/tmp" + "/video_processing"


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