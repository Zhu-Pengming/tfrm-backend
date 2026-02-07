"""add raw_extracted field to skus

Revision ID: add_raw_extracted_field
Revises: add_missing_sku_fields
Create Date: 2026-02-06

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_raw_extracted_field'
down_revision = 'add_missing_sku_fields'
branch_labels = None
depends_on = None


def upgrade():
    # Add raw_extracted column to skus table
    try:
        op.add_column('skus', sa.Column('raw_extracted', postgresql.JSON(), nullable=True))
    except:
        pass


def downgrade():
    # Remove raw_extracted column from skus table
    try:
        op.drop_column('skus', 'raw_extracted')
    except:
        pass
