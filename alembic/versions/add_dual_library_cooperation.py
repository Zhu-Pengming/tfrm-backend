"""add dual library and cooperation system

Revision ID: dual_library_v1
Revises: 
Create Date: 2026-02-06

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'dual_library_v1'
down_revision = None  # Update this to your latest migration
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns to SKU table
    op.add_column('skus', sa.Column('category', sa.String(), nullable=True))
    op.add_column('skus', sa.Column('is_public', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('skus', sa.Column('public_status', sa.String(), server_default='none', nullable=False))
    op.add_column('skus', sa.Column('source_org_id', sa.String(), nullable=True))
    op.add_column('skus', sa.Column('tags_interest', postgresql.ARRAY(sa.String()), nullable=True))
    op.add_column('skus', sa.Column('tags_service', postgresql.JSON(), nullable=True))
    op.add_column('skus', sa.Column('attributes', postgresql.JSON(), nullable=True))
    op.add_column('skus', sa.Column('base_cost_price', sa.Numeric(10, 2), nullable=True))
    op.add_column('skus', sa.Column('base_sale_price', sa.Numeric(10, 2), nullable=True))
    
    # Create indexes for new SKU columns
    op.create_index('ix_skus_category', 'skus', ['category'])
    op.create_index('ix_skus_is_public', 'skus', ['is_public'])
    op.create_index('ix_skus_public_status', 'skus', ['public_status'])
    op.create_index('ix_skus_source_org_id', 'skus', ['source_org_id'])
    op.create_index('ix_skus_tags_interest', 'skus', ['tags_interest'], postgresql_using='gin')
    
    # Populate category field from sku_type
    op.execute("""
        UPDATE skus SET category = CASE 
            WHEN sku_type::text = 'hotel' THEN 'hotel'
            WHEN sku_type::text = 'car' THEN 'transport'
            WHEN sku_type::text = 'itinerary' THEN 'route'
            WHEN sku_type::text = 'guide' THEN 'guide'
            WHEN sku_type::text = 'restaurant' THEN 'dining'
            WHEN sku_type::text = 'ticket' THEN 'ticket'
            WHEN sku_type::text = 'activity' THEN 'activity'
            ELSE sku_type::text
        END
        WHERE category IS NULL
    """)
    
    # Make category non-nullable after populating
    op.alter_column('skus', 'category', nullable=False)
    
    # Copy attrs to attributes for existing records
    op.execute("UPDATE skus SET attributes = attrs WHERE attributes IS NULL")
    
    # Create cooperation_relations table
    op.create_table(
        'cooperation_relations',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('from_agency_id', sa.String(), nullable=False),
        sa.Column('to_agency_id', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('request_message', sa.Text(), nullable=True),
        sa.Column('response_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('expired_at', sa.DateTime(), nullable=True),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('terminated_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=True),
        sa.Column('reviewed_by', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_cooperation_relations_from_agency_id', 'cooperation_relations', ['from_agency_id'])
    op.create_index('ix_cooperation_relations_to_agency_id', 'cooperation_relations', ['to_agency_id'])
    op.create_index('ix_cooperation_relations_status', 'cooperation_relations', ['status'])
    op.create_index('ix_cooperation_relations_created_at', 'cooperation_relations', ['created_at'])
    
    # Create cooperation_sku_prices table
    op.create_table(
        'cooperation_sku_prices',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('sku_id', sa.String(), nullable=False),
        sa.Column('provider_agency_id', sa.String(), nullable=False),
        sa.Column('consumer_agency_id', sa.String(), nullable=False),
        sa.Column('partner_cost_price', sa.Numeric(10, 2), nullable=True),
        sa.Column('partner_sale_price', sa.Numeric(10, 2), nullable=True),
        sa.Column('markup_factor', sa.Numeric(10, 4), server_default='1.0', nullable=False),
        sa.Column('markup_amount', sa.Numeric(10, 2), server_default='0.0', nullable=False),
        sa.Column('valid_from', sa.Date(), nullable=True),
        sa.Column('valid_to', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_cooperation_sku_prices_sku_id', 'cooperation_sku_prices', ['sku_id'])
    op.create_index('ix_cooperation_sku_prices_provider_agency_id', 'cooperation_sku_prices', ['provider_agency_id'])
    op.create_index('ix_cooperation_sku_prices_consumer_agency_id', 'cooperation_sku_prices', ['consumer_agency_id'])
    
    # Create notifications table
    op.create_table(
        'notifications',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('agency_id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('related_entity_type', sa.String(), nullable=True),
        sa.Column('related_entity_id', sa.String(), nullable=True),
        sa.Column('is_read', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('read_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_notifications_agency_id', 'notifications', ['agency_id'])
    op.create_index('ix_notifications_type', 'notifications', ['type'])
    op.create_index('ix_notifications_is_read', 'notifications', ['is_read'])
    op.create_index('ix_notifications_related_entity_id', 'notifications', ['related_entity_id'])
    op.create_index('ix_notifications_created_at', 'notifications', ['created_at'])


def downgrade():
    # Drop new tables
    op.drop_table('notifications')
    op.drop_table('cooperation_sku_prices')
    op.drop_table('cooperation_relations')
    
    # Drop new SKU columns
    op.drop_index('ix_skus_tags_interest', 'skus')
    op.drop_index('ix_skus_source_org_id', 'skus')
    op.drop_index('ix_skus_public_status', 'skus')
    op.drop_index('ix_skus_is_public', 'skus')
    op.drop_index('ix_skus_category', 'skus')
    
    op.drop_column('skus', 'base_sale_price')
    op.drop_column('skus', 'base_cost_price')
    op.drop_column('skus', 'attributes')
    op.drop_column('skus', 'tags_service')
    op.drop_column('skus', 'tags_interest')
    op.drop_column('skus', 'source_org_id')
    op.drop_column('skus', 'public_status')
    op.drop_column('skus', 'is_public')
    op.drop_column('skus', 'category')
