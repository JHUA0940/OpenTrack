import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import PortfolioSnapshot, User
from app.schemas import SnapshotOut, UserCreate, UserOut  # noqa: F401 (UserOut used as response_model)

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


# ── Users (simple, no auth for MVP) ───────────────────────────────────────

@router.post("/users", response_model=UserOut, summary="Create user")
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter_by(email=payload.email).first()
    if existing:
        return existing
    user = User(email=payload.email, name=payload.name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/users/{user_id}", response_model=UserOut)
def get_user(user_id: uuid.UUID, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return user


# ── Snapshots ──────────────────────────────────────────────────────────────

@router.get("/current", response_model=SnapshotOut, summary="Latest confirmed snapshot")
def get_current(user_id: uuid.UUID = Query(...), db: Session = Depends(get_db)):
    snapshot = (
        db.query(PortfolioSnapshot)
        .filter_by(user_id=user_id, is_confirmed=True)
        .order_by(PortfolioSnapshot.snapshot_date.desc())
        .first()
    )
    if not snapshot:
        raise HTTPException(404, "No confirmed snapshots found")
    return snapshot


@router.get("/snapshots", response_model=list[SnapshotOut], summary="All snapshots (no positions)")
def list_snapshots(user_id: uuid.UUID = Query(...), db: Session = Depends(get_db)):
    return (
        db.query(PortfolioSnapshot)
        .filter_by(user_id=user_id)
        .order_by(PortfolioSnapshot.snapshot_date.desc())
        .all()
    )


@router.delete("/snapshots/{snapshot_id}", summary="Delete a snapshot")
def delete_snapshot(
    snapshot_id: uuid.UUID,
    user_id: uuid.UUID = Query(...),
    db: Session = Depends(get_db),
):
    snap = db.get(PortfolioSnapshot, snapshot_id)
    if not snap:
        raise HTTPException(404, "Snapshot not found")
    if snap.user_id != user_id:
        raise HTTPException(403, "Not authorized to delete this snapshot")
    db.delete(snap)
    db.commit()
    return {"deleted": str(snapshot_id)}
