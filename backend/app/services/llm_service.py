"""LLM service for generating AI responses using Ollama with Llama 3.3."""
import requests
from typing import List, Optional, Dict
import json


class LLMService:
    """Service for generating AI responses using local Llama 3.3 via Ollama."""
    
    def __init__(self, base_url: str = "http://localhost:11434"):
        """
        Initialize the LLM service.
        
        Args:
            base_url: Ollama API base URL
        """
        self.base_url = base_url
        self.model = "llama3.3"
        self.api_url = f"{base_url}/api/generate"
    
    def generate_response(
        self, 
        query: str, 
        context: str = "",
        conversation_history: Optional[List[Dict[str, str]]] = None,
        temperature: float = 0.7,
        max_tokens: int = 500
    ) -> str:
        """
        Generate AI response using RAG context.
        
        Args:
            query: User's question
            context: Retrieved context from documents
            conversation_history: Previous messages in conversation
            temperature: Sampling temperature (0-1)
            max_tokens: Maximum response length
            
        Returns:
            Generated response text
        """
        # Build the prompt
        prompt = self._build_prompt(query, context, conversation_history)
        
        try:
            # Call Ollama API
            response = requests.post(
                self.api_url,
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": temperature,
                        "num_predict": max_tokens
                    }
                },
                timeout=60  # 60 second timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get("response", "").strip()
            else:
                return f"Error: Ollama returned status {response.status_code}"
                
        except requests.exceptions.ConnectionError:
            return "⚠️ Ollama is not running. Please start Ollama with: `ollama serve`"
        except requests.exceptions.Timeout:
            return "⚠️ Request timed out. The model might be loading or the query is too complex."
        except Exception as e:
            return f"⚠️ Error generating response: {str(e)}"
    
    def _build_prompt(
        self, 
        query: str, 
        context: str,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """Build the prompt for the LLM."""
        # System instructions
        system_prompt = """You are a helpful AI assistant that answers questions based on provided documents.

IMPORTANT INSTRUCTIONS:
- Answer questions using ONLY the information from the context provided below
- If the context doesn't contain relevant information, say "I don't have enough information in the documents to answer that question."
- Be concise, accurate, and helpful
- Cite specific parts of the context when possible
- If asked about something not in the context, politely decline and suggest what you can help with based on the available documents"""

        # Build conversation context
        conversation_text = ""
        if conversation_history:
            conversation_text = "\n\nPrevious conversation:\n"
            for msg in conversation_history[-6:]:  # Last 6 messages for context
                role = "User" if msg["role"] == "user" else "Assistant"
                conversation_text += f"{role}: {msg['content']}\n"
        
        # Build full prompt
        if context:
            prompt = f"""{system_prompt}

CONTEXT FROM DOCUMENTS:
{context}
{conversation_text}

USER QUESTION: {query}

ASSISTANT RESPONSE:"""
        else:
            prompt = f"""{system_prompt}

NOTE: No documents have been uploaded yet.
{conversation_text}

USER QUESTION: {query}

ASSISTANT RESPONSE:"""
        
        return prompt
    
    def check_availability(self) -> bool:
        """
        Check if Ollama is running and the model is available.
        
        Returns:
            True if Ollama is available, False otherwise
        """
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=5)
            if response.status_code == 200:
                models = response.json().get("models", [])
                return any(self.model in model.get("name", "") for model in models)
            return False
        except:
            return False
