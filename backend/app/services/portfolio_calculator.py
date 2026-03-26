"""
Portfolio calculation helpers.
Computes weight_pct, unrealized P&L, and return series.
"""
from datetime import date
from typing import Optional
from app.schemas import ValuePoint, ReturnPoint


def calc_weights(positions: list[dict], total_value: float) -> list[dict]:
    """Add weight_pct to each position dict."""
    if total_value <= 0:
        return positions
    for p in positions:
        p["weight_pct"] = round(p["market_value"] / total_value * 100, 4)
    return positions


def calc_unrealized(positions: list[dict]) -> list[dict]:
    """
    Compute unrealized_pnl and unrealized_pct.
    Priority:
      1. Use values already extracted by OCR (broker shows Return $ / Return %)
      2. Compute from avg_cost if available
    """
    for p in positions:
        # If OCR already gave us the return data, trust it
        if p.get("unrealized_pnl") is not None and p.get("unrealized_pct") is not None:
            continue

        shares = p.get("shares")
        avg_cost = p.get("avg_cost")
        current_price = p.get("current_price")
        market_val = p.get("market_value")

        if shares and avg_cost and current_price:
            cost_basis = shares * avg_cost
            pnl = (shares * current_price) - cost_basis
            p["unrealized_pnl"] = round(pnl, 2)
            p["unrealized_pct"] = round(pnl / cost_basis * 100, 4) if cost_basis else None
        elif p.get("unrealized_pnl") is not None and market_val:
            # Have pnl but not pct — derive pct from cost basis
            pnl = p["unrealized_pnl"]
            cost_basis = market_val - pnl
            p["unrealized_pct"] = round(pnl / cost_basis * 100, 4) if cost_basis else None
    return positions


def build_value_series(
    snapshots: list[tuple[date, float]],
) -> list[ValuePoint]:
    return [ValuePoint(date=d, total_value=v) for d, v in sorted(snapshots)]


def build_return_series(
    snapshots: list[tuple[date, float]],
    base_value: Optional[float] = None,
) -> list[ReturnPoint]:
    """
    Returns % change relative to the first data point (or base_value).
    """
    if not snapshots:
        return []
    sorted_snaps = sorted(snapshots)
    base = base_value or sorted_snaps[0][1]
    if base <= 0:
        return []
    return [
        ReturnPoint(date=d, return_pct=round((v - base) / base * 100, 4))
        for d, v in sorted_snaps
    ]
