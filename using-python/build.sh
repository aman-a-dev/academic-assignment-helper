#!/bin/bash

echo "Building Academic Assignment Helper System..."

# Create necessary directories
mkdir -p uploads
mkdir -p data

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "Copying .env.example to .env"
    cp .env.example .env
    echo "Please edit .env file with your actual values before continuing"
fi

# Build and start Docker containers
echo "Building and starting Docker containers..."
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Wait for services to start
echo "Waiting for services to start..."
sleep 30

# Check if services are running
echo "Checking service status..."
docker-compose ps

# Initialize database with sample data
echo "Initializing database with sample data..."
docker exec -i academic_postgres psql -U student -d academic_helper < init.sql

echo "Setup completed!"
echo "Access the services at:"
echo "  - Backend API: http://localhost:8000"
echo "  - n8n Workflow: http://localhost:5678"
echo "  - pgAdmin: http://localhost:5050"
echo ""
echo "Don't forget to:"
echo "1. Set your OPENAI_API_KEY in the .env file"
echo "2. Import the n8n workflow from workflows/assignment_analysis_workflow.json"
echo "3. Add academic sources to the database"