"""Vector store service using ChromaDB for persistent storage and search."""
import chromadb
from chromadb.config import Settings
import os
from typing import List, Dict, Any, Optional
import numpy as np

class ChromaStore:
    """ChromaDB-based vector store for semantic search."""
    
    def __init__(self, persist_directory: str = "chroma_db"):
        """
        Initialize the ChromaDB client.
        """
        # Ensure absolute path for persistence
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.persist_dir = os.path.join(base_dir, persist_directory)
        os.makedirs(self.persist_dir, exist_ok=True)
        
        self.client = chromadb.PersistentClient(path=self.persist_dir)
        # Use a single collection for all documents, filtered by session_id
        self.collection = self.client.get_or_create_collection(
            name="nyan_documents",
            metadata={"hnsw:space": "cosine"} # Use cosine similarity
        )
    
    def add_documents(
        self, 
        session_id: str,
        embeddings: np.ndarray, 
        chunks: List[str], 
        metadata: List[Dict[str, Any]]
    ):
        """
        Add document chunks to ChromaDB.
        """
        if len(embeddings) != len(chunks) or len(chunks) != len(metadata):
            raise ValueError("Embeddings, chunks, and metadata must have the same length")
        
        # Add session_id to each metadata dict for filtering
        for meta in metadata:
            meta["session_id"] = str(session_id)
            
        # Generate unique IDs for each chunk
        ids = [f"{str(session_id)}_{meta.get('document_id')}_{meta.get('chunk_index')}" for meta in metadata]
        
        # ChromaDB expects embeddings as List[List[float]]
        self.collection.add(
            embeddings=embeddings.tolist(),
            documents=chunks,
            metadatas=metadata,
            ids=ids
        )
        print(f"DEBUG: Added {len(chunks)} chunks to ChromaDB for session {session_id}")
    
    def search(
        self, 
        session_id: str,
        query_embedding: np.ndarray, 
        k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Search for similar chunks in a specific session.
        """
        # Ensure query embedding is a list
        query_vector = query_embedding.tolist()
        if isinstance(query_vector[0], list):
            query_vector = query_vector[0]
            
        results = self.collection.query(
            query_embeddings=[query_vector],
            n_results=k, # Default increased to 10 in call if needed
            where={"session_id": str(session_id)}
        )
        
        # Format results to match what the routers expect
        formatted_results = []
        if results["documents"]:
            for i in range(len(results["documents"][0])):
                formatted_results.append({
                    "content": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i],
                    "score": results["distances"][0][i] if results["distances"] else 0.0
                })
        
        return formatted_results

    def delete_document(self, session_id: str, document_id: str):
        """Delete all chunks belonging to a specific document."""
        self.collection.delete(
            where={
                "$and": [
                    {"session_id": str(session_id)},
                    {"document_id": str(document_id)}
                ]
            }
        )
        print(f"DEBUG: Deleted document {document_id} from ChromaDB")
