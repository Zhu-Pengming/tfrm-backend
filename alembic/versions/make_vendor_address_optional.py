"""make vendor address optional

Revision ID: make_vendor_address_optional
Revises: add_vendor_sku_fields
Create Date: 2026-01-29

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'make_vendor_address_optional'
down_revision = 'add_vendor_sku_fields'
branch_labels = None
depends_on = None


def upgrade():
    # Make address column nullable in vendors table
    op.alter_column('vendors', 'address',
               existing_type=sa.Text(),
               nullable=True)


def downgrade():
    # Revert address column to not nullable
    op.alter_column('vendors', 'address',
               existing_type=sa.Text(),
               nullable=False)
