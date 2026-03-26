from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import PortfolioSnapshot
from app.schemas import PortfolioAnalysisRequest, PortfolioAnalysisResponse
from app.services.analysis_service import analyze_portfolio_with_ollama

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/portfolio-chat", response_model=PortfolioAnalysisResponse)
def portfolio_chat(payload: PortfolioAnalysisRequest, db: Session = Depends(get_db)):
    snapshot = (
        db.query(PortfolioSnapshot)
        .options(joinedload(PortfolioSnapshot.positions))
        .filter_by(user_id=payload.user_id, is_confirmed=True)
        .order_by(PortfolioSnapshot.snapshot_date.desc())
        .first()
    )

    if not snapshot:
        raise HTTPException(404, "No confirmed snapshots found")

    try:
        result = analyze_portfolio_with_ollama(
            snapshot=snapshot,
            question=payload.question,
            history=payload.history,
        )
    except RuntimeError as error:
        raise HTTPException(502, f"AI analysis failed: {error}") from error

    return PortfolioAnalysisResponse(
        snapshot_id=snapshot.id,
        as_of=snapshot.snapshot_date,
        model=result["model"],
        reply=result["reply"],
    )
