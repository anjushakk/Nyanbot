"""PDF processing service for text extraction and chunking."""
from PyPDF2 import PdfReader
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
        chunk_size: int = 512, 
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
        
        words = text.split()
        chunks = []
        
        for i in range(0, len(words), chunk_size - overlap):
            chunk = " ".join(words[i:i + chunk_size])
            if chunk:  # Only add non-empty chunks
                chunks.append(chunk)
        
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
