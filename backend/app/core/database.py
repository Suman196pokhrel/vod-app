# This is the actual glue: SQLAlchemy engine + session factory + FastAPI dependency.
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import get_settings


Base = declarative_base()

settings = get_settings()


# Use the SYNC database URL (psycopg2 driver) here.
# The async URL (asyncpg) is only needed if you switch to async SQLAlchemy throughout.
# Since get_db(), SessionLocal, and all queries in this project are synchronous,
# we must use the sync driver — mixing asyncpg with sync create_engine causes the
# MissingGreenlet crash you were seeing.
engine = create_engine(
    settings.database_url_sync,  # was: settings.database_url (asyncpg) — that was the bug
    future=True,
    echo=False,
    pool_pre_ping=True
)


# Session factory - creates a new session each time the dependency is called
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    future=True
)


# FastAPI dependency — used in route functions via Depends(get_db)
# Name kept the same so nothing else in the codebase needs to change
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()