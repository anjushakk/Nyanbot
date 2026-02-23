"""Message management router."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app import models, schemas
from app.database import get_db
from app.routers.auth import get_current_user


router = APIRouter(prefix="/api/sessions/{session_id}/messages", tags=["messages"])


@router.post("", response_model=schemas.MessageResponse, status_code=status.HTTP_201_CREATED)
def send_message(
    session_id: str,
    message_data: schemas.MessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Send a message to a session and get AI response."""
    # Check if session exists
    session = db.query(models.Session).filter(models.Session.id == session_id).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Check if user is a member of the session
    is_member = db.query(models.SessionMember).filter(
        models.SessionMember.session_id == session_id,
        models.SessionMember.user_id == current_user.id
    ).first()
    
    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this session"
        )
    
    # Save user message
    user_message = models.Message(
        session_id=session_id,
        user_id=current_user.id,
        content=message_data.content,
        role="user"
    )
    
    db.add(user_message)
    db.commit()
    db.refresh(user_message)
    
    # Search for relevant context from documents using RAG
    context = ""
    try:
        from app.services.embeddings import EmbeddingService
        from app.services.vector_store import VectorStore
        
        # Load vector store for this session
        vector_store = VectorStore()
        vector_store_path = f"vector_stores/{session_id}"
        vector_store.load(vector_store_path)
        
        # Generate query embedding and search
        embedding_service = EmbeddingService()
        query_embedding = embedding_service.generate_query_embedding(message_data.content)
        search_results = vector_store.search(query_embedding, k=3)
        
        # Build context from top results
        if search_results:
            context = "\n\n".join([
                f"[From {meta.get('filename', 'document')}]: {chunk}"
                for chunk, meta, score in search_results
            ])
    except Exception as e:
        # No documents or vector store doesn't exist - that's okay
        print(f"No RAG context available: {e}")
        context = ""
    
    # Get conversation history (last 10 messages)
    history = db.query(models.Message).filter(
        models.Message.session_id == session_id
    ).order_by(models.Message.created_at.desc()).limit(10).all()
    
    conversation_history = [
        {"role": msg.role, "content": msg.content}
        for msg in reversed(history[:-1])  # Exclude the message we just added
    ]
    
    # Generate AI response using LLM
    from app.services.llm_service import LLMService
    llm_service = LLMService()
    
    if context:
        ai_response_text = llm_service.generate_response(
            query=message_data.content,
            context=context,
            conversation_history=conversation_history
        )
    else:
        # No documents uploaded yet
        ai_response_text = llm_service.generate_response(
            query=message_data.content,
            context="",
            conversation_history=conversation_history
        )
        
        # Add helpful message if no documents
        if "don't have" not in ai_response_text.lower():
            ai_response_text = "I don't have any documents to reference yet. Please upload some PDFs to get started!\n\n" + ai_response_text
    
    # Save AI response
    ai_message = models.Message(
        session_id=session_id,
        user_id=None,  # AI message has no user
        content=ai_response_text,
        role="assistant"
    )
    
    db.add(ai_message)
    db.commit()
    db.refresh(ai_message)
    
    # Return the user message (frontend will poll and get AI response)
    return user_message


@router.get("", response_model=List[schemas.MessageResponse])
def get_messages(
    session_id: str,
    limit: int = Query(default=100, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get messages from a session with pagination."""
    # Check if session exists
    session = db.query(models.Session).filter(models.Session.id == session_id).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Check if user is a member of the session
    is_member = db.query(models.SessionMember).filter(
        models.SessionMember.session_id == session_id,
        models.SessionMember.user_id == current_user.id
    ).first()
    
    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this session"
        )
    
    # Get messages ordered by creation time (oldest first)
    messages = db.query(models.Message).filter(
        models.Message.session_id == session_id
    ).order_by(models.Message.created_at.asc()).offset(offset).limit(limit).all()
    
    return messages
