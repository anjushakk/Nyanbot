"""Vector store service using FAISS for similarity search."""
import faiss
import numpy as np
import pickle
from typing import List, Tuple, Optional
from pathlib import Path


class VectorStore:
    """FAISS-based vector store for semantic search."""
    
    def __init__(self, dimension: int = 384):
        """
        Initialize the vector store.
        
        Args:
            dimension: Dimension of the embeddings (384 for all-MiniLM-L6-v2)
        """
        self.dimension = dimension
        self.index = faiss.IndexFlatL2(dimension)
        self.chunks: List[str] = []
        self.metadata: List[dict] = []
    
    def add_documents(
        self, 
        embeddings: np.ndarray, 
        chunks: List[str], 
        metadata: List[dict]
    ):
        """
        Add document chunks to the vector store.
        
        Args:
            embeddings: NumPy array of embeddings with shape (n, dimension)
            chunks: List of text chunks
            metadata: List of metadata dicts for each chunk
        """
        if len(embeddings) != len(chunks) or len(chunks) != len(metadata):
            raise ValueError("Embeddings, chunks, and metadata must have the same length")
        
        # Add embeddings to FAISS index
        self.index.add(embeddings.astype('float32'))
        
        # Store chunks and metadata
        self.chunks.extend(chunks)
        self.metadata.extend(metadata)
    
    def search(
        self, 
        query_embedding: np.ndarray, 
        k: int = 5
    ) -> List[Tuple[str, dict, float]]:
        """
        Search for similar chunks using semantic similarity.
        
        Args:
            query_embedding: Query embedding vector
            k: Number of results to return
            
        Returns:
            List of tuples (chunk_text, metadata, distance_score)
        """
        if self.index.ntotal == 0:
            return []
        
        # Ensure query embedding is the right shape
        query_vector = query_embedding.reshape(1, -1).astype('float32')
        
        # Search
        distances, indices = self.index.search(query_vector, min(k, self.index.ntotal))
        
        # Build results
        results = []
        for i, idx in enumerate(indices[0]):
            if idx < len(self.chunks) and idx >= 0:
                results.append((
                    self.chunks[idx],
                    self.metadata[idx],
                    float(distances[0][i])
                ))
        
        return results
    
    def save(self, path: str):
        """
        Save the vector store to disk.
        
        Args:
            path: Base path for saving (will create .index and .pkl files)
        """
        # Create directory if it doesn't exist
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        
        # Save FAISS index
        faiss.write_index(self.index, f"{path}.index")
        
        # Save chunks and metadata
        with open(f"{path}.pkl", "wb") as f:
            pickle.dump({
                "chunks": self.chunks,
                "metadata": self.metadata,
                "dimension": self.dimension
            }, f)
    
    def load(self, path: str):
        """
        Load the vector store from disk.
        
        Args:
            path: Base path for loading (will read .index and .pkl files)
        """
        # Load FAISS index
        self.index = faiss.read_index(f"{path}.index")
        
        # Load chunks and metadata
        with open(f"{path}.pkl", "rb") as f:
            data = pickle.load(f)
            self.chunks = data["chunks"]
            self.metadata = data["metadata"]
            self.dimension = data.get("dimension", 384)
    
    def clear(self):
        """Clear all data from the vector store."""
        self.index = faiss.IndexFlatL2(self.dimension)
        self.chunks = []
        self.metadata = []
    
    @property
    def size(self) -> int:
        """Get the number of vectors in the store."""
        return self.index.ntotal
