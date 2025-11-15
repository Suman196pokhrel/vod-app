"""add_video_metadata_fields

Revision ID: c8a105f8d90a
Revises: 34419c05503e
Create Date: 2025-11-16 03:42:52.928383

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8a105f8d90a'
down_revision: Union[str, Sequence[str], None] = '34419c05503e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add new columns as NULLABLE first (safe for existing data)
    op.add_column('videos', sa.Column('category', sa.String(length=50), nullable=True))
    op.add_column('videos', sa.Column('age_rating', sa.String(length=10), nullable=True))
    op.add_column('videos', sa.Column('release_date', sa.Date(), nullable=True))
    op.add_column('videos', sa.Column('director', sa.String(length=200), nullable=True))
    op.add_column('videos', sa.Column('cast', sa.String(length=500), nullable=True))
    op.add_column('videos', sa.Column('tags', sa.JSON(), nullable=True))
    
    # Set default values for existing records (important!)
    op.execute("UPDATE videos SET category = 'uncategorized' WHERE category IS NULL")
    op.execute("UPDATE videos SET tags = '[]'::json WHERE tags IS NULL")
    
    # NOW make category NOT NULL (safe because we set defaults above)
    op.alter_column('videos', 'category', nullable=False)
    
    # Make thumbnail_url nullable (good - thumbnails are optional)
    op.alter_column('videos', 'thumbnail_url',
               existing_type=sa.VARCHAR(length=500),
               nullable=True)
    
    # Create index on category for faster queries
    op.create_index(op.f('ix_videos_category'), 'videos', ['category'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_videos_category'), table_name='videos')
    op.alter_column('videos', 'thumbnail_url',
               existing_type=sa.VARCHAR(length=500),
               nullable=False)
    op.drop_column('videos', 'tags')
    op.drop_column('videos', 'cast')
    op.drop_column('videos', 'director')
    op.drop_column('videos', 'release_date')
    op.drop_column('videos', 'age_rating')
    op.drop_column('videos', 'category')