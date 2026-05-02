"""LLM service for generating AI responses using Groq with llama-3.3-70b-versatile."""
import os
from groq import Groq
from typing import List, Optional, Dict
from app.config import settings


class LLMService:
    """Service for generating AI responses using Groq Cloud."""
    
    def __init__(self):
        """Initialize the Groq client."""
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        self.model = "llama-3.3-70b-versatile"
    
    def generate_response(
        self, 
        query: str, 
        context: str = "", 
        conversation_history: Optional[List[Dict[str, str]]] = None,
        session_info: str = ""
    ) -> str:
        """Generate a response using Groq Cloud API."""
        try:
            prompt = self._build_prompt(query, context, conversation_history, session_info)
            
            completion = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self._get_system_message()},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3, # Lower temperature for higher accuracy
                max_tokens=2048,
                top_p=1,
                stream=False,
            )
            return completion.choices[0].message.content.strip()
                
        except Exception as e:
            return f"⚠️ Error generating response: {str(e)}"
    
    def _get_system_message(self) -> str:
        return """You are Nyanbot, a highly accurate AI assistant. Your primary directive is to provide precise information based ONLY on the provided document context.

STRICT GROUNDING RULES:
INSTRUCTIONS:
- Primary Goal: Provide accurate and precise answers based on the CONTEXT FROM DOCUMENTS provided.
- Summarization: If the user asks for a summary, provide a comprehensive overview using the available context. Mention key topics, purpose, and main points.
- Specific Questions: For detailed questions, use the information from the context. Cite sources if possible.
- Missing Information: If the provided context doesn't contain the exact answer, try to provide a helpful response based on the "General Document Overview" if available, or explain what the documents *do* cover. Only state you can't find the information if it's completely absent.
- Formatting: Structure your answers for readability. Use paragraphs, bullet points, or numbered lists. **Bold** key terms.
- Tables: When providing tables, use standard GitHub Flavored Markdown (GFM) format. Ensure each cell is separated by a single pipe `|`, and include a delimiter row with dashes `| --- | --- |` immediately after the header. Never use double pipes `||` or put multiple rows on one line.
- Natural Tone: Use natural, professional language. Keep answers concise but thorough. Use Markdown for all formatting. 
- **No Filler**: Avoid generic introductory phrases like "Based on the documents..." or "Here is the summary...". Dive straight into the information.
If no documents are uploaded, help the user by explaining how to upload PDFs to start the session."""





    def _estimate_tokens(self, text: str) -> int:
        """Rough estimate of token count."""
        return len(text) // 4

    def _build_prompt(
        self, 
        query: str, 
        context: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        session_info: str = ""
    ) -> str:
        """Build the prompt for the LLM with strict token-aware truncation."""
        # Use a safe limit to stay within TPM quotas (approx. 4000 tokens)
        MAX_TOTAL_TOKENS = 4000
        
        # Build conversation context
        conversation_text = ""
        if conversation_history:
            conversation_text = "\n\nChat History:\n"
            # Limit history to stay within tokens
            for msg in conversation_history[-3:]: 
                role = "User" if msg["role"] == "user" else "Assistant"
                conversation_text += f"{role}: {msg['content']}\n"
        
        # Estimate fixed parts
        fixed_text = query + conversation_text + session_info + self._get_system_message()
        fixed_tokens = self._estimate_tokens(fixed_text)
        available_context_tokens = max(500, MAX_TOTAL_TOKENS - fixed_tokens)
        
        # Truncate context to fit available space
        if self._estimate_tokens(context) > available_context_tokens:
            print(f"DEBUG: Truncating context from {self._estimate_tokens(context)} to {available_context_tokens} tokens")
            char_limit = available_context_tokens * 4
            context = context[:char_limit] + "... [context truncated for length]"

        # Build full prompt
        full_context = f"CURRENT SESSION:\n{session_info}\n\n"
        if context:
            full_context += f"CONTEXT FROM DOCUMENTS:\n{context}"
        else:
            full_context += "NOTE: No relevant document content found for this specific query."

        prompt = f"""{full_context}

{conversation_text}

USER QUESTION: {query}
RESPONSE (Stay accurate and concise):"""
        
        return prompt
    
    def check_availability(self) -> bool:
        """Check if Groq API is reachable."""
        try:
            # Simple list models call to check connectivity
            self.client.models.list()
            return True
        except:
            return False

