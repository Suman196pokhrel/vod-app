# Simple health-check endpoint returning service liveness status
from fastapi import APIRouter


healthRouter = APIRouter(
    prefix="/health",
    tags=["health"]
)


@healthRouter.get("/")
async def check_server_health():
    return {"status":"Ok!"} 