"""add price mode and calendar fields to skus

Revision ID: add_price_mode_fields
Revises: add_missing_sku_fields
Create Date: 2026-01-26
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_price_mode_fields'
down_revision = 'add_missing_sku_fields'
branch_labels = None
depends_on = None


def upgrade():
    try:
        op.add_column('skus', sa.Column('price_mode', sa.String(), nullable=True))
    except Exception:
        pass
    try:
        op.add_column('skus', sa.Column('calendar_prices', sa.JSON(), nullable=True))
    except Exception:
        pass
    try:
        op.add_column('skus', sa.Column('price_rules', sa.JSON(), nullable=True))
    except Exception:
        pass


def downgrade():
    try:
        op.drop_column('skus', 'price_rules')
    except Exception:
        pass
    try:
        op.drop_column('skus', 'calendar_prices')
    except Exception:
        pass
    try:
        op.drop_column('skus', 'price_mode')
    except Exception:
        pass
