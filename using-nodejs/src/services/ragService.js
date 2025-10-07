const axios = require('axios');
const { pool } = require('../config/database');

class RAGService {
  async getEmbedding(text) {
    try {
      // Truncate very long texts to avoid token limits
      const truncatedText = text.length > 8000 ? text.substring(0, 8000) : text;

      const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
          input: truncatedText,
          model: 'text-embedding-ada-002'
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return response.data.data[0].embedding;
    } catch (error) {
      console.error('Embedding generation error:', error.response?.data || error.message);
      throw new Error(`Failed to generate embedding: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async similaritySearch(embedding, limit = 10, filters = {}) {
    try {
      const embeddingString = `[${embedding.join(',')}]`;
      
      let query = `
        SELECT 
          id,
          title,
          authors,
          publication_year,
          abstract,
          source_type,
          1 - (embedding <=> $1) as similarity
        FROM academic_sources
        WHERE embedding IS NOT NULL
      `;
      
      const params = [embeddingString];
      let paramCount = 1;

      // Add filters
      if (filters.source_type) {
        paramCount++;
        query += ` AND source_type = $${paramCount}`;
        params.push(filters.source_type);
      }

      if (filters.min_year) {
        paramCount++;
        query += ` AND publication_year >= $${paramCount}`;
        params.push(filters.min_year);
      }

      if (filters.max_year) {
        paramCount++;
        query += ` AND publication_year <= $${paramCount}`;
        params.push(filters.max_year);
      }

      query += ` ORDER BY embedding <=> $1 LIMIT $${paramCount + 1}`;
      params.push(limit);

      const result = await pool.query(query, params);

      return result.rows.map(row => ({
        id: row.id,
        title: row.title,
        authors: row.authors,
        publication_year: row.publication_year,
        abstract: row.abstract,
        source_type: row.source_type,
        similarity: parseFloat(row.similarity)
      }));
    } catch (error) {
      console.error('Similarity search error:', error);
      throw new Error('Failed to perform similarity search');
    }
  }

  async ingestDocument(title, authors, publication_year, abstract, full_text, source_type) {
    try {
      const textForEmbedding = `${title} ${authors} ${abstract || ''}`.trim();
      
      if (!textForEmbedding) {
        throw new Error('No text content available for embedding generation');
      }

      const embedding = await this.getEmbedding(textForEmbedding);

      const result = await pool.query(
        `INSERT INTO academic_sources 
         (title, authors, publication_year, abstract, full_text, source_type, embedding, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) 
         RETURNING id`,
        [title, authors, publication_year, abstract, full_text, source_type, embedding]
      );

      return { 
        success: true, 
        message: 'Document ingested successfully',
        source_id: result.rows[0].id
      };
    } catch (error) {
      console.error('Document ingestion error:', error);
      throw new Error(`Failed to ingest document: ${error.message}`);
    }
  }

  async batchIngestDocuments(documents) {
    try {
      const results = [];
      
      for (const doc of documents) {
        try {
          const result = await this.ingestDocument(
            doc.title,
            doc.authors,
            doc.publication_year,
            doc.abstract,
            doc.full_text,
            doc.source_type
          );
          results.push({ success: true, ...result });
        } catch (error) {
          results.push({ 
            success: false, 
            error: error.message,
            document: { title: doc.title, authors: doc.authors }
          });
        }
      }

      return {
        total: documents.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };
    } catch (error) {
      console.error('Batch ingestion error:', error);
      throw new Error('Failed to batch ingest documents');
    }
  }

  async getSourceEmbedding(sourceId) {
    try {
      const result = await pool.query(
        'SELECT embedding FROM academic_sources WHERE id = $1',
        [sourceId]
      );

      if (result.rows.length === 0) {
        throw new Error('Source not found');
      }

      return result.rows[0].embedding;
    } catch (error) {
      console.error('Get source embedding error:', error);
      throw new Error('Failed to retrieve source embedding');
    }
  }
}

// Create singleton instance
const ragService = new RAGService();

// Export functions directly for easier imports
module.exports = {
  getEmbedding: (text) => ragService.getEmbedding(text),
  similaritySearch: (embedding, limit, filters) => ragService.similaritySearch(embedding, limit, filters),
  ingestDocument: (title, authors, publication_year, abstract, full_text, source_type) => 
    ragService.ingestDocument(title, authors, publication_year, abstract, full_text, source_type),
  batchIngestDocuments: (documents) => ragService.batchIngestDocuments(documents),
  getSourceEmbedding: (sourceId) => ragService.getSourceEmbedding(sourceId),
  ragService // Export the class instance for advanced usage
};