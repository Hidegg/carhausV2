"""add numeClient to clienti

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-03-26 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c3d4e5f6a7b8'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('clienti', schema=None) as batch_op:
        batch_op.add_column(sa.Column('numeClient', sa.String(length=100), nullable=True))


def downgrade():
    with op.batch_alter_table('clienti', schema=None) as batch_op:
        batch_op.drop_column('numeClient')
