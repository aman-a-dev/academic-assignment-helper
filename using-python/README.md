Academic Assignment Helper & Plagiarism Detector (RAG-Powered)

A comprehensive backend system that helps students with academic assignments by providing AI-powered research suggestions, plagiarism detection, and automated analysis using Retrieval-Augmented Generation (RAG) technology.

🚀 Features

· 🔐 Secure Authentication - JWT-based student registration and login
· 📁 Multi-format Support - Upload PDF, DOCX, and TXT assignments
· 🤖 AI-Powered Analysis - Automated assignment feedback and suggestions
· 🔍 RAG-Powered Research - Intelligent source recommendations from academic database
· ⚠️ Plagiarism Detection - Similarity analysis against academic sources
· 📊 Structured Storage - PostgreSQL with vector embeddings for efficient search
· ⚙️ Workflow Automation - n8n workflows for processing pipeline
· 🐳 Dockerized Deployment - Easy setup with Docker Compose

📋 Prerequisites

Before you begin, ensure you have the following installed:

· Docker (version 20.10+)
· Docker Compose (version 2.0+)
· OpenAI API Key (for AI features and embeddings)

🛠️ Installation & Setup

Step 1: Clone the Repository

```bash
git clone <repository-url>
cd academic-assignment-helper
```

Step 2: Environment Configuration

1. Copy the environment template:

```bash
cp .env
```

1. Edit the .env file with your actual values:

```env
# OpenAI API Key (Required for AI features)
OPENAI_API_KEY=your_actual_openai_api_key_here

# Database Configuration
POSTGRES_DB=academic_helper
POSTGRES_USER=student
POSTGRES_PASSWORD=secure_password

# JWT Secret Key (Change this in production!)
JWT_SECRET_KEY=your_super_secret_jwt_key_here_change_in_production

# n8n Configuration
N8N_WEBHOOK_URL=http://n8n:5678/webhook/assignment

# Redis Configuration
REDIS_URL=redis://redis:6379
```

Step 3: Build and Start Services

Run the automated build script:

```bash
chmod +x build.sh
./build.sh
```

Or manually start the services:

```bash
# Create necessary directories
mkdir -p uploads
mkdir -p data

# Build and start all services
docker-compose up -d --build
```

Step 4: Verify Services

Check if all services are running:

```bash
docker-compose ps
```

You should see all services with status "Up":

· academic_backend - FastAPI application
· academic_n8n - Workflow automation
· academic_postgres - PostgreSQL database
· academic_pgadmin - Database management UI
· academic_redis - Caching service

Step 5: Access the Services

· Backend API: http://localhost:8000
· API Documentation: http://localhost:8000/docs
· n8n Workflow Editor: http://localhost:5678
· pgAdmin: http://localhost:5050

📚 Database Setup

Initialize with Sample Data

The database is automatically initialized with the required tables. To add sample academic sources:

1. Access pgAdmin at http://localhost:5050
2. Login with:
   · Email: admin@academic.com
   · Password: admin
3. Connect to the PostgreSQL server:
   · Host: postgres
   · Port: 5432
   · Username: student
   · Password: secure_password
4. Execute the sample data script or use the provided JSON file

Manual Database Initialization

```bash
# Execute SQL initialization
docker exec -i academic_postgres psql -U student -d academic_helper < init.sql

# Add sample academic sources
docker exec -i academic_postgres psql -U student -d academic_helper -c "
INSERT INTO academic_sources (title, authors, publication_year, abstract, source_type) 
VALUES ('Machine Learning Fundamentals', 'John Doe', 2020, 'Comprehensive guide to ML basics...', 'textbook');"
```

🔧 n8n Workflow Setup

Import the Assignment Analysis Workflow

1. Access n8n at http://localhost:5678
2. Go to Settings → Workflows
3. Click Import from file
4. Select: workflows/assignment_analysis_workflow.json
5. Activate the workflow

Workflow Steps Overview

The n8n workflow processes assignments through these stages:

1. Webhook Trigger - Receives assignment data from FastAPI
2. Text Extraction - Extracts text from uploaded files
3. RAG Source Search - Queries academic database for relevant sources
4. AI Analysis - Analyzes assignment content and provides feedback
5. Plagiarism Detection - Checks for similarity with existing sources
6. Result Storage - Saves analysis to database
7. Optional Notifications - Sends email/Slack notifications

🎯 API Usage

Authentication Endpoints

1. Register a Student

```http
POST /auth/register
Content-Type: application/json

{
  "email": "student@university.edu",
  "password": "securepassword123",
  "full_name": "John Smith",
  "student_id": "S123456"
}
```

2. Login

```http
POST /auth/login
Content-Type: application/x-www-form-urlencoded

email=student@university.edu&password=securepassword123
```

Response:

```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer"
}
```

Assignment Endpoints

3. Upload Assignment (Protected)

```http
POST /upload
Authorization: Bearer <your_jwt_token>
Content-Type: multipart/form-data

file: <assignment_file.pdf>
```

Response:

```json
{
  "message": "Assignment uploaded successfully",
  "assignment_id": 1,
  "analysis_job_id": "job_1"
}
```

4. Get Analysis Results (Protected)

