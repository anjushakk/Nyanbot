import sys
import os

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.chroma_store import ChromaStore
from app.services.embeddings import EmbeddingService
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models

def check_rag(session_name):
    db = SessionLocal()
    try:
        # 1. Find session
        session = db.query(models.Session).filter(models.Session.name == session_name).first()
        if not session:
            print(f"Session '{session_name}' not found.")
            return
        
        session_id = str(session.id)
        print(f"Checking RAG for session: {session.name} ({session_id})")
        
        # 2. Check documents in DB
        docs = db.query(models.Document).filter(models.Document.session_id == session_id).all()
        print(f"Documents in SQL DB: {len(docs)}")
        for d in docs:
            chunk_count = db.query(models.Chunk).filter(models.Chunk.document_id == d.id).count()
            print(f"  - {d.filename}: {chunk_count} chunks")
        
        # 3. Check ChromaDB
        store = ChromaStore()
        # Chroma doesn't have a direct "count by where" in the simple API without querying
        # but we can query with a dummy embedding
        dummy_query = "test"
        emb_service = EmbeddingService()
        query_emb = emb_service.generate_query_embedding(dummy_query)
        
        results = store.search(session_id, query_emb, k=10)
        print(f"ChromaDB search for '{dummy_query}': Found {len(results)} results")
        
        if results:
            print("Sample result from ChromaDB:")
            print(f"  Content: {results[0]['content'][:100]}...")
            print(f"  Metadata: {results[0]['metadata']}")
        else:
            print("⚠️ NO RESULTS FOUND IN CHROMADB for this session.")
            
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        check_rag(sys.argv[1])
    else:
        # Try to find any session
        db = SessionLocal()
        s = db.query(models.Session).first()
        db.close()
        if s:
            check_rag(s.name)
        else:
            print("No sessions found in DB.")
