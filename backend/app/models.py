import uuid
from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import String, Numeric, Boolean, Text, Date, DateTime, Float, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name: Mapped[Optional[str]] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    snapshots: Mapped[List["PortfolioSnapshot"]] = relationship("PortfolioSnapshot", back_populates="user", cascade="all, delete-orphan")


class PortfolioSnapshot(Base):
    __tablename__ = "portfolio_snapshots"
    __table_args__ = (UniqueConstraint("user_id", "snapshot_date", name="uq_user_date"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_value: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="AUD")
    broker: Mapped[Optional[str]] = mapped_column(String(100))
    image_path: Mapped[Optional[str]] = mapped_column(String(500))
    ocr_confidence: Mapped[Optional[float]] = mapped_column(Float)
    is_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="snapshots")
    positions: Mapped[List["Position"]] = relationship("Position", back_populates="snapshot", cascade="all, delete-orphan")


class Position(Base):
    __tablename__ = "positions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    snapshot_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("portfolio_snapshots.id", ondelete="CASCADE"), nullable=False)
    ticker: Mapped[str] = mapped_column(String(20), nullable=False)
    shares: Mapped[Optional[float]] = mapped_column(Numeric(15, 4))
    avg_cost: Mapped[Optional[float]] = mapped_column(Numeric(15, 4))
    current_price: Mapped[Optional[float]] = mapped_column(Numeric(15, 4))
    market_value: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    weight_pct: Mapped[Optional[float]] = mapped_column(Numeric(8, 4))
    unrealized_pnl: Mapped[Optional[float]] = mapped_column(Numeric(15, 2))
    unrealized_pct: Mapped[Optional[float]] = mapped_column(Numeric(8, 4))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    snapshot: Mapped["PortfolioSnapshot"] = relationship("PortfolioSnapshot", back_populates="positions")
