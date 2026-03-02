# NYAN-BOT - Multi-User RAG Chatbot

A collaborative RAG (Retrieval-Augmented Generation) chatbot with session management, PDF document processing, and real-time multi-user support.

## Features

- 🔐 **JWT Authentication** - Secure user registration and login
- 👥 **Session Management** - Create and join collaborative chat sessions
- 📄 **RAG Pipeline** - Upload PDFs and get AI answers with document citations
- ⚡ **Real-time Collaboration** - Instant multi-user sync via WebSockets
- 🧠 **ChromaDB Integration** - High-speed vector search for large documents
- 🎨 **Modern UI** - Premium design with React, TypeScript, and shadcn/ui

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **PostgreSQL** - Relational database for users/sessions
- **ChromaDB** - Vector database for document embeddings
- **Groq & HuggingFace** - High-performance AI and embedding models
- **SQLAlchemy & Alembic** - Database management and migrations
- **WebSockets** - Low-latency real-time broadcasting

### Frontend
- **React** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool
- **TanStack Query** - Server state management
- **shadcn/ui** - Beautiful UI components
- **Tailwind CSS** - Utility-first CSS

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.9+** - [Download](https://www.python.org/downloads/)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **PostgreSQL 14+** - [Download](https://www.postgresql.org/download/)
- **Git** - [Download](https://git-scm.com/downloads)

---

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd nyan
```

### 2. Database Setup

#### Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE nyanbot;

# Exit psql
\q
```

> **Note**: If you're using a different PostgreSQL user, replace `postgres` with your username.

### 3. Backend Setup

#### Navigate to Backend Directory

```bash
cd backend
```

#### Create Virtual Environment

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

#### Install Dependencies

```bash
pip install -r requirements.txt
```

#### Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
# backend/.env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/nyanbot
SECRET_KEY=your-secret-key-here-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

**Important**: 
- Replace `your_password` with your PostgreSQL password
- Generate a secure `SECRET_KEY` (you can use: `openssl rand -hex 32`)

#### Run Database Migrations

```bash
# Initialize Alembic (if not already done)
alembic init alembic

# Run migrations
alembic upgrade head
```

#### Start Backend Server

```bash
uvicorn app.main:app --reload --port 8000
```

The backend API will be available at: **http://localhost:8000**

API documentation: **http://localhost:8000/docs**

### 4. Frontend Setup

Open a **new terminal** and navigate to the frontend directory:

```bash
cd frontend
```

#### Install Dependencies

```bash
npm install
```

#### Configure Environment Variables

Create a `.env` file in the `frontend` directory:

```bash
# frontend/.env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

#### Start Frontend Development Server

```bash
npm run dev
```

The frontend will be available at: **http://localhost:8080**

---

## Usage Guide

### 1. Register a New User

1. Navigate to http://localhost:8080
2. You'll be redirected to the authentication page
3. Click "Sign up" and create an account with:
   - Name
   - Email
   - Password (minimum 6 characters)

### 2. Create a Session

1. After login, click the **"New"** button in the sidebar
2. Enter a session name (e.g., "Project Discussion")
3. Click **"Create Session"**
4. A 6-character join code will be generated (e.g., `AAFUKF`)
5. Share this code with others to invite them

### 3. Join a Session

1. Click the **"Join"** button in the sidebar
2. Enter the 6-character join code
3. Click **"Join Session"**
4. The session will appear in your "Joined" section

### 4. Session Management

- **My Sessions** - Sessions you created (you can delete them)
- **Joined** - Sessions you joined (you can leave them)
- **Copy Join Code** - Hover over your session and click the copy icon
- **Delete/Leave** - Hover over a session and click the trash icon

---

## Project Structure

```
nyan/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application
│   │   ├── config.py            # Configuration settings
│   │   ├── database.py          # Database connection
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── utils.py             # Utility functions
│   │   └── routers/
│   │       ├── auth.py          # Authentication endpoints
│   │       └── sessions.py      # Session management endpoints
│   ├── alembic/                 # Database migrations
│   ├── requirements.txt         # Python dependencies
│   └── .env                     # Environment variables
│
└── frontend/
    ├── src/
    │   ├── components/          # React components
    │   ├── hooks/               # Custom React hooks
    │   ├── lib/                 # Utilities and API client
    │   ├── pages/               # Page components
    │   └── types.ts             # TypeScript types
    ├── package.json             # Node dependencies
    └── .env                     # Environment variables
```

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Sessions
- `POST /api/sessions` - Create session
- `GET /api/sessions` - List user's sessions
- `GET /api/sessions/{id}` - Get session details
- `POST /api/sessions/join` - Join session with code
- `DELETE /api/sessions/{id}/leave` - Leave session
- `DELETE /api/sessions/{id}` - Delete session (owner only)

---

## Troubleshooting

### Backend Issues

**Database Connection Error**
```
Solution: Check your DATABASE_URL in backend/.env
Verify PostgreSQL is running: pg_isready
```

**Port Already in Use**
```
Solution: Change port in uvicorn command
uvicorn app.main:app --reload --port 8001
```

**Migration Errors**
```
Solution: Reset database
alembic downgrade base
alembic upgrade head
```

### Frontend Issues

**Axios Installation Failed**
```
Solution: Check network connection or try:
npm install axios --registry=https://registry.npmjs.org/
```

**Port 5173 Already in Use**
```
Solution: Vite will automatically try the next available port
Or specify a different port in vite.config.ts
```

**API Connection Refused**
```
Solution: Ensure backend is running on port 8000
Check VITE_API_BASE_URL in frontend/.env
```

---

## Development

### Backend Development

```bash
# Run with auto-reload
uvicorn app.main:app --reload --port 8000

# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head
```

### Frontend Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Production Deployment

### Backend

1. Set production environment variables
2. Use a production WSGI server (e.g., Gunicorn)
3. Set up reverse proxy (e.g., Nginx)
4. Enable HTTPS
5. Use a managed PostgreSQL instance

```bash
# Example with Gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### Frontend

1. Build the production bundle
2. Deploy to static hosting (Vercel, Netlify, etc.)
3. Update API URL to production backend

```bash
npm run build
# Deploy dist/ folder
```

---

## Environment Variables Reference

### Backend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/nyanbot` |
| `SECRET_KEY` | JWT signing key | `your-secret-key-here` |
| `ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiration time | `30` |

### Frontend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `http://127.0.0.1:8000` |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License.

---

## Support

For issues and questions:
- Open an issue on GitHub
- Check the API documentation at http://localhost:8000/docs
- Review the troubleshooting section above

---

## Roadmap

- [x] Phase 1: Backend Foundation & Authentication
- [x] Phase 2: Session Management
- [x] Phase 3: Frontend Integration
- [x] Phase 4: PDF Upload & Processing
- [x] Phase 5: RAG Implementation with Vector Database
- [x] Phase 6: Real-time WebSocket Support
- [ ] Phase 7: Advanced Features (Search, Export, etc.)
