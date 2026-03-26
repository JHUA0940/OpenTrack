import logging
from pydantic_settings import BaseSettings
from typing import Literal

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://opentrack:opentrack@localhost:5432/opentrack"
    OCR_BACKEND: Literal["tesseract", "openai", "ollama"] = "ollama"
    OPENAI_API_KEY: str = ""
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_DEFAULT_MODEL: str = "qwen3-vl:235b-cloud"
    OLLAMA_ANALYSIS_MODEL: str = ""
    SECRET_KEY: str = "change-me"
    UPLOAD_DIR: str = "./uploads"
    CORS_ORIGINS: str = "http://localhost:5173"

    class Config:
        env_file = ".env"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS_ORIGINS, stripping accidental whitespace around each entry."""
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()

if settings.SECRET_KEY == "change-me":
    logger.warning(
        "SECRET_KEY is using the insecure default value. "
        "Set SECRET_KEY in your .env file before going to production."
    )
