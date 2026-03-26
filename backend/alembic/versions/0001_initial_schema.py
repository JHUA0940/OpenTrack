"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-03-25
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Keep the bootstrap migration idempotent so an existing local pgdata
    # volume can be reused without forcing developers to wipe their database.
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    metadata = sa.MetaData()

    users = sa.Table(
        "users",
        metadata,
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("name", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.execute(sa.schema.CreateTable(users, if_not_exists=True))

    portfolio_snapshots = sa.Table(
        "portfolio_snapshots",
        metadata,
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("snapshot_date", sa.Date, nullable=False),
        sa.Column("total_value", sa.Numeric(15, 2), nullable=False),
        sa.Column("currency", sa.String(10), server_default="AUD"),
        sa.Column("broker", sa.String(100), nullable=True),
        sa.Column("image_path", sa.String(500), nullable=True),
        sa.Column("ocr_confidence", sa.Float, nullable=True),
        sa.Column("is_confirmed", sa.Boolean, server_default="false"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "snapshot_date", name="uq_user_date"),
    )
    op.execute(sa.schema.CreateTable(portfolio_snapshots, if_not_exists=True))

    positions = sa.Table(
        "positions",
        metadata,
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("snapshot_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("portfolio_snapshots.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ticker", sa.String(20), nullable=False),
        sa.Column("shares", sa.Numeric(15, 4), nullable=True),
        sa.Column("avg_cost", sa.Numeric(15, 4), nullable=True),
        sa.Column("current_price", sa.Numeric(15, 4), nullable=True),
        sa.Column("market_value", sa.Numeric(15, 2), nullable=False),
        sa.Column("weight_pct", sa.Numeric(8, 4), nullable=True),
        sa.Column("unrealized_pnl", sa.Numeric(15, 2), nullable=True),
        sa.Column("unrealized_pct", sa.Numeric(8, 4), nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.execute(sa.schema.CreateTable(positions, if_not_exists=True))

    op.execute(
        sa.schema.CreateIndex(
            sa.Index("ix_snapshots_user_date", portfolio_snapshots.c.user_id, portfolio_snapshots.c.snapshot_date),
            if_not_exists=True,
        )
    )
    op.execute(
        sa.schema.CreateIndex(
            sa.Index("ix_positions_snapshot", positions.c.snapshot_id),
            if_not_exists=True,
        )
    )


def downgrade():
    op.drop_table("positions")
    op.drop_table("portfolio_snapshots")
    op.drop_table("users")
