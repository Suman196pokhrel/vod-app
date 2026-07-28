# tusd webhook receiver (pre-create/post-finish/post-terminate) plus an admin-only upload-status poll route
import hmac

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.concurrency import run_in_threadpool

from app.core.config import get_settings
from app.core.dependencies import get_current_admin_user
from app.models.users import User
from app.services import tus_service

settings = get_settings()

tus_hooks_router = APIRouter(prefix="/internal/tus/hooks", tags=["tus-hooks-internal"])


def _require_tus_enabled() -> None:
    """Gates the entire tusd hook surface behind uploads_tus_enabled. Declared
    as a route-level `dependencies=` entry (not a body check) so it resolves
    before any other dependency — including admin auth on the status route —
    and before the function body runs. With the flag off, this surface 404s
    as if it doesn't exist, rather than leaking that an auth-protected/secret-
    protected endpoint lives here (Caddy's local catch-all reverse-proxies
    everything, so network scope alone does not gate this)."""
    if not settings.uploads_tus_enabled:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


@tus_hooks_router.post("", dependencies=[Depends(_require_tus_enabled)])
async def handle_tus_hook(request: Request, secret: str = ""):
    """Internal-only endpoint tusd calls directly over backend_net. Not part
    of the public API — protected by the uploads_tus_enabled flag gate above
    plus this shared secret, which tusd sends as a query param on its
    statically-configured hook URL (tusd has no mechanism to attach a custom
    outgoing header)."""
    if not settings.tus_hook_shared_secret or not hmac.compare_digest(secret, settings.tus_hook_shared_secret):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid hook secret")

    payload = await request.json()
    event_type = payload.get("Type")
    event = payload.get("Event", {})

    # handle_tus_hook must stay async def (it awaits request.json() above),
    # but the dispatch targets below do blocking sync I/O (SessionLocal /
    # psycopg2, redis-py). An async def route runs directly on the event
    # loop, so blocking here would stall every other concurrent request the
    # API process is handling — not just this one. run_in_threadpool moves
    # the blocking work off the loop, same effect FastAPI gives a plain
    # `def` route automatically (see get_tus_upload_status below, and
    # app/core/dependencies.py's get_current_user for the existing pattern
    # this repo already uses).
    if event_type == "pre-create":
        return await run_in_threadpool(tus_service.handle_pre_create, event)
    if event_type == "post-finish":
        return await run_in_threadpool(tus_service.handle_post_finish, event)
    if event_type == "post-terminate":
        return await run_in_threadpool(tus_service.handle_post_terminate, event)

    return {"RejectUpload": False}


@tus_hooks_router.get("/uploads/{upload_id}", dependencies=[Depends(_require_tus_enabled)])
def get_tus_upload_status(
    upload_id: str,
    current_user: User = Depends(get_current_admin_user),
):
    """Admin-authenticated bridge the frontend polls after an Uppy upload
    completes, to learn the video_id the post-finish hook created — tus's
    own protocol never hands the client a hook-computed value."""
    result = tus_service.get_upload_status(upload_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Upload not found")
    return result
