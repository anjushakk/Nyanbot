"""Session management router."""
import random
import string
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app import models, schemas
from app.database import get_db
from app.routers.auth import get_current_user


router = APIRouter(prefix="/api/sessions", tags=["sessions"])


def generate_join_code(db: Session) -> str:
    """Generate a unique 6-character join code."""
    while True:
        # Generate random 6-character alphanumeric code
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        
        # Check if code already exists
        existing = db.query(models.Session).filter(models.Session.join_code == code).first()
        if not existing:
            return code


@router.post("", response_model=schemas.SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    session_data: schemas.SessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create a new session."""
    # Generate unique join code
    join_code = generate_join_code(db)
    
    # Create session
    db_session = models.Session(
        name=session_data.name,
        join_code=join_code,
        owner_id=current_user.id
    )
    
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    
    # Add creator as a member with 'owner' role
    member = models.SessionMember(
        user_id=current_user.id,
        session_id=db_session.id,
        role="owner"
    )
    
    db.add(member)
    db.commit()
    db.refresh(db_session)
    
    return db_session


@router.get("", response_model=List[schemas.SessionListItem])
def list_sessions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """List all sessions the current user is a member of."""
    # Get all session memberships for the user
    memberships = db.query(models.SessionMember).filter(
        models.SessionMember.user_id == current_user.id
    ).all()
    
    session_list = []
    for membership in memberships:
        session = membership.session
        
        # Count members
        member_count = db.query(models.SessionMember).filter(
            models.SessionMember.session_id == session.id
        ).count()
        
        session_list.append(schemas.SessionListItem(
            id=session.id,
            name=session.name,
            join_code=session.join_code,
            owner_id=session.owner_id,
            created_at=session.created_at,
            member_count=member_count,
            role=membership.role  # Add the role from membership
        ))
    
    return session_list



@router.get("/{session_id}", response_model=schemas.SessionResponse)
def get_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get session details with members."""
    # Get session
    session = db.query(models.Session).filter(models.Session.id == session_id).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Check if user is a member
    is_member = db.query(models.SessionMember).filter(
        models.SessionMember.session_id == session_id,
        models.SessionMember.user_id == current_user.id
    ).first()
    
    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this session"
        )
    
    return session


@router.post("/join", response_model=schemas.SessionResponse)
def join_session(
    join_data: schemas.SessionJoin,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Join a session using a join code."""
    # Find session by join code
    session = db.query(models.Session).filter(
        models.Session.join_code == join_data.join_code
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid join code"
        )
    
    # Check if already a member
    existing_member = db.query(models.SessionMember).filter(
        models.SessionMember.session_id == session.id,
        models.SessionMember.user_id == current_user.id
    ).first()
    
    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already a member of this session"
        )
    
    # Add user as member
    member = models.SessionMember(
        user_id=current_user.id,
        session_id=session.id,
        role="member"
    )
    
    db.add(member)
    db.commit()
    db.refresh(session)
    
    return session


@router.delete("/{session_id}/leave", status_code=status.HTTP_200_OK)
def leave_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Leave a session (non-owners only)."""
    # Get session
    session = db.query(models.Session).filter(models.Session.id == session_id).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Check if user is the owner
    if session.owner_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session owner cannot leave. Delete the session instead."
        )
    
    # Find membership
    membership = db.query(models.SessionMember).filter(
        models.SessionMember.session_id == session_id,
        models.SessionMember.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not a member of this session"
        )
    
    # Remove membership
    db.delete(membership)
    db.commit()
    
    return {"message": "Successfully left the session"}


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Delete a session (owner only)."""
    # Get session
    session = db.query(models.Session).filter(models.Session.id == session_id).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Check if user is the owner
    if session.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the session owner can delete the session"
        )
    
    # Delete all members first (cascade should handle this, but being explicit)
    db.query(models.SessionMember).filter(
        models.SessionMember.session_id == session_id
    ).delete()
    
    # Delete session
    db.delete(session)
    db.commit()
    
    return None
