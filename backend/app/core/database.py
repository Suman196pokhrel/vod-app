# This is the actual glue: SQLAlchemy engine + session factory + FastAPI dependency.
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import get_settings


Base = declarative_base()

settings = get_settings()


# creating the engine - this will run only once
engine = create_engine(
    settings.database_url,
    future=True,
    echo=True,
    pool_pre_ping=True
)


# Session factory - this will create session each time the dependency gets triggered
SessionLocal = sessionmaker(
    bind = engine,
    autoflush=False,
    autocommit=False,
    future=True
)


# dependency 
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()