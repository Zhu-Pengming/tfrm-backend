"""add uploaded_file_url to import_tasks

Revision ID: add_uploaded_file_url
Revises: add_raw_extracted_field
Create Date: 2026-02-07 10:34:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_uploaded_file_url'
down_revision = 'add_raw_extracted_field'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('import_tasks', sa.Column('uploaded_file_url', sa.String(), nullable=True))


def downgrade():
    op.drop_column('import_tasks', 'uploaded_file_url')
