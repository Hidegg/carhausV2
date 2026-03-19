"""expand password_hash to 512

Revision ID: a1b2c3d4e5f6
Revises: 91bab3cfb574
Create Date: 2026-03-19

"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = '91bab3cfb574'
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column('user', 'password_hash',
                    existing_type=sa.String(128),
                    type_=sa.String(512),
                    existing_nullable=False)


def downgrade():
    op.alter_column('user', 'password_hash',
                    existing_type=sa.String(512),
                    type_=sa.String(128),
                    existing_nullable=False)
