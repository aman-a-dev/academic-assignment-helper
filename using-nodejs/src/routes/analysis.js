const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../config/database');

const router = express.Router();

// Get analysis results
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const analysisId = req.params.id;

    const result = await pool.query(
      `SELECT ar.*, a.filename, a.original_text, a.topic, a.academic_level
       FROM analysis_results ar
       JOIN assignments a ON ar.assignment_id = a.id
       WHERE ar.id = $1 AND a.student_id = $2`,
      [analysisId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    const analysis = result.rows[0];

    res.json({
      id: analysis.id,
      assignment_id: analysis.assignment_id,
      filename: analysis.filename,
      topic: analysis.topic,
      academic_level: analysis.academic_level,
      suggested_sources: analysis.suggested_sources,
      plagiarism_score: analysis.plagiarism_score,
      flagged_sections: analysis.flagged_sections,
      research_suggestions: analysis.research_suggestions,
      citation_recommendations: analysis.citation_recommendations,
      confidence_score: analysis.confidence_score,
      analyzed_at: analysis.analyzed_at
    });

  } catch (error) {
    console.error('Analysis retrieval error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;