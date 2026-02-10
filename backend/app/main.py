"""Main FastAPI application."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, sessions

app = FastAPI(
    title="NYAN-BOT API",
    description="Multi-user RAG Chatbot API",
    version="1.0.0"
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(sessions.router)


@app.get("/")
def root():
    """Root endpoint."""
    return {"message": "Welcome to NYAN-BOT API", "docs": "/docs"}


@app.get("/health")
def health():
    """Health check endpoint."""
    return {"status": "healthy"}
