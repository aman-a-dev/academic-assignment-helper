const express = require('express');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../config/database');
const axios = require('axios');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and Word documents are allowed'), false);
    }
  }
});

// Upload assignment
router.post('/', authenticateToken, upload.single('assignment'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let extractedText = '';

    // Extract text based on file type
    if (req.file.mimetype === 'application/pdf') {
      const pdfData = await pdfParse(req.file.buffer);
      extractedText = pdfData.text;
    } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      extractedText = result.value;
    }

    if (!extractedText.trim()) {
      return res.status(400).json({ error: 'Could not extract text from the document' });
    }

    // Save assignment to database
    const assignmentResult = await pool.query(
      `INSERT INTO assignments (student_id, filename, original_text, uploaded_at) 
       VALUES ($1, $2, $3, NOW()) RETURNING id`,
      [req.user.id, req.file.originalname, extractedText]
    );

    const assignmentId = assignmentResult.rows[0].id;

    // Trigger n8n workflow
    try {
      await axios.post(process.env.N8N_WEBHOOK_URL, {
        assignment_id: assignmentId,
        student_id: req.user.id,
        filename: req.file.originalname,
        text_content: extractedText,
        file_buffer: req.file.buffer.toString('base64')
      });
    } catch (n8nError) {
      console.error('n8n webhook error:', n8nError);
      // Continue even if n8n fails - we can process later
    }

    res.status(202).json({
      message: 'Assignment uploaded successfully',
      job_id: assignmentId,
      text_extracted: true
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Internal server error during upload' });
  }
});

module.exports = router;