```http
GET /analysis/1
Authorization: Bearer <your_jwt_token>
```

Response:

```json
{
  "id": 1,
  "assignment_id": 1,
  "suggested_sources": [
    {
      "title": "Machine Learning Fundamentals",
      "authors": "John Doe",
      "similarity": 0.85,
      "citation": "Doe, J. (2020). Machine Learning Fundamentals."
    }
  ],
  "plagiarism_score": 0.15,
  "research_suggestions": "Consider exploring neural networks...",
  "citation_recommendations": "APA",
  "confidence_score": 0.92
}
```

5. Search Academic Sources

```http
GET /sources?query=machine+learning&top_k=5
```

🧪 Testing the System

Using the Provided Test Script

```bash
# Run the API test examples
cd examples
python test_api.py
```

Manual Testing with curl

1. Register a test student:

```bash
curl -X POST "http://localhost:8000/auth/register" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@student.edu",
       "password": "testpass123",
       "full_name": "Test Student",
       "student_id": "TEST001"
     }'
```

2. Login to get JWT token:

```bash
curl -X POST "http://localhost:8000/auth/login" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "email=test@student.edu&password=testpass123"
```

3. Upload an assignment (using the token from step 2):

```bash
curl -X POST "http://localhost:8000/upload" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -F "file=@/path/to/your/assignment.pdf"
```

4. Check analysis results:

```bash
curl -X GET "http://localhost:8000/analysis/1" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

📁 Project Structure

```
academic-assignment-helper/
├── backend/                 # FastAPI application
│   ├── main.py             # Main application file
│   ├── auth.py             # Authentication utilities
│   ├── models.py           # Database models
│   ├── rag_service.py      # RAG implementation
│   ├── file_processor.py   # File processing utilities
│   ├── database.py         # Database configuration
│   ├── requirements.txt    # Python dependencies
│   └── Dockerfile          # Backend container definition
├── workflows/
│   └── assignment_analysis_workflow.json  # n8n workflow
├── data/
│   └── sample_academic_sources.json       # Sample data
├── uploads/                # File upload directory
├── docker-compose.yml      # Service orchestration
├── init.sql               # Database initialization
├── .env.example           # Environment template
├── build.sh              # Build and setup script
└── README.md             # This file
```

🔍 RAG Pipeline Architecture

1. Document Ingestion

· Academic sources are processed and chunked
· Embeddings generated using OpenAI's text-embedding-ada-002
· Vectors stored in PostgreSQL with pgvector extension

2. Query Processing

· Assignment text is converted to embeddings
· Similarity search against academic database
· Top-k relevant sources retrieved

3. Context Enhancement

· Retrieved sources provide context for AI analysis
· AI generates targeted feedback and suggestions
· Plagiarism detection based on similarity scores

🛡️ Security Features

· JWT Authentication - Secure token-based authentication
· Password Hashing - BCrypt for secure password storage
· Input Validation - Pydantic models for data validation
· File Type Restrictions - Limited to academic file formats
· Secure Headers - CORS and security middleware

🚨 Troubleshooting

Common Issues

1. Services not starting
   ```bash
   # Check Docker logs
   docker-compose logs
   
   # Restart services
   docker-compose down
   docker-compose up -d
   ```
2. Database connection issues
   ```bash
   # Check if PostgreSQL is running
   docker exec academic_postgres pg_isready
   
   # Reset database
   docker-compose down -v
   docker-compose up -d
   ```
3. n8n workflow not triggering
   · Verify webhook URL in n8n settings
   · Check if workflow is active
   · Verify backend can reach n8n service
4. OpenAI API errors
   · Verify OPENAI_API_KEY is set in .env
   · Check API key validity and quota

Logs and Monitoring

```bash
# View all service logs
docker-compose logs -f

# View specific service logs
docker-compose logs backend
docker-compose logs n8n
docker-compose logs postgres

# Check service health
curl http://localhost:8000/health
```

📊 Performance Optimization

For Production Deployment

1. Enable Caching
   · Redis for embedding cache
   · Database connection pooling
2. Scale Services
   ```yaml
   # In docker-compose.yml
   backend:
     deploy:
       replicas: 3
   ```
3. Database Optimization
   · Increase shared_buffers in PostgreSQL
   · Optimize vector index parameters
   · Regular vacuum and analyze

🤝 Contributing

1. Fork the repository
2. Create a feature branch (git checkout -b feature/amazing-feature)
3. Commit your changes (git commit -m 'Add amazing feature')
4. Push to the branch (git push origin feature/amazing-feature)
5. Open a Pull Request

📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

🆘 Support

If you encounter any issues:

1. Check the troubleshooting section above
2. Review service logs using docker-compose logs
3. Ensure all environment variables are properly set
4. Verify Docker and Docker Compose versions

For additional help, create an issue in the project repository.

🎯 Next Steps

After successful setup:

1. Add More Academic Sources - Populate the database with relevant papers and textbooks
2. Customize AI Prompts - Modify analysis prompts in rag_service.py
3. Extend File Support - Add support for more file formats
4. Enhance Plagiarism Detection - Implement more sophisticated similarity algorithms
5. Add Notifications - Configure email or Slack notifications for completed analyses
