const axios = require('axios');
const { pool } = require('../config/database');

class RAGService {
  async getEmbedding(text) {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
          input: text,
          model: 'text-embedding-ada-002'
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.data[0].embedding;
    } catch (error) {
      console.error('Embedding generation error:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  async similaritySearch(embedding, limit = 10) {
    try {
      // Convert embedding array to string format for PostgreSQL
      const embeddingString = `[${embedding.join(',')}]`;

      const result = await pool.query(
        `SELECT 
          id,
          title,
          authors,
          publication_year,
          abstract,
          source_type,
          1 - (embedding <=> $1) as similarity
         FROM academic_sources
         WHERE embedding IS NOT NULL
         ORDER BY embedding <=> $1
         LIMIT $2`,
        [embeddingString, limit]
      );

      return result.rows.map(row => ({
        ...row,
        similarity: parseFloat(row.similarity)
      }));
    } catch (error) {
      console.error('Similarity search error:', error);
      throw new Error('Failed to perform similarity search');
    }
  }

  async ingestDocument(title, authors, publication_year, abstract, full_text, source_type) {
    try {
      const textForEmbedding = `${title} ${authors} ${abstract}`;
      const embedding = await this.getEmbedding(textForEmbedding);

      await pool.query(
        `INSERT INTO academic_sources 
         (title, authors, publication_year, abstract, full_text, source_type, embedding)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [title, authors, publication_year, abstract, full_text, source_type, embedding]
      );

      return { success: true, message: 'Document ingested successfully' };
    } catch (error) {
      console.error('Document ingestion error:', error);
      throw new Error('Failed to ingest document');
    }
  }
}

module.exports = new RAGService();
module.exports.getEmbedding = (text) => new RAGService().getEmbedding(text);
module.exports.similaritySearch = (embedding, limit) => new RAGService().similaritySearch(embedding, limit);