from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime

Base = declarative_base()

# SQLAlchemy Models
class Student(Base):
    __tablename__ = "students"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    student_id = Column(String, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Assignment(Base):
    __tablename__ = "assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    filename = Column(String, nullable=False)
    original_text = Column(Text)
    topic = Column(String)
    academic_level = Column(String)
    word_count = Column(Integer)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

class AnalysisResult(Base):
    __tablename__ = "analysis_results"
    
    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"))
    suggested_sources = Column(JSON)
    plagiarism_score = Column(Float)
    flagged_sections = Column(JSON)
    research_suggestions = Column(Text)
    citation_recommendations = Column(Text)
    confidence_score = Column(Float)
    analyzed_at = Column(DateTime(timezone=True), server_default=func.now())

class AcademicSource(Base):
    __tablename__ = "academic_sources"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    authors = Column(String)
    publication_year = Column(Integer)
    abstract = Column(Text)
    full_text = Column(Text)
    source_type = Column(String)
    embedding = Column(JSON)  # Using JSON to store vector data

# Pydantic Models
class StudentCreate(BaseModel):
    email: str
    password: str
    full_name: str
    student_id: Optional[str] = None

class StudentResponse(BaseModel):
    id: int
    email: str
    full_name: str
    student_id: Optional[str]
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class AssignmentUpload(BaseModel):
    filename: str
    content: str

class AnalysisResponse(BaseModel):
    id: int
    assignment_id: int
    suggested_sources: Optional[List[Dict]] = None
    plagiarism_score: Optional[float] = None
    flagged_sections: Optional[List[Dict]] = None
    research_suggestions: Optional[str] = None
    citation_recommendations: Optional[str] = None
    confidence_score: Optional[float] = None
    analyzed_at: Optional[datetime] = None

class SourceSearch(BaseModel):
    query: str
    top_k: int = 5