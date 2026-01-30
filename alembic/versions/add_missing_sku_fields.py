"""add missing sku fields

Revision ID: add_missing_sku_fields
Revises: 
Create Date: 2026-01-23

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_missing_sku_fields'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Add missing columns to skus table if they don't exist
    try:
        op.add_column('skus', sa.Column('description', sa.Text(), nullable=True))
    except:
        pass
    
    try:
        op.add_column('skus', sa.Column('highlights', postgresql.ARRAY(sa.String()), nullable=True))
    except:
        pass
    
    try:
        op.add_column('skus', sa.Column('inclusions', postgresql.ARRAY(sa.String()), nullable=True))
    except:
        pass
    
    try:
        op.add_column('skus', sa.Column('exclusions', postgresql.ARRAY(sa.String()), nullable=True))
    except:
        pass
    
    try:
        op.add_column('skus', sa.Column('cancellation_policy', sa.Text(), nullable=True))
    except:
        pass


def downgrade():
    # Remove columns from skus table
    try:
        op.drop_column('skus', 'cancellation_policy')
    except:
        pass
    
    try:
        op.drop_column('skus', 'exclusions')
    except:
        pass
    
    try:
        op.drop_column('skus', 'inclusions')
    except:
        pass
    
    try:
        op.drop_column('skus', 'highlights')
    except:
        pass
    
    try:
        op.drop_column('skus', 'description')
    except:
        pass
