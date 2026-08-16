"""Add FK indexes for performance

Revision ID: a1b2c3d4e5f6
Revises: 6f34ec737a6d
Create Date: 2026-08-16 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '6f34ec737a6d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        'ix_family_members_user_id',
        'family_members',
        ['user_id'],
        unique=False,
    )
    op.create_index(
        'ix_consultations_family_member_id',
        'consultations',
        ['family_member_id'],
        unique=False,
    )
    op.create_index(
        'ix_medical_records_family_member_id',
        'medical_records',
        ['family_member_id'],
        unique=False,
    )
    op.create_index(
        'ix_medications_family_member_id',
        'medications',
        ['family_member_id'],
        unique=False,
    )
    op.create_index(
        'ix_chat_messages_consultation_id',
        'chat_messages',
        ['consultation_id'],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index('ix_chat_messages_consultation_id', table_name='chat_messages')
    op.drop_index('ix_medications_family_member_id', table_name='medications')
    op.drop_index('ix_medical_records_family_member_id', table_name='medical_records')
    op.drop_index('ix_consultations_family_member_id', table_name='consultations')
    op.drop_index('ix_family_members_user_id', table_name='family_members')
