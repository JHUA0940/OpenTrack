import uuid
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import PortfolioSnapshot, Position
from app.schemas import ValuePoint, ReturnPoint
from app.services.portfolio_calculator import build_value_series

router = APIRouter(prefix="/history", tags=["history"])

PERIOD_DAYS = {"1M": 30, "3M": 90, "1Y": 365, "ALL": None}


def _date_filter(period: str) -> Optional[date]:
    days = PERIOD_DAYS.get(period.upper())
    return (date.today() - timedelta(days=days)) if days else None


@router.get("/value", response_model=list[ValuePoint], summary="Total value over time")
def value_history(
    user_id: uuid.UUID = Query(...),
    period: str = Query("ALL", regex="^(1M|3M|1Y|ALL)$"),
    db: Session = Depends(get_db),
):
    q = db.query(PortfolioSnapshot).filter_by(user_id=user_id, is_confirmed=True)
    since = _date_filter(period)
    if since:
        q = q.filter(PortfolioSnapshot.snapshot_date >= since)
    rows = q.order_by(PortfolioSnapshot.snapshot_date).all()
    return build_value_series([(r.snapshot_date, float(r.total_value)) for r in rows])


@router.get("/returns", response_model=list[ReturnPoint], summary="Return % over time")
def return_history(
    user_id: uuid.UUID = Query(...),
    period: str = Query("ALL", regex="^(1M|3M|1Y|ALL)$"),
    db: Session = Depends(get_db),
):
    """
    Return % strategy (in priority order):
    1. Cost-basis return: pnl / cost_basis — accurate even with 1 snapshot
    2. Snapshot-vs-first-snapshot — fallback when P&L data unavailable

    P&L is aggregated at the database level to avoid loading individual position rows.
    """
    # Aggregate unrealized_pnl per snapshot in the DB (one query, no ORM object loading).
    pnl_subq = (
        db.query(
            Position.snapshot_id,
            func.sum(Position.unrealized_pnl).label("total_pnl"),
            func.count(Position.unrealized_pnl).label("pnl_count"),
        )
        .group_by(Position.snapshot_id)
        .subquery()
    )

    all_rows = (
        db.query(PortfolioSnapshot, pnl_subq.c.total_pnl, pnl_subq.c.pnl_count)
        .outerjoin(pnl_subq, PortfolioSnapshot.id == pnl_subq.c.snapshot_id)
        .filter(PortfolioSnapshot.user_id == user_id, PortfolioSnapshot.is_confirmed.is_(True))
        .order_by(PortfolioSnapshot.snapshot_date)
        .all()
    )

    if not all_rows:
        return []

    since = _date_filter(period)
    rows = all_rows if not since else [r for r in all_rows if r[0].snapshot_date >= since]
    if not rows:
        return []

    result = []
    for snap, total_pnl, pnl_count in rows:
        market_value = float(snap.total_value)

        if pnl_count and total_pnl is not None:
            pnl = float(total_pnl)
            cost_basis = market_value - pnl
            if cost_basis > 0:
                return_pct = round(pnl / cost_basis * 100, 4)
                result.append(ReturnPoint(
                    date=snap.snapshot_date,
                    return_pct=return_pct,
                    return_amount=round(pnl, 2),
                ))
                continue

        # Fallback: % change vs first ever snapshot (no P&L data available)
        base = float(all_rows[0][0].total_value)
        if base:
            pct = round((market_value - base) / base * 100, 4)
            result.append(ReturnPoint(
                date=snap.snapshot_date,
                return_pct=pct,
                return_amount=round(market_value - base, 2),
            ))

    return result
