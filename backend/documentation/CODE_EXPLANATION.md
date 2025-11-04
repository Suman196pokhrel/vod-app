# 📖 Code Explanation Guide

## Understanding What Each File Does and WHY

This guide explains every part of the code in simple terms for someone new to FastAPI.

---

## 🎯 Core Concepts First

### What is FastAPI?
FastAPI is a web framework that lets you build APIs (Application Programming Interfaces). Think of it as a way to create a server that your frontend can talk to.

### What is an API?
Your frontend (React/Vue) needs to talk to your backend (database). The API is the middle layer that handles these conversations.

```
Frontend → API (FastAPI) → Database
         ↑
         This is what we're building!
```

---

## 📁 File-by-File Explanation

### 1. `main.py` - The Starting Point

```python
from fastapi import FastAPI
```
**What it does**: Imports the FastAPI class.
**Why**: We need this to create our web application.

```python
from app.core.database import engine, Base
from app.models import User
```
**What it does**: Imports database setup and User model.
**Why**: We need to create database tables before the app starts.

```python
Base.metadata.create_all(bind=engine)
```
**What it does**: Creates all database tables.
**Why**: When you first run the app, this creates the `users` table in PostgreSQL.
**How it works**: 
- `Base` knows about all your models (like User)
- `metadata.create_all()` generates SQL CREATE TABLE statements
- `bind=engine` tells it which database to use

```python
app = FastAPI(title="VOD App API", ...)
```
**What it does**: Creates your FastAPI application.
**Why**: This is the main application object. Everything else attaches to this.

```python
app.add_middleware(CORSMiddleware, allow_origins=["*"], ...)
```
**What it does**: Adds CORS (Cross-Origin Resource Sharing) support.
**Why**: Without this, browsers block requests from your frontend to backend.
**How it works**: 
- Your frontend runs on `localhost:3000`
- Your backend runs on `localhost:8000`
- Browsers see these as "different origins"
- CORS tells the browser: "It's okay, they can talk to each other"

```python
app.include_router(auth_router)
```
**What it does**: Adds all authentication routes to your app.
**Why**: Instead of putting all routes in one file, we organize them in separate files and include them here.

---

### 2. `app/core/config.py` - Configuration Management

```python
from pydantic_settings import BaseSettings
```
**What it does**: Imports Pydantic settings.
**Why**: Pydantic can read environment variables and validate them.

```python
class Settings(BaseSettings):
    database_url: str
    secret_key: str
    ...
```
**What it does**: Defines what settings your app needs.
**Why**: Instead of hardcoding database URL, we read it from `.env` file.
**How it works**:
```
.env file:          →    Pydantic reads    →    Settings object
DATABASE_URL=...         and validates           settings.database_url
```

```python
@lru_cache
def get_settings() -> Settings:
    return Settings()
```
**What it does**: Creates settings object only once.
**Why**: Reading files is slow. `@lru_cache` makes Python remember the result.
**How it works**:
- First call: Read `.env`, create Settings object, cache it
- Later calls: Return cached object (super fast!)

---

### 3. `app/core/database.py` - Database Connection

```python
from sqlalchemy import create_engine
```
**What it does**: Imports database engine creator.
**Why**: We need to connect to PostgreSQL.

```python
engine = create_engine(
    settings.database_url,
    future=True,
    echo=True,
    pool_pre_ping=True
)
```
**What it does**: Creates database connection engine.
**Why**: This is how we talk to PostgreSQL.
**Parameters explained**:
- `database_url`: Where is the database? (from .env)
- `future=True`: Use modern SQLAlchemy style
- `echo=True`: Print all SQL queries (helpful for learning!)
- `pool_pre_ping=True`: Check if connection is alive before using it

```python
SessionLocal = sessionmaker(bind=engine, ...)
```
**What it does**: Creates a session factory.
**Why**: A "session" is like a conversation with the database. We need a new session for each request.
**How it works**:
```
Request 1 → Session 1 → Talk to DB → Close
Request 2 → Session 2 → Talk to DB → Close
```

