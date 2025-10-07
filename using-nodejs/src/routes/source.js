const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../config/database');
const { getEmbedding, similaritySearch, ingestDocument } = require('../services/ragService');

const router = express.Router();

// Search academic sources via RAG
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      query, 
      limit = 10, 
      source_type, 
      min_year, 
      max_year,
      min_similarity = 0.7 
    } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Get embedding for the query
    const queryEmbedding = await getEmbedding(query);

    // Perform similarity search with filters
    let sources = await similaritySearch(queryEmbedding, parseInt(limit));

    // Apply additional filters
    if (source_type) {
      sources = sources.filter(source => 
        source.source_type === source_type
      );
    }

    if (min_year) {
      sources = sources.filter(source => 
        source.publication_year >= parseInt(min_year)
      );
    }

    if (max_year) {
      sources = sources.filter(source => 
        source.publication_year <= parseInt(max_year)
      );
    }

    // Filter by similarity threshold
    sources = sources.filter(source => 
      source.similarity >= parseFloat(min_similarity)
    );

    res.json({
      query,
      filters: {
        source_type,
        min_year,
        max_year,
        min_similarity
      },
      results: sources,
      count: sources.length
    });

  } catch (error) {
    console.error('Source search error:', error);
    res.status(500).json({ error: 'Internal server error during source search' });
  }
});

// Get source by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const sourceId = req.params.id;

    const result = await pool.query(
      `SELECT 
        id,
        title,
        authors,
        publication_year,
        abstract,
        full_text,
        source_type,
        created_at
       FROM academic_sources 
       WHERE id = $1`,
      [sourceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Source not found' });
    }

    const source = result.rows[0];

    res.json({
      source: {
        id: source.id,
        title: source.title,
        authors: source.authors,
        publication_year: source.publication_year,
        abstract: source.abstract,
        full_text: source.full_text,
        source_type: source.source_type,
        created_at: source.created_at
      }
    });

  } catch (error) {
    console.error('Source retrieval error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new academic source (admin functionality)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { 
      title, 
      authors, 
      publication_year, 
      abstract, 
      full_text, 
      source_type 
    } = req.body;

    // Validation
    if (!title || !authors || !publication_year || !source_type) {
      return res.status(400).json({ 
        error: 'Title, authors, publication year, and source type are required' 
      });
    }

    const allowedSourceTypes = ['paper', 'textbook', 'course_material'];
    if (!allowedSourceTypes.includes(source_type)) {
      return res.status(400).json({ 
        error: 'Source type must be one of: paper, textbook, course_material' 
      });
    }

    // Ingest document into RAG system
    const ingestionResult = await ingestDocument(
      title,
      authors,
      publication_year,
      abstract,
      full_text,
      source_type
    );

    res.status(201).json({
      message: 'Academic source added successfully',
      source: {
        title,
        authors,
        publication_year,
        source_type,
        abstract: abstract || null,
        full_text: full_text || null
      }
    });

  } catch (error) {
    console.error('Source creation error:', error);
    res.status(500).json({ error: 'Internal server error during source creation' });
  }
});

// Get similar sources based on an existing source
router.get('/:id/similar', authenticateToken, async (req, res) => {
  try {
    const sourceId = req.params.id;
    const { limit = 5 } = req.query;

    // Get the source's embedding
    const sourceResult = await pool.query(
      'SELECT embedding FROM academic_sources WHERE id = $1',
      [sourceId]
    );

    if (sourceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Source not found' });
    }

    const sourceEmbedding = sourceResult.rows[0].embedding;

    if (!sourceEmbedding) {
      return res.status(400).json({ error: 'Source does not have an embedding' });
    }

    // Find similar sources (excluding the source itself)
    const similarSources = await similaritySearch(sourceEmbedding, parseInt(limit) + 1);
    
    // Filter out the source itself
    const filteredSources = similarSources.filter(source => source.id !== parseInt(sourceId));
    const finalSources = filteredSources.slice(0, parseInt(limit));

    res.json({
      source_id: sourceId,
      similar_sources: finalSources,
      count: finalSources.length
    });

  } catch (error) {
    console.error('Similar sources error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get source statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_sources,
        COUNT(DISTINCT source_type) as unique_source_types,
        AVG(publication_year) as avg_publication_year,
        MIN(publication_year) as min_publication_year,
        MAX(publication_year) as max_publication_year,
        source_type,
        COUNT(*) as type_count
      FROM academic_sources 
      GROUP BY source_type
    `);

    const typeStats = statsResult.rows;
    const totalStats = {
      total_sources: parseInt(typeStats.reduce((sum, stat) => sum + parseInt(stat.type_count), 0)),
      unique_source_types: typeStats.length,
      avg_publication_year: typeStats[0] ? Math.round(typeStats[0].avg_publication_year) : 0,
      min_publication_year: typeStats[0] ? parseInt(typeStats[0].min_publication_year) : 0,
      max_publication_year: typeStats[0] ? parseInt(typeStats[0].max_publication_year) : 0,
      distribution_by_type: typeStats.map(stat => ({
        source_type: stat.source_type,
        count: parseInt(stat.type_count),
        percentage: Math.round((parseInt(stat.type_count) / typeStats.reduce((sum, s) => sum + parseInt(s.type_count), 0)) * 100)
      }))
    };

    res.json(totalStats);

  } catch (error) {
    console.error('Source statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Batch search for multiple queries
router.post('/batch-search', authenticateToken, async (req, res) => {
  try {
    const { queries, limit_per_query = 3 } = req.body;

    if (!queries || !Array.isArray(queries)) {
      return res.status(400).json({ error: 'Queries array is required' });
    }

    const batchResults = [];

    for (const query of queries) {
      if (query.trim()) {
        const queryEmbedding = await getEmbedding(query);
        const sources = await similaritySearch(queryEmbedding, parseInt(limit_per_query));
        
        batchResults.push({
          query,
          results: sources
        });
      }
    }

    res.json({
      batch_search: batchResults,
      total_queries: batchResults.length
    });

  } catch (error) {
    console.error('Batch search error:', error);
    res.status(500).json({ error: 'Internal server error during batch search' });
  }
});

// Get source types
router.get('/meta/types', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT source_type, COUNT(*) as count 
      FROM academic_sources 
      GROUP BY source_type 
      ORDER BY count DESC
    `);

    res.json({
      source_types: result.rows.map(row => ({
        type: row.source_type,
        count: parseInt(row.count)
      }))
    });

  } catch (error) {
    console.error('Source types error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get publication years range
router.get('/meta/years-range', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        MIN(publication_year) as min_year,
        MAX(publication_year) as max_year
      FROM academic_sources
      WHERE publication_year IS NOT NULL
    `);

    res.json({
      years_range: {
        min: result.rows[0] ? parseInt(result.rows[0].min_year) : null,
        max: result.rows[0] ? parseInt(result.rows[0].max_year) : null
      }
    });

  } catch (error) {
    console.error('Years range error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;