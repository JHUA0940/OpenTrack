from fastapi import APIRouter
from app.services.ocr_service import list_ollama_models

router = APIRouter(prefix="/models", tags=["models"])

# Vision-capable model name hints (substring match)
VISION_HINTS = ["vl", "vision", "llava", "moondream", "minicpm", "glm", "gemma3", "internvl"]


@router.get("/", summary="List available OCR models")
def get_models():
    """
    Returns available OCR backends + all local Ollama models.
    Frontend uses this to populate the model selector.
    """
    ollama_models = list_ollama_models()

    def is_vision(name: str) -> bool:
        lower = name.lower()
        return any(hint in lower for hint in VISION_HINTS)

    return {
        "builtin": [
            {"id": "tesseract", "label": "Tesseract (Local, Free)", "vision": False},
        ],
        "ollama": [
            {
                "id": m,
                "label": m,
                "vision": is_vision(m),
            }
            for m in ollama_models
        ],
    }
