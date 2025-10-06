import os
import openai
from sqlalchemy.orm import Session
from sqlalchemy import text
import json
from typing import List, Dict
import models

# Initialize OpenAI client
openai.api_key = os.getenv("OPENAI_API_KEY")

class RAGService:
    def __init__(self, db: Session):
        self.db = db
    
    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for text using OpenAI"""
        try:
            response = openai.embeddings.create(
                model="text-embedding-ada-002",
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"Error generating embedding: {e}")
            return []
    
    def search_similar_sources(self, query: str, top_k: int = 5) -> List[Dict]:
        """Search for similar academic sources using vector similarity"""
        query_embedding = self.generate_embedding(query)
        
        if not query_embedding:
            return []
        
        # Convert embedding to string format for PostgreSQL
        embedding_str = "[" + ",".join(map(str, query_embedding)) + "]"
        
        # Perform vector similarity search
        sql = text("""
            SELECT id, title, authors, publication_year, abstract, source_type,
                   (1 - (embedding <=> :embedding)) as similarity
            FROM academic_sources
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> :embedding
            LIMIT :top_k
        """)
        
        result = self.db.execute(sql, {"embedding": embedding_str, "top_k": top_k})
        sources = []
        
        for row in result:
            sources.append({
                "id": row[0],
                "title": row[1],
                "authors": row[2],
                "publication_year": row[3],
                "abstract": row[4],
                "source_type": row[5],
                "similarity": float(row[6])
            })
        
        return sources
    
    def analyze_assignment_with_ai(self, assignment_text: str, relevant_sources: List[Dict]) -> Dict:
        """Use AI to analyze assignment and provide suggestions"""
        try:
            sources_context = "\n\n".join([
                f"Source {i+1}: {source['title']} by {source['authors']} ({source['publication_year']})\n"
                f"Abstract: {source['abstract'][:500]}..."
                for i, source in enumerate(relevant_sources[:3])
            ])
            
            prompt = f"""
            Analyze the following student assignment and provide comprehensive feedback:

            ASSIGNMENT TEXT:
            {assignment_text[:4000]}

            RELEVANT ACADEMIC SOURCES:
            {sources_context}

            Please provide analysis in the following JSON format:
            {{
                "topic": "main topic of assignment",
                "academic_level": "undergraduate|graduate|phd",
                "key_themes": ["theme1", "theme2", "theme3"],
                "research_questions": ["question1", "question2"],
                "research_suggestions": "detailed suggestions for improvement",
                "citation_recommendations": "APA|MLA|Chicago etc.",
                "plagiarism_risk_areas": ["section1", "section2"]
            }}
            """
            
            response = openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an academic advisor helping students improve their assignments."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=1500
            )
            
            analysis = json.loads(response.choices[0].message.content)
            return analysis
            
        except Exception as e:
            print(f"Error in AI analysis: {e}")
            return {
                "topic": "Unknown",
                "academic_level": "undergraduate",
                "key_themes": [],
                "research_questions": [],
                "research_suggestions": "Analysis unavailable",
                "citation_recommendations": "APA",
                "plagiarism_risk_areas": []
            }
    
    def detect_plagiarism(self, assignment_text: str, relevant_sources: List[Dict]) -> Dict:
        """Simple plagiarism detection based on similarity scores"""
        if not relevant_sources:
            return {"score": 0.0, "flagged_sections": []}
        
        # Calculate overall plagiarism score based on source similarities
        max_similarity = max([source['similarity'] for source in relevant_sources])
        plagiarism_score = min(max_similarity * 1.5, 1.0)  # Scale the score
        
        flagged_sections = []
        if plagiarism_score > 0.7:
            for source in relevant_sources[:2]:
                if source['similarity'] > 0.6:
                    flagged_sections.append({
                        "source_title": source['title'],
                        "similarity": source['similarity'],
                        "reason": "High similarity with academic source"
                    })
        
        return {
            "score": round(plagiarism_score, 2),
            "flagged_sections": flagged_sections
        }