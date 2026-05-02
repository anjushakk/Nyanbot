"""Message management router."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app import models, schemas
from app.database import get_db
from app.routers.auth import get_current_user
from app.services.websocket_manager import manager


router = APIRouter(prefix="/api/sessions/{session_id}/messages", tags=["messages"])


@router.post("", response_model=schemas.MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    session_id: str,
    message_data: schemas.MessageCreate,
    background_tasks: BackgroundTasks,
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
    
    # 1. Save user message using thread pool
    from fastapi.concurrency import run_in_threadpool
    from app.database import SessionLocal
    user_message = await run_in_threadpool(
        _save_user_message_sync,
        session_id, current_user.id, message_data.content, SessionLocal
    )
    
    # 2. Broadcast user message immediately (async)
    from app.services.websocket_manager import manager
    await manager.broadcast_to_session(session_id, {"type": "new_message", "message": user_message})
    
    # 3. Add background task for AI processing
    background_tasks.add_task(
        process_ai_response_task,
        session_id,
        message_data.content,
        user_message["id"],
        SessionLocal
    )
    
    return user_message


def _save_user_message_sync(session_id, user_id, content, db_factory):
    """Synchronous logic to save user message."""
    db = db_factory()
    try:
        from sqlalchemy.orm import joinedload
        from fastapi.encoders import jsonable_encoder
        
        user_message = models.Message(
            session_id=session_id,
            user_id=user_id,
            content=content,
            role="user"
        )
        db.add(user_message)
        db.commit()
        db.refresh(user_message)
        
        # Eager load user and serialize before session closes
        db.query(models.Message).options(joinedload(models.Message.user)).filter(models.Message.id == user_message.id).first()
        return jsonable_encoder(schemas.MessageResponse.model_validate(user_message))
    finally:
        db.close()


async def process_ai_response_task(session_id: str, query: str, user_message_id: str, db_session_factory):
    """Background task to generate AI response using RAG."""
    # 1. Notify that AI is thinking
    await manager.broadcast_to_session(session_id, {"type": "typing", "role": "assistant"})
    
    # 2. Run heavy processing in threadpool
    from fastapi.concurrency import run_in_threadpool
    ai_message = await run_in_threadpool(
        _generate_ai_response_sync,
        session_id, query, db_session_factory
    )
    
    if ai_message:
        # 3. Broadcast AI response (async)
        from fastapi.encoders import jsonable_encoder
        from app import schemas
        ai_msg_json = jsonable_encoder(schemas.MessageResponse.model_validate(ai_message))
        await manager.broadcast_to_session(session_id, {"type": "new_message", "message": ai_msg_json})
    
    # 4. Notify that AI is done thinking
    await manager.broadcast_to_session(session_id, {"type": "typing_off", "role": "assistant"})


def _generate_ai_response_sync(session_id: str, query: str, db_session_factory):
    """Synchronous part of AI response generation."""
    db = db_session_factory()
    try:
        from app import models, schemas
        from app.services.embeddings import EmbeddingService
        from app.services.chroma_store import ChromaStore
        from app.services.llm_service import LLMService
        
        # Search for relevant context
        context = ""
        try:
            from app.services.chroma_store import ChromaStore
            chroma_store = ChromaStore()
            
            from app.services.embeddings import EmbeddingService
            embedding_service = EmbeddingService()
            query_embedding = embedding_service.generate_query_embedding(query)
            
            search_results = chroma_store.search(session_id, query_embedding, k=15)
            context = "\n\n".join([f"[Source: {r['metadata']['filename']}]: {r['content']}" for r in search_results])
            
            # Fallback for general queries
            is_summary_query = any(word in query.lower() for word in ["summarize", "summarise", "overview", "what is this", "about", "tell me about"])
            if (len(search_results) < 3 or is_summary_query) and db.query(models.Document).filter(models.Document.session_id == session_id).count() > 0:
                intro_chunks = db.query(models.Chunk).join(models.Document).filter(
                    models.Document.session_id == session_id,
                    models.Chunk.chunk_index < 5 
                ).limit(15).all()
                
                if intro_chunks:
                    intro_context = "\n\n".join([f"[Intro from {c.document.filename}]: {c.content}" for c in intro_chunks])
                    context = (context + "\n\nGENERAL DOCUMENT OVERVIEW (IF RELEVANT):\n" + intro_context).strip()
        except Exception as e:
            print(f"No RAG context available: {e}")
            context = ""

        # Check for processing docs
        doc_count = db.query(models.Document).filter(models.Document.session_id == session_id).count()
        if not context and doc_count > 0:
            processing_docs = db.query(models.Document).filter(models.Document.session_id == session_id).all()
            still_processing = False
            for doc in processing_docs:
                if not db.query(models.Chunk).filter(models.Chunk.document_id == doc.id).first():
                    still_processing = True
                    break
            if still_processing:
                context = "[SYSTEM NOTE: One or more documents are still being processed. Inform the user to wait a moment if their question depends on these documents.]"

        # History
        history = db.query(models.Message).filter(
            models.Message.session_id == session_id
        ).order_by(models.Message.created_at.desc()).limit(11).all()
        
        conversation_history = [
            {"role": msg.role, "content": msg.content}
            for msg in reversed(history[1:]) # Skip the message just sent
        ]

        # Session Info (for awareness)
        session = db.query(models.Session).filter(models.Session.id == session_id).first()
        members = db.query(models.User).join(models.SessionMember).filter(models.SessionMember.session_id == session_id).all()
        session_info = f"Session Name: {session.name}\nParticipants: {', '.join([m.name for m in members])}"
        
        # Generate response
        llm_service = LLMService()
        ai_response_text = llm_service.generate_response(
            query=query,
            context=context,
            conversation_history=conversation_history,
            session_info=session_info
        )
        
        if doc_count == 0 and not "upload" in ai_response_text.lower():
            ai_response_text = "I don't have any documents to reference yet. Please upload some PDFs to get started!\n\n" + ai_response_text
            
        # Save AI response
        ai_message = models.Message(
            session_id=session_id,
            user_id=None,
            content=ai_response_text,
            role="assistant"
        )
        db.add(ai_message)
        db.commit()
        db.refresh(ai_message)
        
        # Eager load user (which is None here but good practice) and serialize
        from sqlalchemy.orm import joinedload
        from fastapi.encoders import jsonable_encoder
        db.query(models.Message).options(joinedload(models.Message.user)).filter(models.Message.id == ai_message.id).first()
        return jsonable_encoder(schemas.MessageResponse.model_validate(ai_message))
        
    except Exception as e:
        print(f"Error in background AI processing: {e}")
        import traceback
        traceback.print_exc()
        return None
    finally:
        db.close()


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
