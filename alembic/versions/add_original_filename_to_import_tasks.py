"""add original_filename to import_tasks

Revision ID: add_original_filename
Revises: add_raw_extracted_field
Create Date: 2024-02-07 13:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_original_filename'
down_revision = 'add_raw_extracted_field'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('import_tasks', sa.Column('original_filename', sa.String(), nullable=True))


def downgrade():
    op.drop_column('import_tasks', 'original_filename')
