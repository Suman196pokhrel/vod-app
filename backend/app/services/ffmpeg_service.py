"""
FFmpeg/FFprobe utilities for video processing.
"""

import os
import subprocess
import json
import logging
from typing import Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class VideoMetadata:
    
    """Structured video metadata from FFprobe."""
    duration_seconds: float
    width: int
    height: int
    codec: str
    bitrate: int  # bits per second
    frame_rate: float
    file_size: int  # bytes
    audio_codec: Optional[str] = None
    audio_bitrate: Optional[int] = None

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON storage in DB."""
        return {
            "duration_seconds": self.duration_seconds,
            "width": self.width,
            "height": self.height,
            "codec": self.codec,
            "bitrate": self.bitrate,
            "frame_rate": self.frame_rate,
            "file_size": self.file_size,
            "audio_codec": self.audio_codec,
            "audio_bitrate": self.audio_bitrate
        }
    

def extract_metadata(file_path:str) ->VideoMetadata:
    """
        Extract video metadata using FFprobe.
        
        Args:
            file_path: Path to local video file
            
        Returns:
            VideoMetadata object with all extracted info
            
        Raises:
            Exception if FFprobe fails or file is invalid
    """
    command = [
        "ffprobe",
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        file_path
    ]
    
    logger.info(f"Running FFprobe on: {file_path}")

    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=30  
        )
        
        if result.returncode != 0:
            raise Exception(f"FFprobe failed: {result.stderr}")
        
        data = json.loads(result.stdout)
        
    except subprocess.TimeoutExpired:
        raise Exception("FFprobe timed out - file may be corrupted")
    except json.JSONDecodeError:
        raise Exception("FFprobe returned invalid JSON")
    
    # Parse the response
    return _parse_ffprobe_output(data, file_path)




def _parse_ffprobe_output(data: dict, file_path: str) -> VideoMetadata:
    """
    Parse FFprobe JSON output into VideoMetadata.
    
    This handles the complexity of finding video/audio streams
    and extracting the right fields.
    """
    
    # Find video stream
    video_stream = None
    audio_stream = None
    
    for stream in data.get("streams", []):
        if stream.get("codec_type") == "video" and video_stream is None:
            video_stream = stream
        elif stream.get("codec_type") == "audio" and audio_stream is None:
            audio_stream = stream
    
    if not video_stream:
        raise Exception("No video stream found in file")
    
    format_info = data.get("format", {})
    
    # Extract video info
    width = int(video_stream.get("width", 0))
    height = int(video_stream.get("height", 0))
    codec = video_stream.get("codec_name", "unknown")
    
    # Duration: try stream first, then format
    duration = float(video_stream.get("duration", 0)) or float(format_info.get("duration", 0))
    
    # Bitrate: try stream first, then format
    bitrate = int(video_stream.get("bit_rate", 0)) or int(format_info.get("bit_rate", 0))
    
    # Frame rate: usually in format "30/1" or "30000/1001"
    frame_rate_str = video_stream.get("r_frame_rate", "0/1")
    frame_rate = _parse_frame_rate(frame_rate_str)
    
    # File size
    file_size = int(format_info.get("size", 0))
    
    # Audio info (optional)
    audio_codec = None
    audio_bitrate = None
    if audio_stream:
        audio_codec = audio_stream.get("codec_name")
        audio_bitrate = int(audio_stream.get("bit_rate", 0)) or None
    
    metadata = VideoMetadata(
        duration_seconds=duration,
        width=width,
        height=height,
        codec=codec,
        bitrate=bitrate,
        frame_rate=frame_rate,
        file_size=file_size,
        audio_codec=audio_codec,
        audio_bitrate=audio_bitrate
    )
    
    logger.info(f"Extracted metadata: {width}x{height}, {duration:.2f}s, {codec}")
    
    return metadata


def _parse_frame_rate(frame_rate_str: str) -> float:
    """
    Parse frame rate string like "30/1" or "30000/1001" to float.
    """
    try:
        if "/" in frame_rate_str:
            num, den = frame_rate_str.split("/")
            return float(num) / float(den)
        return float(frame_rate_str)
    except (ValueError, ZeroDivisionError):
        return 0.0