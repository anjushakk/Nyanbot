"""PDF processing service for text extraction and chunking."""
from pypdf import PdfReader
from typing import List


class PDFProcessor:
    """Service for processing PDF documents."""
    
    @staticmethod
    def extract_text(pdf_path: str) -> str:
        """
        Extract all text from a PDF file.
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            Extracted text as a single string
        """
        try:
            from pypdf import PdfReader
            reader = PdfReader(pdf_path)
            text = ""
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            return text.strip()
        except Exception as e:
            raise Exception(f"Error extracting text from PDF: {str(e)}")
    
    @staticmethod
    def chunk_text(
        text: str, 
        chunk_size: int = 300, 
        overlap: int = 50
    ) -> List[str]:
        """
        Split text into overlapping chunks.
        
        Args:
            text: Text to chunk
            chunk_size: Number of words per chunk
            overlap: Number of words to overlap between chunks
            
        Returns:
            List of text chunks
        """
        if not text:
            return []
        
        # Split by sentences more robustly
        import re
        sentences = re.split(r'(?<=[.!?])\s+', text)
        
        chunks = []
        current_chunk = []
        current_len = 0
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
            
            # Use character count as a proxy for tokens (approx 4 chars per token)
            # or word count as requested (chunk_size: int = 512 words)
            words = sentence.split()
            if not words:
                continue
                
            if current_len + len(words) > chunk_size and current_chunk:
                chunks.append(" ".join(current_chunk))
                # Keep some overlap
                # Overlap logic: keep last 'overlap' words
                overlap_words = current_chunk[-overlap:] if len(current_chunk) > overlap else current_chunk
                current_chunk = overlap_words + words
                current_len = len(current_chunk)
            else:
                current_chunk.extend(words)
                current_len += len(words)
                
        if current_chunk:
            chunks.append(" ".join(current_chunk))
            
        return chunks
    
    @staticmethod
    def get_page_count(pdf_path: str) -> int:
        """
        Get the number of pages in a PDF.
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            Number of pages
        """
        try:
            reader = PdfReader(pdf_path)
            return len(reader.pages)
        except Exception as e:
            raise Exception(f"Error reading PDF: {str(e)}")
