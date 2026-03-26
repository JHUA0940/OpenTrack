from pathlib import Path
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

if __package__ in (None, ""):
    # Allow `python backend/app/main.py` to resolve the `app` package.
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Import all models so SQLAlchemy's metadata is fully populated (needed by Alembic).
import app.models  # noqa: F401, E402

from app.config import settings
from app.database import Base  # noqa: F401 — imported so models register with Base.metadata
from app.routers import ai, upload, portfolio, history, models

app = FastAPI(
    title="OpenTrack API",
    description="Investment portfolio tracking for Australian investors",
    version="1.0.0",
)

# CORS — allow Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded images
upload_dir = Path(settings.UPLOAD_DIR)
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")

# Routers
app.include_router(upload.router, prefix="/api/v1")
app.include_router(portfolio.router, prefix="/api/v1")
app.include_router(history.router, prefix="/api/v1")
app.include_router(models.router, prefix="/api/v1")
app.include_router(ai.router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok", "ocr_backend": settings.OCR_BACKEND}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
