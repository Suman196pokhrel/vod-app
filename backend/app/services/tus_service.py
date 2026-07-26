# /app/services/tus_service.py
import json
import logging
import uuid
from datetime import datetime, timezone

import redis

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.core.jwt import verify_token
from app.models.tus_upload import TusUpload
from app.models.users import User
from app.models.videos import Video
from app.tasks.workflows import start_video_processing

logger = logging.getLogger(__name__)
settings = get_settings()

_redis_client = None
ADMISSION_KEY_PREFIX = "tus:active:"


def get_redis_client():
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            password=settings.redis_password,
            db=settings.redis_db,
            decode_responses=True,
        )
    return _redis_client


def _admission_key(upload_id: str) -> str:
    return f"{ADMISSION_KEY_PREFIX}{upload_id}"


def count_active_uploads() -> int:
    # Bounded by tus_max_concurrent_uploads (small, single digits to low tens) —
    # KEYS is fine at this scale and simpler than a SCAN cursor loop.
    return len(get_redis_client().keys(f"{ADMISSION_KEY_PREFIX}*"))


def admit_upload(upload_id: str) -> None:
    get_redis_client().set(_admission_key(upload_id), "1", ex=settings.tus_admission_ttl_hours * 3600)


def release_upload(upload_id: str) -> None:
    get_redis_client().delete(_admission_key(upload_id))


def _reject(status_code: int, message: str, headers: dict | None = None) -> dict:
    return {
        "RejectUpload": True,
        "HTTPResponse": {
            "StatusCode": status_code,
            "Body": json.dumps({"message": message}),
            "Header": {"Content-Type": "application/json", **(headers or {})},
        },
    }


def handle_pre_create(event: dict) -> dict:
    upload = event.get("Upload", {})
    metadata = upload.get("MetaData") or {}

    token = metadata.get("token")
    if not token:
        return _reject(401, "Missing auth token in upload metadata")

    payload = verify_token(token, expected_type="access")
    if not payload or not payload.get("user_id"):
        return _reject(401, "Invalid or expired token")
    user_id = payload["user_id"]

    # Admin-only, matching the existing multipart upload path (POST /videos/create
    # requires get_current_admin_user). The JWT payload does carry a "role" claim,
    # but it's a snapshot from token-issue time; look the user up the same way
    # get_current_user does and reuse the existing is_admin() check so a role
    # change (e.g. admin revoked) takes effect immediately rather than only
    # after the token expires.
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
    finally:
        db.close()
    if not user or not user.is_admin():
        return _reject(403, "Admin privileges required")

    title = (metadata.get("title") or "").strip()
    category = (metadata.get("category") or "").strip()
    if not title or not category:
        return _reject(400, "title and category are required upload metadata")

    declared_size = upload.get("Size") or 0
    max_bytes = settings.tus_max_file_size_gb * 1024 ** 3
    if declared_size <= 0 or declared_size > max_bytes:
        return _reject(400, f"File size must be between 1 byte and {settings.tus_max_file_size_gb}GB")

    mime_type = metadata.get("filetype")
    if mime_type not in settings.tus_allowed_mime_types:
        return _reject(400, f"File type '{mime_type}' not allowed")

    if count_active_uploads() >= settings.tus_max_concurrent_uploads:
        return _reject(503, "Too many concurrent uploads, try again shortly", headers={"Retry-After": "30"})

    # tusd hasn't assigned an ID yet at pre-create time (Event.Upload.ID is empty/null
    # here per tusd's hook docs) — generate it ourselves and hand it back via
    # ChangeFileInfo.ID, which tusd honors as the upload's real ID from this point on,
    # including in the post-finish/post-terminate events this same ID will show up in.
    upload_id = str(uuid.uuid4())
    db = SessionLocal()
    try:
        db.add(TusUpload(
            upload_id=upload_id,
            user_id=user_id,
            declared_size=declared_size,
            status="created",
        ))
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    admit_upload(upload_id)
    return {"RejectUpload": False, "ChangeFileInfo": {"ID": upload_id}}


def handle_post_finish(event: dict) -> dict:
    upload = event.get("Upload", {})
    upload_id = upload.get("ID")
    metadata = upload.get("MetaData") or {}

    db = SessionLocal()
    try:
        tus_upload = db.query(TusUpload).filter(TusUpload.upload_id == upload_id).first()
        if tus_upload is None:
            logger.error(f"post-finish for unknown upload_id: {upload_id}")
            return {"RejectUpload": False}

        if tus_upload.status == "completed":
            # Idempotent replay — tusd can retry a hook delivery, don't double-create.
            return {"RejectUpload": False}

        storage = upload.get("Storage") or {}
        raw_video_path = f"{storage.get('Bucket')}/{storage.get('Key')}"

        video = Video(
            title=metadata.get("title", "Untitled"),
            category=metadata.get("category", "uncategorized"),
            raw_video_path=raw_video_path,
            user_id=tus_upload.user_id,
            processing_status="queued",
        )
        db.add(video)
        db.flush()  # populate video.id before referencing it below

        tus_upload.status = "completed"
        tus_upload.video_id = video.id
        tus_upload.object_key = raw_video_path
        tus_upload.completed_at = datetime.now(timezone.utc)
        db.commit()

        release_upload(upload_id)

        try:
            task_result = start_video_processing(video.id)
            video.celery_task_id = task_result.id
            db.commit()
        except Exception as e:
            logger.error(f"Failed to start processing workflow for {video.id}: {str(e)}")

        return {"RejectUpload": False}
    finally:
        db.close()


def handle_post_terminate(event: dict) -> dict:
    upload_id = event.get("Upload", {}).get("ID")

    db = SessionLocal()
    try:
        tus_upload = db.query(TusUpload).filter(TusUpload.upload_id == upload_id).first()
        if tus_upload and tus_upload.status not in ("completed", "terminated"):
            tus_upload.status = "terminated"
            db.commit()
    finally:
        db.close()

    release_upload(upload_id)
    return {"RejectUpload": False}


def get_upload_status(upload_id: str) -> dict | None:
    db = SessionLocal()
    try:
        tus_upload = db.query(TusUpload).filter(TusUpload.upload_id == upload_id).first()
        if tus_upload is None:
            return None
        return {"status": tus_upload.status, "video_id": tus_upload.video_id}
    finally:
        db.close()
