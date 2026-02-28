# Logger — set up first before anything else so all modules log correctly
from app.core.logging_config import setup_logging
setup_logging()
import os

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Database
from app.models import User, Video
from app.core.database import engine, Base

# Routers
from app.apis.routes import auth_router, healthRouter, video_router, user_router

# Helpers
from app.utils.origin_helpers import parse_origins

CORS_ALLOW_ORIGINS = parse_origins(os.getenv("CORS_ALLOW_ORIGINS"))
if not CORS_ALLOW_ORIGINS:
    CORS_ALLOW_ORIGINS = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

"""
APPLICATION SETUP EXPLANATION:

1. Import all models before creating tables
   - This registers them with SQLAlchemy's Base
   - Base.metadata.create_all() needs to know about all models

2. Create tables on startup via lifespan (not at module level)
   - Previously this was called bare at module level, which worked fine with a sync
     engine and sync driver, but crashes when using an async driver (asyncpg) because
     create_all() is synchronous and can't run in async context without greenlets.
   - Moving it into lifespan() is the FastAPI-recommended pattern and works correctly
     with both sync and async setups.
   - Still safe to run multiple times — create_all() won't touch existing tables.

3. Include routers
   - Each router handles a group of related endpoints
   - Keeps code organized and modular

4. CORS middleware
   - Allows frontend (React/Vue/etc) to call your API
   - Configure origins based on your frontend URL
"""


# Lifespan replaces the old @app.on_event("startup") pattern.
# FastAPI runs everything before `yield` on startup, and after `yield` on shutdown.
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create DB tables if they don't exist yet.
    # This is equivalent to the old bare `Base.metadata.create_all(bind=engine)` 
    # but called in the right place — after the app is initialized, not at import time.
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown: nothing needed here for now, but this is where you'd
    # close connection pools, flush caches, etc. if required later.


# App setup
app = FastAPI(
    title="VOD App API",
    description="Backend API for Video on Demand application",
    version="1.0.0",
    lifespan=lifespan  # wire up our startup/shutdown logic
)

# CORS CONFIGURATION
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(healthRouter)
app.include_router(auth_router)
app.include_router(video_router)
app.include_router(user_router)


# Default route
@app.get("/")
async def root():
    return {
        "message": "Hello world!, VOD here.",
        "version": "1.0.0",
        "docs": "/docs"
    }