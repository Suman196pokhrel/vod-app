from fastapi import FastAPI

# Routers 
from api.routes import health


# Appsetup
app = FastAPI()
app.include_router(health.healthRouter)


# Default route
@app.get("/")
async def root():
    return {"message":"Hello world!, vod here."}