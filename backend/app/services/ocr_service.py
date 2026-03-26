"""
OCR Service —策略模式
  primary  : Tesseract (本地, 免费)
  fallback : OpenAI Vision (可选升级)

切换方式: 设置环境变量 OCR_BACKEND=openai
"""

import re
import json
import base64
import logging
from pathlib import Path
from typing import Optional

import httpx
from PIL import Image, ImageFilter, ImageEnhance
import pytesseract

from app.config import settings
from app.schemas import ParsedPosition, OCRResult

logger = logging.getLogger(__name__)

# ── ASX/常见 ETF 白名单 ────────────────────────────────────────────────────
ASX_TICKERS = {
    "IVV", "NDQ", "VAS", "A200", "VGS", "VDHG", "DHHF",
    "VHY", "VAP", "VGB", "QUAL", "HACK", "ETHI", "RBTZ",
    "ASIA", "EMMG", "VESG", "VBLD", "MVW", "STW", "IOZ",
    "LNAS", "FANG", "SEMI", "CNDQ", "HNDQ", "ESGI", "GLIN",
    "SPY", "QQQ", "VTI", "VOO", "ARKK", "TSLA", "AAPL",
    "MSFT", "AMZN", "NVDA", "GOOGL", "META", "NFLX",
}

# 明确排除：浏览器UI、Stake界面常见词、英语动词
UI_NOISE = {
    "SELL", "BUY", "THE", "AND", "FOR", "ALL", "ARE", "YOU",
    "THIS", "WITH", "FROM", "HAVE", "NOT", "BUT", "CAN",
    "CHAT", "GMAIL", "APPLE", "GOOGLE", "YOUTUBE", "PTE",
    "DEALS", "STAKE", "COM", "HTTP", "HTTPS", "WWW",
    "TOTAL", "VALUE", "PRICE", "SHARE", "STOCK", "FUND",
    "DAY", "WEEK", "MONTH", "YEAR", "DATE", "TIME",
    "ASX", "ETF", "ETFS", "UNITS", "FEED", "NEWS",
    "BETA", "WALL", "IM", "RS", "ST", "BE",
    "NA", "RO", "OM", "EA", "JZ", "BG",
}


# ── Image pre-processing ───────────────────────────────────────────────────

def preprocess_image(path: str) -> Image.Image:
    """Enhance image for Tesseract: grayscale → sharpen → contrast."""
    img = Image.open(path).convert("L")          # grayscale
    img = img.filter(ImageFilter.SHARPEN)
    img = ImageEnhance.Contrast(img).enhance(2.0)
    # Upscale small screenshots for better recognition
    w, h = img.size
    if w < 1000:
        img = img.resize((w * 2, h * 2), Image.LANCZOS)
    return img


# ── Tesseract parser ───────────────────────────────────────────────────────

def _parse_raw_text(raw: str) -> tuple[list[ParsedPosition], float]:
    """
    Heuristic parser for brokerage screenshot text.
    Looks for lines containing a ticker + number pattern.
    Returns (positions, confidence).
    """
    positions: list[ParsedPosition] = []
    lines = raw.upper().splitlines()

    # Pattern: TICKER  [shares]  [price]  value
    # e.g. "IVV  10.5  $123.45  $1,296.23"
    ticker_re = re.compile(r'\b([A-Z]{2,6})\b')
    number_re = re.compile(r'\$?([\d,]+\.?\d*)')

    found_tickers: set = set()

    for line in lines:
        tickers = ticker_re.findall(line)
        raw_numbers = number_re.findall(line)
        numbers = []
        for n in raw_numbers:
            cleaned = n.replace(",", "").strip()
            if cleaned and cleaned != ".":
                try:
                    numbers.append(float(cleaned))
                except ValueError:
                    continue

        for t in tickers:
            # Skip UI noise words
            if t in UI_NOISE:
                continue
            # Must be in known whitelist OR 3-5 chars (stricter than before)
            is_known = t in ASX_TICKERS
            is_plausible = 3 <= len(t) <= 5 and t.isalpha()
            if not (is_known or is_plausible):
                continue
            if t in found_tickers:
                continue

            # Must have at least 2 numbers on the line (e.g. shares + value)
            if len(numbers) < 2:
                continue

            # Market value = largest number on line (most reliable signal)
            market_value = max(numbers)
            # Shares = smallest number (usually unit count)
            shares = min(numbers) if len(numbers) >= 2 else None
            # Price = middle number if 3 present
            price = sorted(numbers)[1] if len(numbers) >= 3 else None

            # Sanity: market value must be meaningful (> $50, < $5M)
            if not (50 < market_value < 5_000_000):
                continue
            # Sanity: shares should be plausible (0.001 – 100,000)
            if shares is not None and not (0.001 <= shares <= 100_000):
                continue

            positions.append(ParsedPosition(
                ticker=t,
                shares=shares,
                current_price=price,
                market_value=market_value,
            ))
            found_tickers.add(t)

    # Confidence: higher when tickers are from known whitelist
    if positions:
        known = sum(1 for p in positions if p.ticker in ASX_TICKERS)
        confidence = min(0.85, 0.4 + (known / len(positions)) * 0.45)
    else:
        confidence = 0.0

    return positions, confidence


