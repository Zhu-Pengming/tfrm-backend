"""merge_uploaded_file_url

Revision ID: 01b881198ea2
Revises: 8a123f456dbf, add_uploaded_file_url
Create Date: 2026-02-07 10:39:22.536956

"""
from alembic import op
import sqlalchemy as sa


revision = '01b881198ea2'
down_revision = ('8a123f456dbf', 'add_uploaded_file_url')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
