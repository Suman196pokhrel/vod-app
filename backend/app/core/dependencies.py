# Dependencies for authentication and authorization
# /app/core/dependencies.py 

from fastapi import Depends, HTTPException, status, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.jwt import verify_token
from app.models.users import User
from typing import Optional
import os
from PIL import Image

import subprocess
import tempfile
import shutil
from pathlib import Path
import struct

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Extract and validate JWT access token from Authorization header.
    Returns the authenticated user or raises 401.
    
    Used for protected endpoints that REQUIRE authentication.
    
    Flow:
    1. Extract token from "Authorization: Bearer <token>" header
    2. Verify token signature and expiration using verify_token()
    3. Extract user_id from token payload
    4. Fetch user from database
    5. Return user object
    """
    
    token = credentials.credentials
    
    # Verify token and check it's an access token
    payload = verify_token(token, expected_type="access")
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Extract user_id from payload (your tokens use 'user_id' not 'sub')
    user_id: str = payload.get("user_id")
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


async def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Verify that the current user has admin privileges
    """
    if not current_user.is_admin():  
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Optional authentication - returns User if valid token exists, None otherwise.
    
    Used for endpoints that work BOTH with and without authentication.
    Example: Public video list (but show extra info if user is logged in)
    
    Returns None instead of raising errors for:
    - No token provided
    - Invalid token
    - Expired token
    - User not found
    """
    
    # No token provided - that's okay
    if credentials is None:
        return None
    
    try:
        token = credentials.credentials
        
        # Verify token
        payload = verify_token(token, expected_type="access")
        
        if not payload:
            return None
        
        # Extract user_id
        user_id: str = payload.get("user_id")
        
        if user_id is None:
            return None
        
        # Get user from database
        user = db.query(User).filter(User.id == user_id).first()
        return user
        
    except Exception:
        # Any error - just return None (graceful degradation)
        return None
    



def _check_file_size(file: UploadFile, max_bytes:int, label:str)->None:
    # FastAPI UploadFile has a SpooledTemporaryFile underneath
    file.file.seek(0, os.SEEK_END)
    size = file.file.tell()
    # reset for later reading
    file.file.seek(0)

    if size > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"{label} exceeds maximum size of {max_bytes / (1024**3):..1f} GB"
        )


def _validate_thumbnail_with_pillow(file: UploadFile) -> tuple[int, int]:
    """Verify it's a real image and get dimensions."""
    try:
        img = Image.open(file.file)
        img.verify()  # Verifies without loading full image into memory
        file.file.seek(0)
        
        # Re-open to get actual dimensions (verify() closes the file)
        img = Image.open(file.file)
        width, height = img.size
        file.file.seek(0)
        
        return width, height
        
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image file: {str(e)}"
        )
    

def _validate_video_with_ffprobe(file: UploadFile) -> dict:
    """
    Run ffprobe to verify the file is a genuine video.
    Returns metadata dict or raises HTTPException.
    """
    # Save to temp file (ffprobe needs a path, not a stream)
    suffix = Path(file.filename or "video").suffix or ".tmp"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name
    
    try:
        # Reset stream position for later use
        file.file.seek(0)
        
        result = subprocess.run(
            [
                "ffprobe",
                "-v", "error",
                "-select_streams", "v:0",      # Video stream only
                "-show_entries", "stream=codec_name,duration,width,height",
                "-of", "json",
                tmp_path
            ],
            capture_output=True,
            text=True,
            timeout=30  # Don't hang on malformed files
        )
        
        if result.returncode != 0:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid video file: {result.stderr.strip()}"
            )
        
        import json
        probe_data = json.loads(result.stdout)
        streams = probe_data.get("streams", [])
        
        if not streams:
            raise HTTPException(
                status_code=400,
                detail="No video stream found in file"
            )
        
        return streams[0]  # Return video stream metadata
        
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=400, detail="Video validation timed out")
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Could not parse video metadata")
    finally:
        Path(tmp_path).unlink(missing_ok=True)



# Magic signatures for common video/image formats
MAGIC_BYTES = {
    # Videos
    b"\x00\x00\x00\x18ftypmp42": "mp4",      # MP4 (various offsets possible)
    b"\x00\x00\x00\x20ftypmp42": "mp4",
    b"\x00\x00\x00\x14ftypisom": "mp4",
    b"RIFF": "avi",                           # AVI (RIFF....AVI )
    b"\x1A\x45\xDF\xA3": "mkv/webm",         # Matroska / WebM
    b"OggS": "ogv",                           # Ogg Video
    
    # Images
    b"\xFF\xD8\xFF": "jpeg",                 # JPEG
    b"\x89PNG\r\n\x1a\n": "png",             # PNG
    b"GIF87a": "gif",                        # GIF
    b"GIF89a": "gif",
    b"RIFF": "webp",                         # WebP (RIFF....WEBP)
    b"BM": "bmp",
}

ALLOWED_VIDEO_TYPES = {"mp4", "avi", "mkv/webm", "mov", "ogv"}
ALLOWED_THUMBNAIL_TYPES = {"jpeg", "png", "gif", "webp", "bmp"}


def _detect_format_from_magic(file: UploadFile) -> str:
    """Read first 32 bytes and match against known signatures."""
    header = file.file.read(32)
    file.file.seek(0)  # Reset
    
    # MP4/MOV uses ftyp box at offset 4 (sometimes offset 0 for some variants)
    if len(header) >= 12:
        if header[4:8] == b"ftyp":
            ftyp_brand = header[8:12].decode("ascii", errors="ignore").lower()
            if ftyp_brand in ("mp42", "isom", "mmp4", "mp41"):
                return "mp4"
            if ftyp_brand in ("qt  ", "moov"):
                return "mov"
            if ftyp_brand == "webm":
                return "mkv/webm"
    
    for magic, fmt in MAGIC_BYTES.items():
        if header.startswith(magic):
            # Deeper check for AVI vs WebP (both start with RIFF)
            if magic == b"RIFF" and len(header) >= 12:
                format_type = header[8:12].decode("ascii", errors="ignore").upper()
                if format_type == "AVI ":
                    return "avi"
                if format_type == "WEBP":
                    return "webp"
            return fmt
    
    return "unknown"