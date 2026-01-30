"""add products layer and secure share token

Revision ID: add_products_and_share_token
Revises: add_price_mode_fields
Create Date: 2026-01-26
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = 'add_products_and_share_token'
down_revision = 'add_price_mode_fields'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    insp = inspect(bind)

    if not insp.has_table('products'):
        op.create_table(
            'products',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('agency_id', sa.String(), nullable=False),
            sa.Column('title', sa.String(), nullable=False),
            sa.Column('product_type', sa.String(), nullable=True),
            sa.Column('destination_country', sa.String(), nullable=True),
            sa.Column('destination_city', sa.String(), nullable=True),
            sa.Column('tags', sa.ARRAY(sa.String())),
            sa.Column('description', sa.Text()),
            sa.Column('highlights', sa.ARRAY(sa.String())),
            sa.Column('media', sa.JSON(), server_default=sa.text("'[]'::jsonb")),
            sa.Column('valid_from', sa.Date()),
            sa.Column('valid_to', sa.Date()),
            sa.Column('created_by', sa.String()),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now())
        )
    existing_product_indexes = {idx['name'] for idx in insp.get_indexes('products')} if insp.has_table('products') else set()
    if 'ix_products_agency_id' not in existing_product_indexes:
        op.create_index('ix_products_agency_id', 'products', ['agency_id'])
    if 'ix_products_destination_city' not in existing_product_indexes:
        op.create_index('ix_products_destination_city', 'products', ['destination_city'])
    if 'ix_products_destination_country' not in existing_product_indexes:
        op.create_index('ix_products_destination_country', 'products', ['destination_country'])

    sku_columns = {col['name'] for col in insp.get_columns('skus')}
    if 'product_id' not in sku_columns:
        op.add_column('skus', sa.Column('product_id', sa.String(), nullable=True))
    sku_indexes = {idx['name'] for idx in insp.get_indexes('skus')}
    if 'ix_skus_product_id' not in sku_indexes:
        op.create_index('ix_skus_product_id', 'skus', ['product_id'])

    quotation_columns = {col['name'] for col in insp.get_columns('quotations')}
    if 'share_token' not in quotation_columns:
        op.add_column('quotations', sa.Column('share_token', sa.String(), nullable=True))
    quotation_indexes = {idx['name'] for idx in insp.get_indexes('quotations')}
    if 'ix_quotations_share_token' not in quotation_indexes:
        op.create_index('ix_quotations_share_token', 'quotations', ['share_token'], unique=True)


def downgrade():
    op.drop_index('ix_quotations_share_token', table_name='quotations')
    op.drop_column('quotations', 'share_token')

    op.drop_index('ix_skus_product_id', table_name='skus')
    op.drop_column('skus', 'product_id')

    op.drop_index('ix_products_agency_id', table_name='products')
    op.drop_index('ix_products_destination_city', table_name='products')
    op.drop_index('ix_products_destination_country', table_name='products')
    op.drop_table('products')
