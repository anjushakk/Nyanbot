"""PDF processing service for text extraction and chunking."""
from pypdf import PdfReader
from typing import List


class PDFProcessor:
    """Service for processing PDF documents."""
    
    @staticmethod
    def extract_text(pdf_path: str) -> str:
        """
        Extract structured text (Markdown) from a PDF file.
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            Extracted text in Markdown format
        """
        try:
            import pymupdf4llm
            # Convert PDF to Markdown to preserve tables and structure
            md_text = pymupdf4llm.to_markdown(pdf_path)
            return md_text.strip()
        except Exception as e:
            raise Exception(f"Error extracting structured text from PDF: {str(e)}")
    
    @staticmethod
    def chunk_text(
        text: str, 
        chunk_size: int = 200, 
        overlap: int = 40
    ) -> List[str]:
        """
        Split text into overlapping chunks, attempting to respect Markdown structure.
        
        Args:
            text: Text to chunk (Markdown format)
            chunk_size: Target number of words per chunk
            overlap: Number of words to overlap between chunks
            
        Returns:
            List of text chunks
        """
        if not text:
            return []
        
        # Split by paragraphs (double newlines) to preserve structure
        paragraphs = text.split("\n\n")
        
        chunks = []
        current_chunk = []
        current_word_count = 0
        
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
                
            para_words = para.split()
            para_len = len(para_words)
            
            # If a single paragraph is larger than chunk_size, split it by lines or sentences
            if para_len > chunk_size:
                # If we have a pending chunk, save it first
                if current_chunk:
                    chunks.append("\n\n".join(current_chunk))
                    current_chunk = []
                    current_word_count = 0
                
                # Split large paragraph (could be a very long table or text block)
                # For now, we split by sentences or just lines
                import re
                sub_parts = re.split(r'(?<=[.!?])\s+|\n', para)
                for part in sub_parts:
                    part = part.strip()
                    if not part: continue
                    part_words = part.split()
                    if current_word_count + len(part_words) > chunk_size and current_chunk:
                        chunks.append("\n\n".join(current_chunk))
                        # Simple overlap: carry over some parts
                        current_chunk = current_chunk[-1:] if len(current_chunk) > 0 else [] 
                        current_chunk.append(part)
                        current_word_count = sum(len(c.split()) for c in current_chunk)
                    else:
                        current_chunk.append(part)
                        current_word_count += len(part_words)
            
            # Normal paragraph handling
            elif current_word_count + para_len > chunk_size and current_chunk:
                chunks.append("\n\n".join(current_chunk))
                # Crude overlap: last paragraph
                current_chunk = [current_chunk[-1]] if current_chunk else []
                current_chunk.append(para)
                current_word_count = sum(len(c.split()) for c in current_chunk)
            else:
                current_chunk.append(para)
                current_word_count += para_len
                
        if current_chunk:
            chunks.append("\n\n".join(current_chunk))
            
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
