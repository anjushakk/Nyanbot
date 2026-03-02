# Quick Setup Guide for New Computers

This is a condensed version of the setup process. For detailed information, see [README.md](README.md).

## Prerequisites Checklist

- [ ] Python 3.9 or higher installed
- [ ] Node.js 18 or higher installed
- [ ] PostgreSQL 14 or higher installed
- [ ] Git installed

---

## Step-by-Step Setup (15 minutes)

### 1. Database Setup (2 minutes)

```bash
# Create database
psql -U postgres -c "CREATE DATABASE nyanbot;"
```

### 2. Backend Setup (5 minutes)

```bash
# Navigate to backend
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/nyanbot
SECRET_KEY=$(openssl rand -hex 32)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
GROQ_API_KEY=your_groq_api_key
HF_API_KEY=your_huggingface_api_key
EOF

# Run migrations
alembic upgrade head

# Start backend (accessible on network)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**⚠️ Important**: Replace `YOUR_PASSWORD` with your actual PostgreSQL password in the `.env` file.

### 3. Frontend Setup (5 minutes)

Open a **new terminal**:

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Create .env file (use your network IP if testing on other devices)
echo "VITE_API_BASE_URL=http://localhost:8000" > .env

# Start frontend
npm run dev
```

### 4. Verify Installation (3 minutes)

1. **Backend**: Open http://localhost:8000/docs
   - You should see the Swagger API documentation

2. **Frontend**: Open http://localhost:8080
   - You should see the login/register page

3. **Test the flow**:
   - Register a new user
   - Create a session
   - Verify you can see the session in the sidebar

---

## Common Issues & Quick Fixes

### Issue: Database connection failed

```bash
# Check if PostgreSQL is running
pg_isready

# If not running, start it:
# macOS: brew services start postgresql
# Linux: sudo systemctl start postgresql
# Windows: Start PostgreSQL service from Services
```

### Issue: Port already in use

```bash
# Backend - use different port
uvicorn app.main:app --reload --port 8001

# Frontend - Vite will auto-select next available port
# Or kill the process using the port:
# macOS/Linux: lsof -ti:5173 | xargs kill -9
# Windows: netstat -ano | findstr :5173
```

### Issue: npm install fails

```bash
# Clear cache and retry
npm cache clean --force
npm install
```

### Issue: Alembic migration fails

```bash
# Reset and rerun migrations
alembic downgrade base
alembic upgrade head
```

---

## Environment Variables Quick Reference

### Backend `.env`
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/nyanbot
SECRET_KEY=<generate with: openssl rand -hex 32>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Frontend `.env`
```env
VITE_API_BASE_URL=http://localhost:8000
# NOTE: Use http://YOUR_NETWORK_IP:8000 for multi-device access
```

---

## Production Deployment Checklist

### Backend
- [ ] Set strong `SECRET_KEY`
- [ ] Use production database (not localhost)
- [ ] Enable HTTPS
- [ ] Set up reverse proxy (Nginx/Caddy)
- [ ] Use production WSGI server (Gunicorn)
- [ ] Set `DEBUG=False`
- [ ] Configure CORS for production domain

### Frontend
- [ ] Update `VITE_API_BASE_URL` to production backend URL
- [ ] Run `npm run build`
- [ ] Deploy `dist/` folder to hosting service
- [ ] Enable HTTPS
- [ ] Configure CDN (optional)

---

## Testing the Setup

### Quick Test Script

```bash
# Test backend
curl http://localhost:8000/api/auth/me

# Should return 401 (not authenticated) - this is correct!

# Test frontend
curl http://localhost:5173

# Should return HTML content
```

### Full Integration Test

1. Open http://localhost:5173
2. Register: `test@example.com` / `password123`
3. Create session: "Test Session"
4. Copy join code
5. Open incognito window
6. Register different user
7. Join session with code
8. Verify both users see the session

---

## Getting Help

- **API Documentation**: http://localhost:8000/docs
- **Check logs**: Backend terminal and browser console
- **Database issues**: Check PostgreSQL logs
- **Full documentation**: See [README.md](README.md)

---

## Next Steps After Setup

1. **Explore the API**: Visit http://localhost:8000/docs
2. **Test multi-user**: Open multiple browser windows
3. **Review the code**: Check `backend/app/` and `frontend/src/`
4. **Customize**: Update branding, colors, features
5. **Deploy**: Follow production deployment checklist

---

## One-Line Setup (Advanced Users)

If you have all prerequisites installed:

```bash
# Backend
cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt && echo "DATABASE_URL=postgresql://postgres:password@localhost:5432/nyanbot\nSECRET_KEY=$(openssl rand -hex 32)\nALGORITHM=HS256\nACCESS_TOKEN_EXPIRE_MINUTES=30" > .env && alembic upgrade head && uvicorn app.main:app --reload --port 8000 &

# Frontend (new terminal)
cd frontend && npm install && echo "VITE_API_BASE_URL=http://127.0.0.1:8000" > .env && npm run dev
```

**⚠️ Warning**: Replace `password` with your actual PostgreSQL password before running!
