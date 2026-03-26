import logging
from typing import Optional

import httpx

from app.config import settings
from app.models import PortfolioSnapshot
from app.schemas import ChatMessage

logger = logging.getLogger(__name__)

PORTFOLIO_ANALYSIS_SYSTEM_PROMPT = """You are OpenTrack AI, a portfolio analysis assistant for Australian investors.
You are given a current portfolio snapshot and optional prior conversation history.

Your job:
- Analyze the holdings that are actually provided.
- Be practical and concise.
- Highlight concentration, diversification, sector or thematic tilts, and obvious risks.
- Call out when data is missing instead of inventing details.
- Answer follow-up questions using the same portfolio context.

Style rules:
- Use short markdown sections or bullets.
- Keep the tone calm and specific.
- Do not claim to know future performance.
- Do not give personal financial advice, tax advice, or instructions to buy or sell.
- End with a brief reminder that this is educational, not personal financial advice."""


def analyze_portfolio_with_ollama(
    snapshot: PortfolioSnapshot,
    question: Optional[str] = None,
    history: Optional[list[ChatMessage]] = None,
) -> dict:
    model = settings.OLLAMA_ANALYSIS_MODEL or settings.OLLAMA_DEFAULT_MODEL
    context = build_portfolio_context(snapshot)
    prompt = (
        "Give me an initial review of this current portfolio."
        if not question or not question.strip()
        else question.strip()
    )

    messages = [{"role": "system", "content": PORTFOLIO_ANALYSIS_SYSTEM_PROMPT}]

    for item in history or []:
        if item.role in {"user", "assistant"} and item.content.strip():
            messages.append({"role": item.role, "content": item.content.strip()})

    messages.append(
        {
            "role": "user",
            "content": (
                f"{context}\n\n"
                f"User request: {prompt}\n\n"
                "Answer using only this portfolio snapshot and the conversation above."
            ),
        }
    )

    try:
        with httpx.Client(timeout=120) as client:
            resp = client.post(
                f"{settings.OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": model,
                    "messages": messages,
                    "stream": False,
                    "options": {"temperature": 0.2},
                },
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as error:
        detail = error.response.text
        logger.exception("Ollama analysis request failed with HTTP error")
        raise RuntimeError(detail or f"Ollama returned HTTP {error.response.status_code}") from error
    except Exception as error:
        logger.exception("Ollama analysis request failed")
        raise RuntimeError(str(error)) from error

    reply = (data.get("message") or {}).get("content", "").strip()
    if not reply:
        raise RuntimeError("Ollama returned an empty analysis response")

    return {"model": model, "reply": reply}


def build_portfolio_context(snapshot: PortfolioSnapshot) -> str:
    positions = sorted(
        snapshot.positions or [],
        key=lambda position: float(position.market_value or 0),
        reverse=True,
    )
    total_value = float(snapshot.total_value or 0)
    total_pnl = sum(float(position.unrealized_pnl or 0) for position in positions)
    holdings = len(positions)

    lines = [
        "Current portfolio snapshot:",
        f"- Snapshot date: {snapshot.snapshot_date.isoformat()}",
        f"- Broker: {snapshot.broker or 'Unknown'}",
        f"- Currency: {snapshot.currency or 'AUD'}",
        f"- Total portfolio value: {format_money(total_value)}",
        f"- Number of holdings: {holdings}",
        f"- Aggregate unrealized P&L: {format_money(total_pnl)}",
        "",
        "Holdings:",
    ]

    if not positions:
        lines.append("- No holdings found in this snapshot.")
    else:
        for position in positions:
            shares = format_number(position.shares)
            price = format_optional_money(position.current_price)
            market_value = format_money(float(position.market_value or 0))
            weight = format_optional_pct(position.weight_pct)
            pnl = format_optional_money(position.unrealized_pnl)
            pnl_pct = format_optional_pct(position.unrealized_pct)
            avg_cost = format_optional_money(position.avg_cost)
            lines.append(
                f"- {position.ticker}: value {market_value}, weight {weight}, shares {shares}, "
                f"price {price}, avg cost {avg_cost}, unrealized P&L {pnl}, unrealized return {pnl_pct}"
            )

    return "\n".join(lines)


def format_money(value: float) -> str:
    return f"AUD {value:,.2f}"


def format_optional_money(value: Optional[float]) -> str:
    if value is None:
        return "n/a"
    return format_money(float(value))


def format_optional_pct(value: Optional[float]) -> str:
    if value is None:
        return "n/a"
    return f"{float(value):.2f}%"


def format_number(value: Optional[float]) -> str:
    if value is None:
        return "n/a"
    return f"{float(value):,.4f}".rstrip("0").rstrip(".")
