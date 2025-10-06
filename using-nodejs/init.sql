-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Students table
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    student_id TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assignments table
CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_text TEXT,
    topic TEXT,
    academic_level TEXT,
    word_count INTEGER,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analysis results table
CREATE TABLE IF NOT EXISTS analysis_results (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
    suggested_sources JSONB,
    plagiarism_score FLOAT,
    flagged_sections JSONB,
    research_suggestions TEXT,
    citation_recommendations TEXT,
    confidence_score FLOAT,
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Academic sources table with vector embeddings
CREATE TABLE IF NOT EXISTS academic_sources (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    authors TEXT,
    publication_year INTEGER,
    abstract TEXT,
    full_text TEXT,
    source_type TEXT CHECK (source_type IN ('paper', 'textbook', 'course_material')),
    embedding VECTOR(1536)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assignments_student_id ON assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_assignment_id ON analysis_results(assignment_id);
CREATE INDEX IF NOT EXISTS idx_academic_sources_embedding ON academic_sources USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_academic_sources_source_type ON academic_sources(source_type);

-- Insert sample academic sources
INSERT INTO academic_sources (title, authors, publication_year, abstract, source_type) VALUES
('Machine Learning Fundamentals', 'Dr. Sarah Chen, Prof. Michael Rodriguez', 2022, 'Comprehensive introduction to machine learning algorithms and applications in modern computing.', 'textbook'),
('Natural Language Processing in Education', 'Dr. Emily Watson, Prof. James Kim', 2021, 'Exploring NLP techniques for educational content analysis and student assessment.', 'paper'),
('Academic Integrity in Digital Learning', 'Dr. Robert Thompson, Dr. Maria Garcia', 2023, 'Analysis of plagiarism detection methods and academic integrity frameworks in online education.', 'paper'),
('Vector Databases for Educational Content', 'Dr. Alex Johnson', 2022, 'Implementation of vector databases for efficient educational content retrieval and recommendation systems.', 'paper')
ON CONFLICT DO NOTHING;