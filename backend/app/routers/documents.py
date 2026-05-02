"""Document management router."""
import os
import shutil
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.routers.auth import get_current_user, get_current_user_flexible

router = APIRouter(prefix="/api/sessions/{session_id}/documents", tags=["documents"])

# Upload directory
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# File size limit (20MB)
MAX_FILE_SIZE = 20 * 1024 * 1024

from fastapi.concurrency import run_in_threadpool
from app.services.pdf_processor import PDFProcessor

def _process_document_sync(document_id, session_id, file_path, filename, user_name, db_session_factory):
    db = db_session_factory()
    try:
        from app.services.pdf_processor import PDFProcessor
        from app.services.embeddings import EmbeddingService
        from app.services.chroma_store import ChromaStore
        from app import models
        
        print(f"DEBUG: Processing document {document_id} for RAG in background...")
        
        # Initialize services
        pdf_processor = PDFProcessor()
        embedding_service = EmbeddingService()
        
        # Extract text from PDF
        text = pdf_processor.extract_text(file_path)
        if not text.strip():
            print(f"DEBUG: No text extracted from {filename}")
            system_message = models.Message(
                session_id=session_id,
                user_id=None,
                content=f"⚠️ **{filename}** contains no readable text and couldn't be processed for RAG.",
                role="system"
            )
            db.add(system_message)
            db.commit()
            db.refresh(system_message)
            return system_message

        print(f"DEBUG: Extracted {len(text)} characters from PDF")
        
        # Chunk the text
        chunks = pdf_processor.chunk_text(text, chunk_size=200, overlap=40)
        print(f"DEBUG: Created {len(chunks)} chunks")
        
        if chunks:
            # Generate embeddings
            print(f"DEBUG: Generating embeddings for {len(chunks)} chunks...")
            embeddings = embedding_service.generate_embeddings(chunks)
            
            # Add document chunks to ChromaDB
            chroma_store = ChromaStore()
            metadata = [
                {
                    "document_id": str(document_id),
                    "chunk_index": i,
                    "filename": filename
                }
                for i in range(len(chunks))
            ]
            chroma_store.add_documents(session_id, embeddings, chunks, metadata)
            
            # Store chunks in database
            for i, chunk_text in enumerate(chunks):
                chunk = models.Chunk(
                    document_id=document_id,
                    content=chunk_text,
                    chunk_index=i
                )
                db.add(chunk)
            db.commit()
            print(f"DEBUG: Chunks stored in database for {document_id}")
            
        # Create system message after processing is done
        system_message = models.Message(
            session_id=session_id,
            user_id=None,
            content=f"✅ **{filename}** is now ready for chat!",
            role="system"
        )
        db.add(system_message)
        db.commit()
        db.refresh(system_message)
        return system_message
    except Exception as e:
        print(f"Error in background processing for {document_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        return None
    finally:
        db.close()

async def process_document_background(
    document_id: UUID,
    session_id: str,
    file_path: str,
    filename: str,
    user_name: str,
    db_session_factory
):
    """Background task to process PDF for RAG."""
    # Run heavy processing in a thread pool to avoid blocking the event loop
    system_message = await run_in_threadpool(
        _process_document_sync,
        document_id, session_id, file_path, filename, user_name, db_session_factory
    )
    
    if system_message:
        # Broadcast readiness via websocket
        from app.services.websocket_manager import manager
        from fastapi.encoders import jsonable_encoder
        from app import schemas
        msg_json = jsonable_encoder(schemas.MessageResponse.model_validate(system_message))
        await manager.broadcast_to_session(session_id, {"type": "new_message", "message": msg_json})
        await manager.broadcast_to_session(session_id, {"type": "document_update"})


@router.post("", response_model=schemas.DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    session_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Upload a PDF document to a session."""
    # 1. Read file content (async)
    content = await file.read()
    filename = file.filename

    # 2. Process all sync/blocking logic in thread pool
    from app.database import SessionLocal
    
    # Broadcast that an upload has started (for other users)
    from app.services.websocket_manager import manager
    await manager.broadcast_to_session(session_id, {
        "type": "document_uploading", 
        "filename": filename,
        "user": current_user.name
    })

    try:
        from fastapi.concurrency import run_in_threadpool
        document = await run_in_threadpool(
            _handle_upload_sync,
            session_id, content, filename, current_user.id, SessionLocal
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error in upload processing: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing upload: {str(e)}"
        )
    
    # 3. Add background task for RAG processing
    from app.database import SessionLocal
    background_tasks.add_task(
        process_document_background,
        document.id,
        session_id,
        document.storage_path,
        filename,
        current_user.name,
        SessionLocal
    )
    
    # 4. Broadcast initial system message (async)
    try:
        from app.database import SessionLocal
        system_message = await run_in_threadpool(_create_initial_system_message_sync, session_id, current_user.name, filename, SessionLocal)
        
        from app.services.websocket_manager import manager
        from fastapi.encoders import jsonable_encoder
        msg_json = jsonable_encoder(schemas.MessageResponse.model_validate(system_message))
        await manager.broadcast_to_session(session_id, {"type": "new_message", "message": msg_json})
        await manager.broadcast_to_session(session_id, {"type": "document_update"})
    except Exception as e:
        print(f"Error broadcasting initial message: {e}")
    
    return document


def _handle_upload_sync(session_id, content, filename, user_id, db_factory):
    """Synchronous logic for file upload: validation, saving, and DB record."""
    db = db_factory()
    try:
        # Check if session exists
        session = db.query(models.Session).filter(models.Session.id == session_id).first()
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
        
        # Check membership
        is_member = db.query(models.SessionMember).filter(
            models.SessionMember.session_id == session_id,
            models.SessionMember.user_id == user_id
        ).first()
        if not is_member:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a member of this session")
        
        # Validate file type
        if not filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are allowed")
        
        # Check file size
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=f"File size exceeds limit")
        
        # Create document record
        document = models.Document(
            session_id=session_id,
            uploaded_by=user_id,
            filename=filename,
            storage_path="" 
        )
        db.add(document)
        db.flush() 
        
        # Save file
        session_dir = os.path.join(UPLOAD_DIR, str(session_id))
        os.makedirs(session_dir, exist_ok=True)
        file_path = os.path.join(session_dir, f"{document.id}.pdf")
        
        with open(file_path, "wb") as f:
            f.write(content)
        
        document.storage_path = file_path
        db.commit()
        db.refresh(document)
        return document
    finally:
        db.close()


def _create_initial_system_message_sync(session_id, user_name, filename, db_factory):
    db = db_factory()
    try:
        system_message = models.Message(
            session_id=session_id,
            user_id=None,
            content=f"📎 **{user_name}** uploaded: **{filename}** (processing...)",
            role="system"
        )
        db.add(system_message)
        db.commit()
        db.refresh(system_message)
        return system_message
    finally:
        db.close()


@router.get("", response_model=List[schemas.DocumentListItem])
def list_documents(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """List all documents in a session."""
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
    
    # Get all documents for this session
    documents = db.query(models.Document).filter(
        models.Document.session_id == session_id
    ).order_by(models.Document.uploaded_at.desc()).all()
    
    return documents


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    session_id: str,
    document_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Delete a document."""
    # Get document
    document = db.query(models.Document).filter(
        models.Document.id == document_id,
        models.Document.session_id == session_id
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check if user is the uploader or session owner
    session = db.query(models.Session).filter(models.Session.id == session_id).first()
    
    if document.uploaded_by != current_user.id and session.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the uploader or session owner can delete this document"
        )
    
    # Delete file from disk
    if os.path.exists(document.storage_path):
        os.remove(document.storage_path)
    
    # Delete from ChromaDB
    try:
        from app.services.chroma_store import ChromaStore
        chroma_store = ChromaStore()
        chroma_store.delete_document(session_id, document_id)
    except Exception as e:
        print(f"Error deleting from ChromaDB: {e}")

    # Delete document record
    db.delete(document)
    db.commit()
    
    # Broadcast document_update
    from app.services.websocket_manager import manager
    background_tasks.add_task(manager.broadcast_to_session, session_id, {"type": "document_update"})
    
    return None


# Search router (separate from session-specific routes)
search_router = APIRouter(prefix="/api/sessions", tags=["search"])


@search_router.post("/{session_id}/search")
def search_documents(
    session_id: str,
    query: str,
    k: int = 5,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Search documents in a session using semantic similarity.
    
    Args:
        session_id: Session ID to search in
        query: Search query text
        k: Number of results to return
    
    Returns:
        List of relevant chunks with metadata and scores
    """
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
    
    try:
        from app.services.embeddings import EmbeddingService
        from app.services.chroma_store import ChromaStore
        
        # Search in ChromaDB
        chroma_store = ChromaStore()
        
        # Generate query embedding
        embedding_service = EmbeddingService()
        query_embedding = embedding_service.generate_query_embedding(query)
        
        # Search
        results = chroma_store.search(session_id, query_embedding, k)
        
        return results
    
    except Exception as e:
        print(f"Error searching documents: {str(e)}")
        return []


@router.get("/{document_id}/view")
def view_document(
    session_id: str,
    document_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_flexible)
):
    """View a document's PDF file."""
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
    
    # Get document
    document = db.query(models.Document).filter(
        models.Document.id == document_id,
        models.Document.session_id == session_id
    ).first()
    
    if not document or not document.storage_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    import os
    if not os.path.exists(document.storage_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on server"
        )
    
    from fastapi.responses import FileResponse
    return FileResponse(
        path=document.storage_path,
        filename=document.filename,
        media_type="application/pdf"
    )