def _extract_total(raw: str) -> Optional[float]:
    """Try to extract a total portfolio value from OCR text."""
    # Look for patterns like "Total: $12,345.67" or "Portfolio Value $12,345.67"
    patterns = [
        r'(?:total|portfolio|value|balance)[^\d]*\$([\d,]+\.?\d*)',
        r'\$([\d,]{5,}\.?\d*)',   # large dollar figure
    ]
    for pat in patterns:
        m = re.search(pat, raw, re.IGNORECASE)
        if m:
            try:
                val = m.group(1).replace(",", "").strip()
                if not val:
                    continue
                return float(val)
            except ValueError:
                continue
    return None


def run_tesseract(image_path: str) -> OCRResult:
    img = preprocess_image(image_path)
    config = r"--oem 3 --psm 6"   # assume uniform block of text
    raw_text = pytesseract.image_to_string(img, config=config)

    positions, confidence = _parse_raw_text(raw_text)
    total = _extract_total(raw_text)

    # Derive total from positions if not found
    if total is None and positions:
        total = sum(p.market_value for p in positions)

    return OCRResult(
        broker=_detect_broker(raw_text),
        total_value=total,
        currency="AUD",
        confidence=confidence,
        positions=positions,
        raw_text=raw_text[:2000],  # trim for response
        image_path=image_path,
    )


def _detect_broker(text: str) -> Optional[str]:
    text_lower = text.lower()
    if "stake" in text_lower:
        return "Stake"
    if "ibkr" in text_lower or "interactive" in text_lower:
        return "IBKR"
    if "commsec" in text_lower:
        return "CommSec"
    if "selfwealth" in text_lower:
        return "SelfWealth"
    if "pearler" in text_lower:
        return "Pearler"
    return None


# ── OpenAI Vision parser ───────────────────────────────────────────────────

def run_openai_vision(image_path: str) -> OCRResult:
    from openai import OpenAI
    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    with open(image_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()

    ext = Path(image_path).suffix.lower().lstrip(".")
    mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png"}.get(ext, "image/jpeg")

    SYSTEM = VISION_PROMPT
    resp = client.chat.completions.create(
        model="gpt-4o-mini",   # cheapest vision model ~$0.003/image
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": SYSTEM},
                {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
            ],
        }],
        max_tokens=1000,
    )

    text = resp.choices[0].message.content.strip()
    # Strip markdown fences if present
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.MULTILINE).strip()

    try:
        data = json.loads(text)
        positions = [ParsedPosition(**p) for p in data.get("positions", [])]
    except (json.JSONDecodeError, Exception) as e:
        logger.warning(f"OpenAI Vision returned unparseable JSON: {e}; falling back to Tesseract")
        raise RuntimeError(f"Vision model returned invalid JSON: {e}") from e

    return OCRResult(
        broker=data.get("broker"),
        total_value=data.get("total_value"),
        currency=data.get("currency", "AUD"),
        confidence=data.get("confidence", 0.8),
        positions=positions,
        image_path=image_path,
    )


# ── Ollama Vision parser ───────────────────────────────────────────────────

