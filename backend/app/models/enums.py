# app/models/enums.py
"""
Enums for the application.

Why we use enums:
- Type safety: Can't accidentally assign invalid values
- Database constraint: PostgreSQL will enforce only these values
- Auto-completion: IDEs know the valid options
- Clear intent: Code is self-documenting
"""

import enum


class UserRole('str', enum.Enum):
    """
        User role types in the system.

        User: Regular user - can view and interact with videos
        ADMIN: Administrator - can upload and manage videos
    
        Note: We inherit from 'str' so that the enum values are strings in the DB
    """


    USER = "user"
    ADMIN = "admin"

    def __str__(self):
        return self.value