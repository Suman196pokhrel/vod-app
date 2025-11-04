# VOD App Backend - Architecture Flow

## 📊 Authentication Flow Diagram

```
┌─────────────┐
│  Frontend   │
│ (React/Vue) │
└──────┬──────┘
       │
       │ 1. POST /auth/signup
       │    { email, username, password }
       ▼
┌─────────────────────────────────────────┐
│         FastAPI Routes Layer            │
│         (apis/routes/auth.py)           │
│  - Validates request with Pydantic      │
│  - Calls service layer                  │
└──────┬──────────────────────────────────┘
       │
       │ 2. create_user(db, user_data)
       ▼
┌─────────────────────────────────────────┐
│       Services Layer                    │
│    (app/services/user_service.py)       │
│  - Hash password with bcrypt            │
│  - Create User object                   │
│  - Handle business logic                │
└──────┬──────────────────────────────────┘
       │
       │ 3. Save to database
       ▼
┌─────────────────────────────────────────┐
│       Models Layer                      │
│       (app/models/user.py)              │
│  - SQLAlchemy ORM                       │
│  - Maps Python objects to DB tables     │
└──────┬──────────────────────────────────┘
       │
       │ 4. SQL INSERT
       ▼
┌─────────────────────────────────────────┐
│        PostgreSQL Database              │
│  - Stores user data securely            │
│  - Enforces unique constraints          │
└─────────────────────────────────────────┘
```

## 🔐 Login Flow

```
┌─────────────┐
│  Frontend   │
└──────┬──────┘
       │
       │ POST /auth/signin
       │ { email_or_username, password }
       ▼
┌─────────────────────────────────────────┐
│         Routes Layer                    │
│  - Validates credentials                │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│       Services Layer                    │
│  1. Find user by email/username         │
│  2. Verify password (bcrypt)            │
│  3. Generate JWT token                  │
└──────┬──────────────────────────────────┘
       │
       │ Return: { access_token, user }
       ▼
┌─────────────┐
│  Frontend   │
│  Stores     │
│  token in   │
│  localStorage│
└─────────────┘
```

## 🛡️ Protected Route Flow

```
┌─────────────┐
│  Frontend   │
│  Includes:  │
│  Authorization: Bearer <token>
└──────┬──────┘
       │
       │ GET /auth/me
       ▼
┌─────────────────────────────────────────┐
│    FastAPI Dependency System            │
│    (app/core/dependencies.py)           │
│                                         │
│  1. Extract token from header           │
│  2. Decode JWT                          │
│  3. Get user_id from token              │
│  4. Fetch user from database            │
│  5. Inject user into route function     │
└──────┬──────────────────────────────────┘
       │
       │ User object available
       ▼
┌─────────────────────────────────────────┐
│         Route Handler                   │
│  def get_profile(                       │
│      current_user = Depends(get_current_user)
│  ):                                     │
│      return current_user                │
└─────────────────────────────────────────┘
```

## 📁 Layer Responsibilities

### 1. Routes Layer (`apis/routes/`)
**Role**: HTTP Interface
- Accept requests
- Validate with Pydantic schemas
- Call services
- Return responses
- **NO business logic here!**

### 2. Services Layer (`app/services/`)
**Role**: Business Logic
- User creation
- Authentication
- Password verification
- Token generation
- Reusable functions
- **NO HTTP concerns here!**

### 3. Models Layer (`app/models/`)
**Role**: Database Representation
- SQLAlchemy models
- Table definitions
- Relationships
- **NO business logic here!**

### 4. Schemas Layer (`app/schemas/`)
**Role**: Data Validation
- Request validation
- Response serialization
- Type checking
- **Separate from database models!**

### 5. Core Layer (`app/core/`)
**Role**: Infrastructure
- Config (environment variables)
- Database connection
- Security utilities (hashing, JWT)
- Dependencies (authentication)

## 🔄 Why This Architecture?

### Separation of Concerns
```
Routes    → "What HTTP endpoints exist?"
Services  → "What business logic do we have?"
Models    → "What does our data look like?"
Schemas   → "What data is valid?"
```

### Benefits

1. **Testability**
   - Test services without HTTP
   - Mock database easily
   - Unit test individual layers

2. **Reusability**
   - Use same service from multiple routes
   - Use same service in background jobs
   - Share logic across features

3. **Maintainability**
   - Easy to find code
   - Clear responsibilities
   - Change one layer without affecting others

4. **Scalability**
   - Add new features easily
   - Extend existing features
   - Replace implementations without breaking API

## 🎯 Example: Adding a New Feature

Let's say you want to add "Change Password" feature:

```
1. Schema (app/schemas/user.py)
   ├─ class PasswordChange(BaseModel):
   │      old_password: str
   │      new_password: str

2. Service (app/services/user_service.py)
   ├─ def change_password(db, user_id, old_pw, new_pw):
   │      # Verify old password
   │      # Hash new password
   │      # Update database

3. Route (apis/routes/auth.py)
   ├─ @router.post("/change-password")
   │  def change_password(
   │      data: PasswordChange,
   │      current_user = Depends(get_current_user)
   │  ):
   │      return user_service.change_password(...)
```

See how each layer has its job? Clean and organized!

## 🚀 Data Flow Example

### Signup Request

```python
# 1. Frontend sends
{
  "email": "john@example.com",
  "username": "john",
  "password": "secret123"
}

# 2. Pydantic validates (UserCreate schema)
✓ Email format correct
✓ Username 3-50 chars
✓ Password min 8 chars

# 3. Service layer processes
plain_password = "secret123"
hashed = hash_password(plain_password)
# → "$2b$12$KIXn9..."

# 4. Model creates database entry
User(
  id="uuid-generated",
  email="john@example.com",
  username="john",
  hashed_password="$2b$12$KIXn9...",
  created_at=datetime.now()
)

# 5. Response sent back (UserResponse schema)
{
  "id": "uuid-generated",
  "email": "john@example.com",
  "username": "john",
  "is_active": true,
  "created_at": "2025-11-04T10:00:00Z"
}
# Notice: NO password in response!
```

## 💡 Key Concepts

### 1. Never Store Plain Passwords
```python
❌ password = "secret123"  # NEVER do this
✅ hashed_password = hash_password("secret123")
```

### 2. Separate Database from API
```python
# Database model (SQLAlchemy)
class User(Base):
    hashed_password = Column(String)

# API schema (Pydantic)  
class UserResponse(BaseModel):
    # No password field!
    email: str
    username: str
```

### 3. JWT Token Flow
```
Login → Generate Token → Send to Frontend
          ↓
    Frontend stores token
          ↓
    Includes in future requests
          ↓
    Backend verifies token
          ↓
    Extract user_id
          ↓
    Fetch user from DB
```

## 🎓 Understanding Dependencies

FastAPI's dependency injection is powerful:

```python
# Without dependency
@app.get("/profile")
def get_profile(token: str):
    # Manually decode token
    # Manually fetch user
    # Handle errors
    # ... lots of repeated code

# With dependency
@app.get("/profile")
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user  # That's it!
    # Dependency handles everything!
```

Dependencies run automatically before your route function:
1. Extract token
2. Verify token
3. Fetch user
4. Inject into function

This keeps your route code clean and focused!