```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```
**What it does**: Gives a database session to each request.
**Why**: FastAPI dependency injection system.
**How it works**:
1. Create a session
2. Give it to the route (`yield`)
3. Wait for route to finish
4. Close the session (cleanup)

**Visual example**:
```python
@app.get("/users")
def get_users(db: Session = Depends(get_db)):
                            ↑
                            This calls get_db()
                            and gives us a session
```

---

### 4. `app/core/security.py` - Password & Token Security

#### Password Hashing

```python
pwd_context = CryptContext(schemes=["bcrypt"])
```
**What it does**: Sets up password hashing with bcrypt.
**Why**: NEVER store plain passwords! If database is hacked, passwords are still safe.

```python
def hash_password(password: str) -> str:
    return pwd_context.hash(password)
```
**What it does**: Turns "mypassword" into gibberish.
**Why**: If someone steals the database, they can't read passwords.
**Example**:
```
Input:  "mypassword123"
Output: "$2b$12$KIXn9.../aFN2IHjXOgI5F0KFGy"
```

```python
def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
```
**What it does**: Checks if password matches.
**Why**: During login, we verify password without knowing the original.
**How it works**:
1. User enters password: "mypassword123"
2. We hash it with the same salt
3. Compare with stored hash
4. If they match → correct password!

#### JWT Tokens

```python
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=30)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")
```

**What it does**: Creates a JWT token.
**Why**: After login, user gets a token instead of sending password every time.

**How JWT works**:
```
Login successful
    ↓
Backend creates token: { "user_id": "123", "exp": "2025-11-04..." }
    ↓
Encrypts with SECRET_KEY
    ↓
Sends to frontend: "eyJhbGciOiJIUz..."
    ↓
Frontend stores in localStorage
    ↓
Frontend includes in every request: Authorization: Bearer eyJhbGci...
    ↓
Backend decrypts and verifies
    ↓
Gets user_id from token
    ↓
Request proceeds with authenticated user
```

