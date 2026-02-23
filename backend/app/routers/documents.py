"""Document management router."""
import os
import shutil
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from uuid import UUID

from app import models, schemas
from app.database import get_db
from app.routers.auth import get_current_user


router = APIRouter(prefix="/api/sessions/{session_id}/documents", tags=["documents"])

# Upload directory
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# File size limit (10MB)
MAX_FILE_SIZE = 10 * 1024 * 1024


@router.post("", response_model=schemas.DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    session_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Upload a PDF document to a session."""
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
    
    # Validate file type
    if not file.filename.endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are allowed"
        )
    
    # Read file content
    content = await file.read()
    
    # Check file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds maximum limit of {MAX_FILE_SIZE / (1024*1024)}MB"
        )
    
    # Create document record
    document = models.Document(
        session_id=session_id,
        uploaded_by=current_user.id,
        filename=file.filename,
        storage_path=""  # Will be set after saving file
    )
    
    db.add(document)
    db.flush()  # Get the document ID
    
    # Create session directory if it doesn't exist
    session_dir = os.path.join(UPLOAD_DIR, str(session_id))
    os.makedirs(session_dir, exist_ok=True)
    
    # Save file with document ID as filename
    file_path = os.path.join(session_dir, f"{document.id}.pdf")
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Update storage path
    document.storage_path = file_path
    db.commit()
    db.refresh(document)
    
    # Process PDF for RAG (text extraction, chunking, embeddings)
    try:
        from app.services.pdf_processor import PDFProcessor
        from app.services.embeddings import EmbeddingService
        from app.services.vector_store import VectorStore
        
        # Initialize services
        pdf_processor = PDFProcessor()
        embedding_service = EmbeddingService()
        
        # Extract text from PDF
        text = pdf_processor.extract_text(file_path)
        
        # Chunk the text
        chunks = pdf_processor.chunk_text(text, chunk_size=512, overlap=50)
        
        if chunks:
            # Generate embeddings
            embeddings = embedding_service.generate_embeddings(chunks)
            
            # Load or create vector store for this session
            vector_store_path = f"vector_stores/{session_id}"
            vector_store = VectorStore()
            
            # Try to load existing vector store
            try:
                vector_store.load(vector_store_path)
            except:
                pass  # New vector store
            
            # Add document chunks to vector store
            metadata = [
                {
                    "document_id": str(document.id),
                    "chunk_index": i,
                    "filename": file.filename
                }
                for i in range(len(chunks))
            ]
            vector_store.add_documents(embeddings, chunks, metadata)
            
            # Save vector store
            vector_store.save(vector_store_path)
            
            # Store chunks in database
            for i, chunk_text in enumerate(chunks):
                chunk = models.Chunk(
                    document_id=document.id,
                    content=chunk_text,
                    chunk_index=i
                )
                db.add(chunk)
            db.commit()
    
    except Exception as e:
        # Log error but don't fail the upload
        print(f"Error processing document for RAG: {str(e)}")
        # Document is still uploaded, just not processed for RAG yet
    
    # Create a system message in the chat to show the document was uploaded
    try:
        system_message = models.Message(
            session_id=session_id,
            user_id=None,  # System message
            content=f"📎 **{current_user.username}** uploaded: **{file.filename}**",
            role="system"
        )
        db.add(system_message)
        db.commit()
    except Exception as e:
        print(f"Error creating system message: {e}")
    
    return document


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
    
    # Delete document record
    db.delete(document)
    db.commit()
    
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
        from app.services.vector_store import VectorStore
        
        # Load vector store for this session
        vector_store_path = f"vector_stores/{session_id}"
        vector_store = VectorStore()
        
        try:
            vector_store.load(vector_store_path)
        except:
            # No vector store exists yet
            return []
        
        # Generate query embedding
        embedding_service = EmbeddingService()
        query_embedding = embedding_service.generate_query_embedding(query)
        
        # Search
        results = vector_store.search(query_embedding, k)
        
        # Format results
        return [
            {
                "content": chunk,
                "metadata": metadata,
                "score": score
            }
            for chunk, metadata, score in results
        ]
    
    except Exception as e:
        print(f"Error searching documents: {str(e)}")
        return []
