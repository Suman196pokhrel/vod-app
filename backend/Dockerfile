# 1) Base image: small Linux + Python preinstalled
FROM python:3.12-slim

# 2) Basic Python runtime settings
# - PYTHONDONTWRITEBYTECODE: don't create .pyc files in the container
# - PYTHONUNBUFFERED: logs print immediately (important for Docker logs)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1


# 3) Set the working directory inside the container
# Everything after this runs "inside /app"
WORKDIR /app


# 4) Install OS-level packages needed for pytohn deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    ffmpeg \
 && rm -rf /var/lib/apt/lists/*



# 5) Install Python dependencies FIRST (cache-friendly)
# Docker caches layers. If requirements.txt doesn't change,
# Docker will reuse the dependency layer and rebuilds are fast.
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt


# 6) Copy backend source code into the container
COPY . /app



# 7) Document the port (does not publish it; compose publishes)
EXPOSE 8000


# 8) Default command (can be overridden in docker-compose.yml)
# We'll override this for the worker container.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]