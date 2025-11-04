# VOD App Backend - Authentication System

## 🏗️ Project Structure

```
vod_app/
├── app/
│   ├── core/
│   │   ├── config.py          # Settings and environment variables
│   │   ├── database.py        # Database connection and session
│   │   ├── security.py        # Password hashing and JWT tokens
│   │   └── dependencies.py    # Authentication dependencies
│   ├── models/
│   │   ├── __init__.py
│   │   └── user.py            # SQLAlchemy User model
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── user.py            # Pydantic schemas for validation
│   └── services/
│       ├── __init__.py
│       └── user_service.py    # Business logic for user operations
├── apis/
│   └── routes/
│       ├── health.py          # Health check endpoint
│       └── auth.py            # Authentication endpoints
├── main.py                    # FastAPI application entry point
├── requirements.txt           # Python dependencies
└── .env                       # Environment variables (create from .env.example)
```

## 📚 Layer Architecture Explained

### 1. **Models Layer** (`app/models/`)
- SQLAlchemy ORM models
- Represents database tables
- Defines relationships between tables

### 2. **Schemas Layer** (`app/schemas/`)
- Pydantic models for data validation
- Defines request/response structure
- Separates API concerns from database concerns

### 3. **Services Layer** (`app/services/`)
- Business logic
- Reusable functions
- Interacts with database through models

### 4. **Routes Layer** (`apis/routes/`)
- HTTP endpoints
- Request/response handling
- Calls service layer for operations

### 5. **Core Layer** (`app/core/`)
- Configuration
- Database setup
- Security utilities
- Shared dependencies

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Set Up Database

Make sure PostgreSQL is running, then create a database:

```sql
CREATE DATABASE vod_db;
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and update with your values:

```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/vod_db
SECRET_KEY=your-generated-secret-key
```

Generate a secure secret key:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### 4. Run the Application

```bash
uvicorn main:app --reload
```

The API will be available at: http://localhost:8000

## 📖 API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔐 Authentication Endpoints

### 1. Sign Up (Register)

**POST** `/auth/signup`

```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "securepass123"
}
```

**Response** (201 Created):
```json
{
  "id": "uuid-here",
  "email": "user@example.com",
  "username": "johndoe",
  "is_active": true,
  "is_verified": false,
  "created_at": "2025-11-04T10:00:00Z"
}
```

### 2. Sign In (Login)

**POST** `/auth/signin`

```json
{
  "email_or_username": "johndoe",
  "password": "securepass123"
}
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "username": "johndoe",
    "is_active": true,
    "is_verified": false,
    "created_at": "2025-11-04T10:00:00Z"
  }
}
```

### 3. Get Profile (Protected)

**GET** `/auth/me`

**Headers**:
```
Authorization: Bearer <access_token>
```

**Response** (200 OK):
```json
{
  "id": "uuid-here",
  "email": "user@example.com",
  "username": "johndoe",
  "is_active": true,
  "is_verified": false,
  "created_at": "2025-11-04T10:00:00Z"
}
```

## 🧪 Testing with cURL

### Sign Up
```bash
curl -X POST "http://localhost:8000/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123"
  }'
```

### Sign In
```bash
curl -X POST "http://localhost:8000/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{
    "email_or_username": "testuser",
    "password": "password123"
  }'
```

### Get Profile
```bash
curl -X GET "http://localhost:8000/auth/me" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

## 🔌 Frontend Integration

### JavaScript/TypeScript Example

```javascript
// Sign Up
async function signup(email, username, password) {
  const response = await fetch('http://localhost:8000/auth/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, username, password })
  });
  return await response.json();
}

// Sign In
async function signin(emailOrUsername, password) {
  const response = await fetch('http://localhost:8000/auth/signin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email_or_username: emailOrUsername,
      password: password
    })
  });
  const data = await response.json();
  
  // Store token in localStorage
  localStorage.setItem('access_token', data.access_token);
  return data;
}

// Get Profile (Protected)
async function getProfile() {
  const token = localStorage.getItem('access_token');
  const response = await fetch('http://localhost:8000/auth/me', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
}

// Make Authenticated Requests
async function makeAuthenticatedRequest(url) {
  const token = localStorage.getItem('access_token');
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
}
```

## 🔒 Security Best Practices

1. **Never store plain passwords** - Always hashed with bcrypt
2. **Use HTTPS in production** - Especially for authentication endpoints
3. **Keep SECRET_KEY secret** - Use environment variables, never commit to git
4. **Rotate tokens** - Tokens expire after 30 minutes (configurable)
5. **Validate all input** - Pydantic handles this automatically
6. **Use CORS properly** - Configure allowed origins in production

## 📝 Next Steps

1. **Email Verification**: Add email verification flow
2. **Password Reset**: Implement forgot password feature
3. **Refresh Tokens**: Add refresh token rotation
4. **User Roles**: Add role-based access control (RBAC)
5. **Rate Limiting**: Prevent brute force attacks
6. **Logging**: Add comprehensive logging
7. **Testing**: Write unit and integration tests

## 🐛 Troubleshooting

### Database Connection Error
```
Check your DATABASE_URL in .env
Ensure PostgreSQL is running
Verify database exists
```

### Token Invalid/Expired
```
Token expires after 30 minutes
User must login again to get new token
Check system clock is correct
```

### Import Errors
```
Ensure all __init__.py files exist
Check Python path includes project root
Verify all dependencies installed
```

## 📚 How Authentication Works

1. **Sign Up**: 
   - User sends credentials
   - Password is hashed with bcrypt
   - User stored in database

2. **Sign In**:
   - User sends credentials
   - System finds user by email/username
   - Password verified against hash
   - JWT token generated and returned

3. **Protected Routes**:
   - Frontend includes token in Authorization header
   - Backend extracts and verifies token
   - User ID extracted from token
   - User fetched from database
   - Request proceeds with authenticated user

## 🤝 Need Help?

If you have questions about:
- How any part works
- Adding new features
- Best practices
- Frontend integration

Just ask! I'm here to help.