VISION_PROMPT = """You are a financial data extractor for Australian brokerage screenshots.
Extract all stock/ETF holdings and return ONLY valid JSON with this exact structure:
{
  "broker": "Stake|IBKR|CommSec|SelfWealth|Pearler|other|null",
  "total_value": 12345.67,
  "currency": "AUD",
  "confidence": 0.95,
  "positions": [
    {
      "ticker": "IVV",
      "shares": 10.5,
      "current_price": 123.45,
      "market_value": 1296.23,
      "unrealized_pnl": 45.20,
      "unrealized_pct": 3.61
    }
  ]
}
Field rules:
- ticker: uppercase, no exchange suffix (e.g. "IVV" not "IVV.ASX")
- shares: number of units held
- current_price: current price per share/unit
- market_value: total current value of holding (shares × price)
- unrealized_pnl: total return in dollars (labelled "Return $", "P&L", "Gain/Loss" etc.) — can be negative
- unrealized_pct: return as percentage (labelled "Return %", "Return", "%" etc.) — can be negative, store as number not string (e.g. -3.70 not "-3.70%")
- All dollar values in AUD
- Ignore browser UI, bookmarks bars, navigation — only extract actual portfolio holdings rows
- If a field is not shown in the screenshot use null
- confidence: 0.0-1.0 your accuracy estimate
Return ONLY the JSON object, no explanation, no markdown fences."""


def run_ollama(image_path: str, model: Optional[str] = None) -> OCRResult:
    model = model or settings.OLLAMA_DEFAULT_MODEL
    logger.info(f"Using Ollama model: {model}")

    with open(image_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()

    with httpx.Client(timeout=120) as client:
        resp = client.post(
            f"{settings.OLLAMA_BASE_URL}/api/chat",
            json={
                "model": model,
                "messages": [{"role": "user", "content": VISION_PROMPT, "images": [b64]}],
                "stream": False,
                "options": {"temperature": 0},
            },
        )
        resp.raise_for_status()
        data = resp.json()

    text = data["message"]["content"].strip()
    # Strip markdown fences if model wraps in ```json ... ```
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.MULTILINE).strip()
    # Some models add <think>...</think> reasoning — strip it
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()

    try:
        parsed = json.loads(text)
        positions = [ParsedPosition(**p) for p in parsed.get("positions", [])]
    except (json.JSONDecodeError, Exception) as e:
        logger.warning(f"Ollama returned unparseable JSON: {e}; falling back to Tesseract")
        raise RuntimeError(f"Vision model returned invalid JSON: {e}") from e

    return OCRResult(
        broker=parsed.get("broker"),
        total_value=parsed.get("total_value"),
        currency=parsed.get("currency", "AUD"),
        confidence=parsed.get("confidence", 0.85),
        positions=positions,
        image_path=image_path,
    )


def list_ollama_models() -> list:
    """Return all models available in local Ollama."""
    try:
        with httpx.Client(timeout=5) as client:
            resp = client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            resp.raise_for_status()
            data = resp.json()
        return [m["name"] for m in data.get("models", [])]
    except Exception:
        return []


# ── Public interface ───────────────────────────────────────────────────────

def extract_portfolio(image_path: str, model: Optional[str] = None) -> OCRResult:
    """
    Route to the configured OCR backend.
    model param overrides default (used when frontend selects a specific Ollama model).
    """
    # If caller explicitly passes an Ollama model name, use Ollama regardless of config
    if model and model not in ("tesseract", "openai"):
        try:
            return run_ollama(image_path, model)
        except Exception as e:
            logger.warning(f"Ollama ({model}) failed: {e}, falling back to Tesseract")
            return run_tesseract(image_path)

    backend = settings.OCR_BACKEND

    if backend == "ollama":
        try:
            return run_ollama(image_path)
        except Exception as e:
            logger.warning(f"Ollama failed ({e}), falling back to Tesseract")

    if backend == "openai" and settings.OPENAI_API_KEY:
        try:
            return run_openai_vision(image_path)
        except Exception as e:
            logger.warning(f"OpenAI Vision failed ({e}), falling back to Tesseract")

    logger.info("Using Tesseract for OCR")
    return run_tesseract(image_path)
