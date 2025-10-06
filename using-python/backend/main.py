from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import models
from database import engine, get_db
import auth
from rag_service import RAGService
from file_processor import FileProcessor
import os
import uuid
from typing import List
import requests
import json

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Academic Assignment Helper API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory
os.makedirs("uploads", exist_ok=True)

@app.post("/auth/register", response_model=models.StudentResponse)
def register_student(student_data: models.StudentCreate, db: Session = Depends(get_db)):
    """Register a new student"""
    # Check if student already exists
    existing_student = db.query(models.Student).filter(models.Student.email == student_data.email).first()
    if existing_student:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new student
    hashed_password = auth.get_password_hash(student_data.password)
    student = models.Student(
        email=student_data.email,
        password_hash=hashed_password,
        full_name=student_data.full_name,
        student_id=student_data.student_id
    )
    
    db.add(student)
    db.commit()
    db.refresh(student)
    
    return student

@app.post("/auth/login", response_model=models.Token)
def login_student(email: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    """Login student and return JWT token"""
    student = auth.authenticate_student(db, email, password)
    if not student:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = auth.create_access_token(
        data={"sub": student.email},
        expires_delta=auth.timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/upload")
async def upload_assignment(
    file: UploadFile = File(...),
    current_student: models.Student = Depends(auth.get_current_student),
    db: Session = Depends(get_db)
):
    """Upload assignment file and trigger analysis"""
    # Save file locally
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join("uploads", unique_filename)
    
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # Process file to extract text
    file_processor = FileProcessor()
    extracted_text, word_count = file_processor.process_uploaded_file(file_path)
    
    # Create assignment record
    assignment = models.Assignment(
        student_id=current_student.id,
        filename=file.filename,
        original_text=extracted_text,
        word_count=word_count
    )
    
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    
    # Trigger n8n workflow
    try:
        n8n_webhook_url = os.getenv("N8N_WEBHOOK_URL", "http://localhost:5678/webhook/assignment")
        payload = {
            "assignment_id": assignment.id,
            "student_id": current_student.id,
            "file_path": file_path,
            "filename": file.filename
        }
        
        response = requests.post(n8n_webhook_url, json=payload)
        
        if response.status_code == 200:
            return {
                "message": "Assignment uploaded successfully",
                "assignment_id": assignment.id,
                "analysis_job_id": f"job_{assignment.id}"
            }
        else:
            return {
                "message": "Assignment uploaded but n8n workflow failed",
                "assignment_id": assignment.id,
                "warning": "Analysis may be delayed"
            }
    
    except Exception as e:
        return {
            "message": "Assignment uploaded but n8n connection failed",
            "assignment_id": assignment.id,
            "error": str(e)
        }

@app.get("/analysis/{assignment_id}", response_model=models.AnalysisResponse)
def get_analysis_results(
    assignment_id: int,
    current_student: models.Student = Depends(auth.get_current_student),
    db: Session = Depends(get_db)
):
    """Get analysis results for an assignment"""
    # Verify assignment belongs to current student
    assignment = db.query(models.Assignment).filter(
        models.Assignment.id == assignment_id,
        models.Assignment.student_id == current_student.id
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    analysis = db.query(models.AnalysisResult).filter(
        models.AnalysisResult.assignment_id == assignment_id
    ).first()
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    return analysis

@app.get("/sources")
def search_sources(
    query: str,
    top_k: int = 5,
    db: Session = Depends(get_db)
):
    """Search academic sources via RAG"""
    rag_service = RAGService(db)
    sources = rag_service.search_similar_sources(query, top_k)
    
    return {
        "query": query,
        "sources_found": len(sources),
        "sources": sources
    }

@app.get("/")
def read_root():
    return {"message": "Academic Assignment Helper API is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}