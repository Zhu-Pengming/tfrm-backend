"""merge_migration_heads

Revision ID: 8a123f456dbf
Revises: dual_library_v1, make_vendor_address_optional, add_raw_extracted_field
Create Date: 2026-02-06 18:17:02.248957

"""
from alembic import op
import sqlalchemy as sa


revision = '8a123f456dbf'
down_revision = ('dual_library_v1', 'make_vendor_address_optional', 'add_raw_extracted_field')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
