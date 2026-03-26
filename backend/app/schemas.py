from pydantic import BaseModel, EmailStr
from datetime import date, datetime
from typing import Literal, Optional, List
import uuid


# ── Positions ──────────────────────────────────────────────────────────────

class PositionBase(BaseModel):
    ticker: str
    shares: Optional[float] = None
    avg_cost: Optional[float] = None
    current_price: Optional[float] = None
    market_value: float
    weight_pct: Optional[float] = None
    unrealized_pnl: Optional[float] = None
    unrealized_pct: Optional[float] = None


class PositionOut(PositionBase):
    id: uuid.UUID

    class Config:
        from_attributes = True


# ── Snapshots ──────────────────────────────────────────────────────────────

class SnapshotOut(BaseModel):
    id: uuid.UUID
    snapshot_date: date
    total_value: float
    currency: str
    broker: Optional[str]
    ocr_confidence: Optional[float]
    is_confirmed: bool
    notes: Optional[str]
    positions: List[PositionOut] = []

    class Config:
        from_attributes = True


# ── OCR / Upload ───────────────────────────────────────────────────────────

class ParsedPosition(BaseModel):
    ticker: str
    shares: Optional[float] = None
    current_price: Optional[float] = None
    market_value: float
    avg_cost: Optional[float] = None
    unrealized_pnl: Optional[float] = None    # Return $ from broker
    unrealized_pct: Optional[float] = None    # Return % from broker


class OCRResult(BaseModel):
    """Returned after upload — NOT yet persisted. User must confirm."""
    broker: Optional[str] = None
    total_value: Optional[float] = None
    currency: str = "AUD"
    confidence: float = 0.0
    positions: List[ParsedPosition] = []
    raw_text: Optional[str] = None
    image_path: str = ""


class ConfirmRequest(BaseModel):
    """Payload user sends after reviewing/editing OCR result."""
    snapshot_date: date
    total_value: float
    currency: str = "AUD"
    broker: Optional[str] = None
    notes: Optional[str] = None
    positions: List[ParsedPosition]
    image_path: str = ""
    ocr_confidence: float = 0.0
    user_id: uuid.UUID


# ── AI Analysis ────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class PortfolioAnalysisRequest(BaseModel):
    user_id: uuid.UUID
    question: Optional[str] = None
    history: List[ChatMessage] = []


class PortfolioAnalysisResponse(BaseModel):
    snapshot_id: uuid.UUID
    as_of: date
    model: str
    reply: str


# ── History ────────────────────────────────────────────────────────────────

class ValuePoint(BaseModel):
    date: date
    total_value: float


class ReturnPoint(BaseModel):
    date: date
    return_pct: float
    return_amount: Optional[float] = None   # dollar return (sum of unrealized_pnl)


# ── Users ──────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    name: Optional[str] = None


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    name: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
