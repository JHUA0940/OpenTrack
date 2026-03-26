import asyncio
import uuid
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import PortfolioSnapshot, Position, User
from app.schemas import OCRResult, ConfirmRequest, SnapshotOut
from app.services.ocr_service import extract_portfolio
from app.services.portfolio_calculator import calc_weights, calc_unrealized
from app.config import settings

router = APIRouter(prefix="/upload", tags=["upload"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}
MAX_SIZE_MB = 20


@router.post("/", response_model=OCRResult, summary="Upload screenshot → OCR parse (not yet saved)")
async def upload_screenshot(
    file: UploadFile = File(...),
    ocr_model: str = Form("auto"),   # "auto" | "tesseract" | any Ollama model name
):
    """
    Step 1: Upload a brokerage screenshot.
    Runs OCR and returns parsed data for human review.
    Nothing is saved to the database yet.
    """
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}")

    # Save to temp upload dir
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4()}{Path(file.filename or 'upload').suffix or '.jpg'}"
    dest = upload_dir / filename

    contents = await file.read()
    if len(contents) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"File too large (max {MAX_SIZE_MB}MB)")

    with open(dest, "wb") as f:
        f.write(contents)

    try:
        model_arg = None if ocr_model == "auto" else ocr_model
        # Run blocking OCR in a thread so the event loop is not blocked.
        result = await asyncio.to_thread(extract_portfolio, str(dest), model_arg)
        result.image_path = str(dest)
    except Exception as e:
        dest.unlink(missing_ok=True)
        raise HTTPException(500, f"OCR failed: {e}")

    return result


@router.post("/confirm", response_model=SnapshotOut, summary="Confirm edited OCR data → save snapshot")
def confirm_snapshot(payload: ConfirmRequest, db: Session = Depends(get_db)):
    """
    Step 2: After user reviews/edits OCR result, save as a confirmed daily snapshot.
    Upserts on (user_id, snapshot_date).
    """
    # Validate image_path is within the configured upload directory to prevent
    # path traversal attacks from malicious client payloads.
    if payload.image_path:
        upload_root = Path(settings.UPLOAD_DIR).resolve()
        submitted = Path(payload.image_path).resolve()
        if not str(submitted).startswith(str(upload_root)):
            raise HTTPException(400, "Invalid image path")

    # Ensure user exists
    user = db.get(User, payload.user_id)
    if not user:
        raise HTTPException(404, "User not found")

    # Upsert snapshot — SELECT FOR UPDATE serialises concurrent requests for
    # the same (user_id, snapshot_date) so only one writer proceeds at a time.
    snapshot = (
        db.query(PortfolioSnapshot)
        .filter_by(user_id=payload.user_id, snapshot_date=payload.snapshot_date)
        .with_for_update()
        .first()
    )
    if snapshot:
        # Remove old positions before replacing them.
        db.query(Position).filter_by(snapshot_id=snapshot.id).delete()
    else:
        snapshot = PortfolioSnapshot(user_id=payload.user_id)
        db.add(snapshot)

    snapshot.snapshot_date = payload.snapshot_date
    snapshot.total_value = payload.total_value
    snapshot.currency = payload.currency
    snapshot.broker = payload.broker
    snapshot.notes = payload.notes
    snapshot.image_path = payload.image_path
    snapshot.ocr_confidence = payload.ocr_confidence
    snapshot.is_confirmed = True

    db.flush()

    # Build positions with calculated fields
    positions_data = [p.model_dump() for p in payload.positions]
    positions_data = calc_weights(positions_data, payload.total_value)
    positions_data = calc_unrealized(positions_data)

    for pd in positions_data:
        db.add(Position(snapshot_id=snapshot.id, **pd))

    db.commit()
    db.refresh(snapshot)
    return snapshot
