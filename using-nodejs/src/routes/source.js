const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../config/database');
const { getEmbedding, similaritySearch } = require('../services/ragService');

const router = express.Router();

// Search academic sources via RAG
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Get embedding for the query
    const queryEmbedding = await getEmbedding(query);

    // Perform similarity search
    const sources = await similaritySearch(queryEmbedding, parseInt(limit));

    res.json({
      query,
      results: sources,
      count: sources.length
    });

  } catch (error) {
    console.error('Source search error:', error);
    res.status(500).json({ error: 'Internal server error during source search' });
  }
});

module.exports = router;