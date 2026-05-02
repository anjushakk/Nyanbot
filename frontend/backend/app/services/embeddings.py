"""Embedding generation service using Hugging Face Inference API."""
from huggingface_hub import InferenceClient
from typing import List
import numpy as np
from app.config import settings


class EmbeddingService:
    """Service for generating text embeddings via Hugging Face API."""
    
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        """
        Initialize the embedding service.
        """
        self.model_name = model_name
        self.client = InferenceClient(token=settings.HF_API_KEY)
        self.dimension = 384
    
    def generate_embeddings(self, texts: List[str]) -> np.ndarray:
        """
        Generate embeddings for a list of texts.
        """
        try:
            # feature_extraction returns a numpy array-like list
            embeddings = self.client.feature_extraction(
                texts,
                model=self.model_name
            )
            return np.array(embeddings)
        except Exception as e:
            raise Exception(f"HF API Error via InferenceClient: {str(e)}")
    
    def generate_query_embedding(self, query: str) -> np.ndarray:
        """
        Generate embedding for a single query.
        """
        embeddings = self.generate_embeddings([query])
        return embeddings[0]
