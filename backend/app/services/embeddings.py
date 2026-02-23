"""Embedding generation service using sentence transformers."""
from sentence_transformers import SentenceTransformer
from typing import List
import numpy as np


class EmbeddingService:
    """Service for generating text embeddings."""
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """
        Initialize the embedding service.
        
        Args:
            model_name: Name of the sentence-transformers model to use
        """
        self.model_name = model_name
        self.model = None
        self.dimension = 384  # Dimension for all-MiniLM-L6-v2
    
    def _load_model(self):
        """Lazy load the model when first needed."""
        if self.model is None:
            self.model = SentenceTransformer(self.model_name)
    
    def generate_embeddings(self, texts: List[str]) -> np.ndarray:
        """
        Generate embeddings for a list of texts.
        
        Args:
            texts: List of text strings to embed
            
        Returns:
            NumPy array of embeddings with shape (len(texts), dimension)
        """
        self._load_model()
        return self.model.encode(texts, show_progress_bar=False)
    
    def generate_query_embedding(self, query: str) -> np.ndarray:
        """
        Generate embedding for a single query.
        
        Args:
            query: Query text to embed
            
        Returns:
            NumPy array of shape (dimension,)
        """
        self._load_model()
        return self.model.encode([query], show_progress_bar=False)[0]
