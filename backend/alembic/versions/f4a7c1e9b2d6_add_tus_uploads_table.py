"""add tus_uploads table

Revision ID: f4a7c1e9b2d6
Revises: bdc80bbbc0c9
Create Date: 2026-07-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f4a7c1e9b2d6'
down_revision: Union[str, Sequence[str], None] = 'bdc80bbbc0c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('tus_uploads',
    sa.Column('upload_id', sa.String(), nullable=False),
    sa.Column('user_id', sa.String(length=100), nullable=False),
    sa.Column('video_id', sa.String(), nullable=True),
    sa.Column('object_key', sa.String(length=500), nullable=True),
    sa.Column('declared_size', sa.BigInteger(), nullable=False),
    sa.Column('status', sa.String(length=30), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['video_id'], ['videos.id'], ),
    sa.PrimaryKeyConstraint('upload_id')
    )
    op.create_index(op.f('ix_tus_uploads_created_at'), 'tus_uploads', ['created_at'], unique=False)
    op.create_index(op.f('ix_tus_uploads_status'), 'tus_uploads', ['status'], unique=False)
    op.create_index(op.f('ix_tus_uploads_user_id'), 'tus_uploads', ['user_id'], unique=False)
    op.create_index(op.f('ix_tus_uploads_video_id'), 'tus_uploads', ['video_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_tus_uploads_video_id'), table_name='tus_uploads')
    op.drop_index(op.f('ix_tus_uploads_user_id'), table_name='tus_uploads')
    op.drop_index(op.f('ix_tus_uploads_status'), table_name='tus_uploads')
    op.drop_index(op.f('ix_tus_uploads_created_at'), table_name='tus_uploads')
    op.drop_table('tus_uploads')
