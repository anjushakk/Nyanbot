"""Authentication API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Optional

from app import models, schemas, auth
from app.database import get_db

router = APIRouter(prefix="/api/auth", tags=["authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_current_user_from_token(token: str, db: Session) -> models.User:
    """Get the current authenticated user from a raw JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    email = auth.decode_access_token(token)
    if email is None:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    
    return user


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    """Get the current authenticated user from JWT token (for HTTP)."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return get_current_user_from_token(token, db)


def get_current_user_flexible(
    token: Optional[str] = Depends(oauth2_scheme), 
    token_query: Optional[str] = Query(None, alias="token"),
    db: Session = Depends(get_db)
) -> models.User:
    """Get user from header OR query param 'token' (for direct links)."""
    actual_token = token or token_query
    if not actual_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return get_current_user_from_token(actual_token, db)


@router.post("/register", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    # Check if user already exists
    existing_user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = auth.get_password_hash(user_data.password)
    db_user = models.User(
        email=user_data.email,
        name=user_data.name,
        password_hash=hashed_password
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user


@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login and get access token."""
    # Find user
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    
    # Verify credentials
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token = auth.create_access_token(data={"sub": user.email})
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.User)
def get_me(current_user: models.User = Depends(get_current_user)):
    """Get current user information."""
    return current_user


@router.put("/me", response_model=schemas.User)
def update_me(
    user_update: schemas.UserUpdate, 
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user information."""
    if user_update.name is not None:
        current_user.name = user_update.name
    if user_update.avatar is not None:
        current_user.avatar = user_update.avatar
        
    db.commit()
    db.refresh(current_user)
    return current_user
