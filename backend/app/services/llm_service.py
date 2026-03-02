"""LLM service for generating AI responses using Groq with llama-3.1-8b-instant."""
import os
from groq import Groq
from typing import List, Optional, Dict
from app.config import settings


class LLMService:
    """Service for generating AI responses using Groq Cloud."""
    
    def __init__(self):
        """Initialize the Groq client."""
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        self.model = "llama-3.1-8b-instant"
    
    def generate_response(
        self, 
        query: str, 
        context: str = "",
        conversation_history: Optional[List[Dict[str, str]]] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024
    ) -> str:
        """
        Generate AI response using RAG context via Groq.
        """
        prompt = self._build_prompt(query, context, conversation_history)
        
        try:
            completion = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self._get_system_message()},
                    {"role": "user", "content": prompt}
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                top_p=1,
                stream=False,
            )
            return completion.choices[0].message.content.strip()
                
        except Exception as e:
            return f"⚠️ Error generating response: {str(e)}"
    
    def _get_system_message(self) -> str:
        return """You are a helpful AI assistant that answers questions based on provided documents.

INSTRUCTIONS:
- Primary Goal: Provide accurate and precise answers based on the CONTEXT FROM DOCUMENTS provided.
- Summarization: If the user asks for a summary, provide a comprehensive overview using the available context. Mention key topics, purpose, and main points.
- Specific Questions: For detailed questions, use ONLY the information from the context. Cite sources if possible.
- Missing Information: If the context is completely unrelated to the question, state that you don't have enough information in the documents *for that specific detail*, but still try to be helpful based on what you *do* know about the document's general subject.
- Natural Tone: Use natural, professional language. Do not be overly repetitive or robotic."""

    def _estimate_tokens(self, text: str) -> int:
        """Rough estimate of token count (approximation)."""
        return len(text) // 4

    def _build_prompt(
        self, 
        query: str, 
        context: str,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """Build the prompt for the LLM with strict token-aware truncation."""
        # Max TPM is 6000. Let's aim for 4000 to be very safe given multiple users
        MAX_PROMPT_TOKENS = 4000
        
        # Build conversation context
        conversation_text = ""
        if conversation_history:
            conversation_text = "\n\nPrevious conversation:\n"
            # Keep only the last 3 turns to leave more room for context
            for msg in conversation_history[-3:]:  
                role = "User" if msg["role"] == "user" else "Assistant"
                conversation_text += f"{role}: {msg['content']}\n"
        
        # Estimate existing tokens
        current_tokens = self._estimate_tokens(query + conversation_text + self._get_system_message())
        available_context_tokens = max(500, MAX_PROMPT_TOKENS - current_tokens)
        
        # Truncate context if it's too large
        if self._estimate_tokens(context) > available_context_tokens:
            print(f"DEBUG: Truncating context from {self._estimate_tokens(context)} to {available_context_tokens} tokens")
            # 4 chars per token rule of thumb
            char_limit = available_context_tokens * 4
            context = context[:char_limit] + "... [context truncated for length]"

        # Build full prompt
        if context:
            prompt = f"""CONTEXT FROM DOCUMENTS:
{context}
{conversation_text}

USER QUESTION: {query}"""
        else:
            prompt = f"""NOTE: No highly relevant document content was found for this specific query. Respond based on what information is available or state that more documents are needed.
{conversation_text}

USER QUESTION: {query}"""
        
        return prompt
    
    def check_availability(self) -> bool:
        """Check if Groq API is reachable."""
        try:
            # Simple list models call to check connectivity
            self.client.models.list()
            return True
        except:
            return False

