import pdfplumber
from docx import Document
import os
from typing import Tuple

class FileProcessor:
    @staticmethod
    def extract_text_from_pdf(file_path: str) -> str:
        """Extract text from PDF file"""
        try:
            text = ""
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    text += page.extract_text() or ""
            return text
        except Exception as e:
            print(f"Error extracting text from PDF: {e}")
            return ""
    
    @staticmethod
    def extract_text_from_docx(file_path: str) -> str:
        """Extract text from DOCX file"""
        try:
            doc = Document(file_path)
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            return text
        except Exception as e:
            print(f"Error extracting text from DOCX: {e}")
            return ""
    
    @staticmethod
    def extract_text_from_txt(file_path: str) -> str:
        """Extract text from TXT file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                return file.read()
        except Exception as e:
            print(f"Error extracting text from TXT: {e}")
            return ""
    
    @staticmethod
    def process_uploaded_file(file_path: str) -> Tuple[str, int]:
        """Process uploaded file and return text content and word count"""
        file_extension = os.path.splitext(file_path)[1].lower()
        
        if file_extension == '.pdf':
            text = FileProcessor.extract_text_from_pdf(file_path)
        elif file_extension == '.docx':
            text = FileProcessor.extract_text_from_docx(file_path)
        elif file_extension == '.txt':
            text = FileProcessor.extract_text_from_txt(file_path)
        else:
            text = ""
        
        word_count = len(text.split()) if text else 0
        return text, word_count