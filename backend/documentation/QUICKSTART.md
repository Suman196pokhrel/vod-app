# 🚀 Quick Start Guide

## Get Your VOD Backend Running in 5 Minutes!

### Step 1: Download All Files
All your backend files are ready in the outputs folder.

### Step 2: Set Up Your Environment

```bash
# Navigate to your project directory
cd vod_app

# Install dependencies
pip install -r requirements.txt
```

### Step 3: Configure Database

Create a `.env` file (copy from `.env.example`):

```bash
# Copy the example
cp .env.example .env

# Edit with your details
nano .env  # or use your favorite editor
```

Your `.env` should look like:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/vod_db
SECRET_KEY=generate-a-random-key-here
```

Generate a secure secret key:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### Step 4: Create Database

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE vod_db;

# Exit
\q
```

### Step 5: Run the Server

```bash
uvicorn main:app --reload
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### Step 6: Test It!

Open your browser and go to:
- **API Docs**: http://localhost:8000/docs
- **Test Root**: http://localhost:8000/

Or run the test script:
```bash
python test_auth.py
```

### Step 7: Try It Out!

#### Using Swagger UI (http://localhost:8000/docs):

1. Click on **POST /auth/signup**
2. Click **"Try it out"**
3. Enter:
   ```json
   {
     "email": "test@example.com",
     "username": "testuser",
     "password": "password123"
   }
   ```
4. Click **Execute**

#### Using cURL:

```bash
# Sign up
curl -X POST "http://localhost:8000/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123"
  }'

# Sign in
curl -X POST "http://localhost:8000/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{
    "email_or_username": "testuser",
    "password": "password123"
  }'
```

### Step 8: Integrate with Frontend

Use the access token from login in your frontend:

```javascript
// Store token after login
localStorage.setItem('token', response.access_token);

// Use token in requests
fetch('http://localhost:8000/auth/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
```

## 📂 Project Structure

```
vod_app/
├── app/
│   ├── core/           # Configuration & security
│   ├── models/         # Database models
│   ├── schemas/        # Request/response validation
│   └── services/       # Business logic
├── apis/
│   └── routes/         # API endpoints
├── main.py            # Application entry point
├── requirements.txt   # Dependencies
└── .env              # Your configuration (create this!)
```

## 🎯 What You Got

✅ Complete authentication system
✅ Secure password hashing (bcrypt)
✅ JWT token-based authentication
✅ User signup endpoint
✅ User signin endpoint
✅ Protected routes example
✅ Professional layered architecture
✅ Comprehensive documentation
✅ Test script included

## 🔥 Next Features to Add

- Email verification
- Password reset
- Refresh tokens
- User roles/permissions
- Profile updates
- Video upload/management

## 📚 Documentation Files

- **README.md** - Full documentation
- **ARCHITECTURE.md** - Architecture explanation with diagrams
- **test_auth.py** - Automated testing script

## 🆘 Troubleshooting

**Can't connect to database?**
- Check PostgreSQL is running: `sudo systemctl status postgresql`
- Verify DATABASE_URL in .env
- Make sure database exists

**Import errors?**
- Install dependencies: `pip install -r requirements.txt`
- Check Python version: `python --version` (need 3.8+)

**Token issues?**
- Tokens expire after 30 minutes
- Check SECRET_KEY is set in .env
- Make sure clock is correct

## 💬 Need Help?

Just ask! I'm here to help you understand:
- How any part works
- How to add new features
- How to integrate with your frontend
- Best practices
- Debugging issues

Good luck with your VOD app! 🎬🚀