**Why JWT?**:
- User doesn't send password with every request
- Stateless (server doesn't need to remember sessions)
- Secure (encrypted with SECRET_KEY)
- Self-contained (includes user_id)

---

### 5. `app/models/user.py` - Database Table Definition

```python
from sqlalchemy.orm import declarative_base
Base = declarative_base()
```
**What it does**: Creates base class for all models.
**Why**: SQLAlchemy needs this to track all tables.

```python
class User(Base):
    __tablename__ = "users"
```
**What it does**: Defines User class that maps to `users` table.
**Why**: Object-Relational Mapping (ORM) - work with Python objects instead of SQL.

```python
id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
```
**What it does**: Creates `id` column.
**Why**: Every user needs a unique identifier.
**Parameters**:
- `String`: Column type
- `primary_key=True`: This is the main unique identifier
- `default=lambda: str(uuid.uuid4())`: Auto-generate UUID

**Why UUID instead of auto-increment?**:
```
Auto-increment:  1, 2, 3, 4, 5 (predictable, security risk)
UUID: a7b2c3d4-... (unpredictable, more secure)
```

```python
email = Column(String, unique=True, index=True, nullable=False)
```
**Parameters explained**:
- `unique=True`: No two users can have same email
- `index=True`: Faster searches on email
- `nullable=False`: Email is required

```python
created_at = Column(DateTime, server_default=func.now())
```
**What it does**: Automatically sets creation timestamp.
**Why**: Track when user signed up.
**server_default=func.now()**: Database sets this, not Python.

---

### 6. `app/schemas/user.py` - Data Validation

```python
from pydantic import BaseModel, EmailStr
```
**What it does**: Imports Pydantic for validation.
**Why**: Validate data before it reaches your database.

```python
class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)
```

**What it does**: Defines what data is valid for signup.
**Why**: Prevent bad data from reaching database.

**How validation works**:
```python
# User sends:
{
  "email": "not-an-email",  # ❌ Invalid email format
  "username": "ab",         # ❌ Too short (min 3)
  "password": "123"         # ❌ Too short (min 8)
}

# Pydantic automatically rejects this!
# Returns clear error message to user
```

```python
class UserResponse(UserBase):
    id: str
    is_active: bool
    # Notice: NO password field!
    
    model_config = ConfigDict(from_attributes=True)
```

**What it does**: Defines what we send back to user.
**Why**: Never send password (even hashed) to frontend!
**from_attributes=True**: Can create from SQLAlchemy model

**Example**:
```python
# Database has:
User(
    id="123",
    email="john@example.com",
    hashed_password="$2b$12$..."  # Secret!
)

# We send only:
{
    "id": "123",
    "email": "john@example.com"
    # No password!
}
```

---

### 7. `app/services/user_service.py` - Business Logic

This is where the magic happens!

```python
def create_user(db: Session, user_data: UserCreate) -> User:
```
**What it does**: Creates a new user.
**Why**: Separates business logic from routes.

**Step by step**:
```python
# 1. Hash password
hashed_password = hash_password(user_data.password)
# "mypass123" → "$2b$12$..."

# 2. Create User object
db_user = User(
    email=user_data.email,
    username=user_data.username,
    hashed_password=hashed_password
)

# 3. Add to database
db.add(db_user)      # Stage the change
db.commit()          # Save to database
db.refresh(db_user)  # Get generated fields (id, created_at)

# 4. Return user
return db_user
```

**Why try/except?**:
```python
try:
    db.commit()
except IntegrityError:  # Email/username already exists
    db.rollback()       # Undo changes
    raise HTTPException(...)  # Tell user
```

```python
def authenticate_user(db: Session, login_data: UserLogin) -> TokenResponse:
```
**What it does**: Logs user in.
**Why**: Verify credentials and issue token.

**Step by step**:
```python
# 1. Find user
user = db.query(User).filter(
    (User.email == login_data.email_or_username) | 
    (User.username == login_data.email_or_username)
).first()
# ↑ Find by email OR username

# 2. Check user exists
if not user:
    raise HTTPException(status_code=401, detail="Invalid credentials")

# 3. Verify password
if not verify_password(login_data.password, user.hashed_password):
    raise HTTPException(status_code=401, detail="Invalid credentials")

# 4. Create token
access_token = create_access_token(data={"user_id": user.id})

# 5. Return token + user data
return TokenResponse(access_token=access_token, user=user)
```

---

### 8. `app/core/dependencies.py` - Protected Routes

```python
security = HTTPBearer()
```
**What it does**: Sets up bearer token authentication.
**Why**: Extracts token from `Authorization: Bearer <token>` header.

```python
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
```

**What it does**: Gets authenticated user from token.
**Why**: Protects routes - only logged-in users can access.

**How it works**:
```python
# 1. Extract token from header
token = credentials.credentials
# Authorization: Bearer abc123 → "abc123"

# 2. Decode token
payload = decode_access_token(token)
# "abc123" → {"user_id": "123", "exp": "..."}

# 3. Get user_id
user_id = payload.get("user_id")

# 4. Fetch user from database
user = db.query(User).filter(User.id == user_id).first()

# 5. Return user to route
return user
```

**Usage in routes**:
```python
@router.get("/profile")
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user
    # ↑ current_user is already authenticated!
    # We don't need to check tokens manually!
```

---

### 9. `apis/routes/auth.py` - API Endpoints

```python
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])
```
**What it does**: Creates router for auth endpoints.
**Why**: All auth routes start with `/auth/`.

```python
@auth_router.post("/signup", response_model=UserResponse, status_code=201)
def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    user = create_user(db, user_data)
    return user
```

**What happens step-by-step**:
```
1. POST request to /auth/signup
   Body: { "email": "...", "username": "...", "password": "..." }
   ↓
2. FastAPI validates with UserCreate schema
   ✓ Email format correct?
   ✓ Username length okay?
   ✓ Password strong enough?
   ↓
3. get_db() dependency provides database session
   ↓
4. Call create_user() service
   - Hash password
   - Save to database
   ↓
5. Return user (Pydantic converts to UserResponse)
   - Removes password
   - Returns clean JSON
```

```python
@auth_router.post("/signin", response_model=TokenResponse)
def signin(login_data: UserLogin, db: Session = Depends(get_db)):
    return authenticate_user(db, login_data)
```

**What happens**:
```
1. POST to /auth/signin
   Body: { "email_or_username": "john", "password": "..." }
   ↓
2. Validate with UserLogin schema
   ↓
3. Call authenticate_user()
   - Find user
   - Verify password
   - Generate JWT token
   ↓
4. Return { "access_token": "...", "user": {...} }
```

```python
@auth_router.get("/me", response_model=UserResponse)
def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user
```

**What happens**:
```
1. GET to /auth/me
   Headers: Authorization: Bearer <token>
   ↓
2. get_current_user() dependency runs:
   - Extract token
   - Verify token
   - Fetch user from database
   ↓
3. If token invalid → 401 Unauthorized
   If token valid → Return user data
```

---

## 🔄 Complete Request Flow Example

Let's trace a complete signup request:

```
1. Frontend sends:
   POST http://localhost:8000/auth/signup
   {
     "email": "john@example.com",
     "username": "john",
     "password": "secret123"
   }
   ↓
2. FastAPI receives request
   ↓
3. Routes to auth_router.signup()
   ↓
4. Pydantic validates (UserCreate schema):
   ✓ Email format valid
   ✓ Username 3-50 chars
   ✓ Password min 8 chars
   ↓
5. Depends(get_db) creates database session
   ↓
6. Calls create_user(db, user_data):
   a. hash_password("secret123")
      → "$2b$12$..."
   b. Create User object
   c. db.add(user)
   d. db.commit()
   e. db.refresh(user)
   ↓
7. Return user to route
   ↓
8. Pydantic converts to UserResponse:
   - Includes: id, email, username, is_active, created_at
   - Excludes: hashed_password
   ↓
9. FastAPI sends JSON response:
   {
     "id": "a7b2c3d4-...",
     "email": "john@example.com",
     "username": "john",
     "is_active": true,
     "is_verified": false,
     "created_at": "2025-11-04T10:00:00Z"
   }
   ↓
10. Frontend receives and displays
```

---

## 🎓 Key Concepts Summary

### 1. Dependency Injection
```python
def my_route(db: Session = Depends(get_db)):
               ↑
               FastAPI calls get_db() and injects result
```

### 2. Pydantic Validation
```python
class UserCreate(BaseModel):
    email: EmailStr  # Validates email format
    password: str = Field(min_length=8)  # Validates length
```

### 3. SQLAlchemy ORM
```python
# Instead of:
"SELECT * FROM users WHERE email = ?"

# We write:
db.query(User).filter(User.email == email).first()
```

### 4. JWT Authentication
```
Login → Get Token → Store Token → Include in Requests → Verify Token
```

### 5. Layered Architecture
```
Routes → Services → Models → Database
         ↑
         Business logic lives here
```

---

## 💡 Common Questions

**Q: Why separate schemas from models?**
A: Models are for database, schemas are for API. They have different concerns.

**Q: Why hash passwords?**
A: If database is hacked, passwords are still safe.

**Q: What's the difference between hashing and encryption?**
A: 
- Encryption: Can be reversed (encode/decode)
- Hashing: Cannot be reversed (one-way)

**Q: Why use dependencies?**
A: Clean code, reusability, automatic cleanup.

**Q: When does database session close?**
A: Automatically after request finishes (in `finally` block).

**Q: Can I use the same code structure for other features?**
A: Yes! This is a scalable pattern. Just add new models/services/routes.

---

## 🚀 Next Steps

Now that you understand how it works, you can:
1. Add new fields to User model
2. Create new endpoints
3. Add more features (password reset, email verification)
4. Connect to your frontend

Remember: This architecture is professional, scalable, and follows best practices!
