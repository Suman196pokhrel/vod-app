
from fastapi import APIRouter


healthRouter = APIRouter(
    prefix="/health",
    tags=["health"]
)


@healthRouter.get("/")
async def check_server_health():
    return {"status":"Ok!"} 