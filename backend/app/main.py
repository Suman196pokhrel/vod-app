from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Database
from app.models import User, Video
from app.core.database import engine, Base


# Routers 
from app.apis.routes import auth_router, healthRouter, video_router

"""
APPLICATION SETUP EXPLANATION:

1. Import all models before creating tables
   - This registers them with SQLAlchemy's Base
   - Base.metadata.create_all() needs to know about all models

2. Create tables on startup
   - Creates tables if they don't exist
   - Safe to run multiple times (won't duplicate)

3. Include routers
   - Each router handles a group of related endpoints
   - Keeps code organized and modular

4. CORS middleware
   - Allows frontend (React/Vue/etc) to call your API
   - Configure origins based on your frontend URL
"""

# Create / Ignore tables on startup
Base.metadata.create_all(bind=engine)


# Appsetup
app = FastAPI(
    title="VOD App API",
    description="Backend API for Video on Demand application",
    version="1.0.0"
)

# CORS CONFIGURATION
app.add_middleware(
    CORSMiddleware,
    # In production, replace with  frontend URL
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# Include routers
app.include_router(healthRouter)
app.include_router(auth_router)
app.include_router(video_router)





# Default route
@app.get("/")
async def root():
    return {
        "message": "Hello world!, VOD here.",
        "version": "1.0.0",
        "docs": "/docs"
    }