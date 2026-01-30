"""add vendor table and sku fields

Revision ID: add_vendor_sku_fields
Revises: add_products_and_share_token
Create Date: 2026-01-23

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = 'add_vendor_sku_fields'
down_revision = 'add_products_and_share_token'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    insp = inspect(bind)
    
    # Create vendors table only if it doesn't exist
    if not insp.has_table('vendors'):
        op.create_table(
            'vendors',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('agency_id', sa.String(), nullable=False),
            sa.Column('name', sa.String(), nullable=False),
            sa.Column('logo', sa.String(), nullable=True),
            sa.Column('contact', sa.String(), nullable=False),
            sa.Column('phone', sa.String(), nullable=False),
            sa.Column('email', sa.String(), nullable=False),
            sa.Column('category', postgresql.ARRAY(sa.String()), nullable=False),
            sa.Column('specialties', postgresql.ARRAY(sa.String()), nullable=False),
            sa.Column('status', sa.String(), nullable=True, server_default='Active'),
            sa.Column('rating', sa.Numeric(3, 1), nullable=True, server_default='5.0'),
            sa.Column('address', sa.Text(), nullable=False),
            sa.Column('note', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_vendors_agency_id', 'vendors', ['agency_id'])
        op.create_index('ix_vendors_status', 'vendors', ['status'])
        op.create_index('ix_vendors_created_at', 'vendors', ['created_at'])
    
    # Add new columns to skus table if they don't exist
    sku_columns = {col['name'] for col in insp.get_columns('skus')}
    if 'description' not in sku_columns:
        op.add_column('skus', sa.Column('description', sa.Text(), nullable=True))
    if 'highlights' not in sku_columns:
        op.add_column('skus', sa.Column('highlights', postgresql.ARRAY(sa.String()), nullable=True))
    if 'inclusions' not in sku_columns:
        op.add_column('skus', sa.Column('inclusions', postgresql.ARRAY(sa.String()), nullable=True))
    if 'exclusions' not in sku_columns:
        op.add_column('skus', sa.Column('exclusions', postgresql.ARRAY(sa.String()), nullable=True))
    if 'cancellation_policy' not in sku_columns:
        op.add_column('skus', sa.Column('cancellation_policy', sa.Text(), nullable=True))


def downgrade():
    # Remove columns from skus table
    op.drop_column('skus', 'cancellation_policy')
    op.drop_column('skus', 'exclusions')
    op.drop_column('skus', 'inclusions')
    op.drop_column('skus', 'highlights')
    op.drop_column('skus', 'description')
    
    # Drop vendors table
    op.drop_index('ix_vendors_created_at', 'vendors')
    op.drop_index('ix_vendors_status', 'vendors')
    op.drop_index('ix_vendors_agency_id', 'vendors')
    op.drop_table('vendors')
