# backend/test_enum.py
from app.models.enums import UserRole

print(f"UserRole.USER = {UserRole.USER}")
print(f"UserRole.USER.value = {UserRole.USER.value}")
print(f"Type: {type(UserRole.USER)}")