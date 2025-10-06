# Academic Assignment Helper & Plagiarism Detector (RAG-Powered)

A comprehensive backend system with n8n automation that provides academic assignment analysis, research source suggestions, and AI-powered plagiarism detection.

## 🚀 Features

- **Secure JWT Authentication** - Student registration and login system
- **Document Processing** - PDF and Word document text extraction
- **RAG-Powered Research** - Vector database search for academic sources
- **AI Analysis** - Assignment topic extraction and academic level assessment
- **Plagiarism Detection** - AI-powered similarity analysis and flagging
- **Automated Workflows** - n8n orchestration for analysis pipeline
- **Dockerized Setup** - Complete containerized deployment

## 🏗️ Architecture

## Prerequisites

- Docker and Docker Compose
- OpenAI API key

## Setup

1. Clone the repository
2. Copy .env` and configure your environment variables
3. Run `docker-compose up -d`
4. Access the services:
   - Backend API: http://localhost:3000
   - n8n: http://localhost:5678
   - pgAdmin: http://localhost:5050

## API Endpoints

- `POST /auth/register` - Student registration
- `POST /auth/login` - Student login
- `POST /upload` - Upload assignment (JWT required)
- `GET /analysis/{id}` - Get analysis results (JWT required)
- `GET /sources` - Search academic sources (JWT required)

## n8n Workflow

Import the workflow from `n8n-workflows/assignment_analysis_workflow.json` and configure the AI nodes with your API keys.
`npm install mammoth pdf-parse express-rate-limit helmet multer pg axios`