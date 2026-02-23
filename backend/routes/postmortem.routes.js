const express = require('express');
const router = express.Router();
const { generatePostMortem } = require('../lib/postmortem-generator');
const { publishPostMortem } = require('../lib/postmortem-publisher');
const { requireAuth } = require('../auth/middleware');
const fs = require('fs').promises;
const path = require('path');

// Get aiLogs from parent scope (will be injected)
let aiLogs = [];

// Middleware to inject aiLogs
router.use((req, res, next) => {
  if (req.app.locals.aiLogs) {
    aiLogs = req.app.locals.aiLogs;
  }
  next();
});

/**
 * POST /api/postmortem/generate
 * Generate post-mortem for an incident
 */
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { incidentId, options = {} } = req.body;
    
    // Validate incident ID
    if (!incidentId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_INCIDENT_ID',
          message: 'Incident ID is required'
        }
      });
    }
    
    // Find incident in aiLogs - normalize types for comparison
    const incident = aiLogs.find(log => Number(log.id) === Number(incidentId));
    
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INCIDENT_NOT_FOUND',
          message: `Incident with ID ${incidentId} not found`
        }
      });
    }
    
    console.log(`[PostMortem API] Generating post-mortem for incident ${incidentId}`);
    
    // Generate post-mortem
    const postmortem = await generatePostMortem(incident, options);
    
    // Publish to all configured targets
    const publishingStatus = await publishPostMortem(postmortem, incident);
    
    console.log(`[PostMortem API] Post-mortem generated successfully for incident ${incidentId}`);
    
    // Return only filename, not absolute path
    const filename = publishingStatus.file?.path ? path.basename(publishingStatus.file.path) : null;
    
    res.json({
      success: true,
      postmortem: {
        markdown: postmortem.markdown,
        filePath: filename,
        metadata: {
          incidentId: postmortem.incidentId,
          generatedAt: postmortem.generatedAt,
          sections: postmortem.metadata.sections,
          wordCount: postmortem.metadata.wordCount,
          estimatedReadTime: postmortem.metadata.estimatedReadTime
        }
      },
      publishing: {
        ...publishingStatus,
        file: publishingStatus.file ? { success: publishingStatus.file.success, filename } : undefined
      }
    });
  } catch (error) {
    console.error('[PostMortem API] Generation error:', error.message);
    
    // Determine appropriate status code
    let statusCode = 500;
    let errorCode = 'GENERATION_FAILED';
    
    if (error.message.includes('timeout')) {
      statusCode = 504;
      errorCode = 'LLAMA_TIMEOUT';
    } else if (error.message.includes('rate limit')) {
      statusCode = 429;
      errorCode = 'RATE_LIMIT_EXCEEDED';
    } else if (error.message.includes('unavailable')) {
      statusCode = 503;
      errorCode = 'SERVICE_UNAVAILABLE';
    } else if (error.message.includes('required')) {
      statusCode = 400;
      errorCode = 'INVALID_INCIDENT_DATA';
    }
    
    res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: error.message,
        // Only include stack trace in development
        ...(process.env.NODE_ENV === 'development' && { details: error.stack })
      }
    });
  }
});

/**
 * GET /api/postmortem/list
 * List all generated post-mortems
 */
router.get('/list', requireAuth, async (req, res) => {
  try {
    const dir = path.join(process.cwd(), 'sentinel-postmortems');
    
    // Check if directory exists
    try {
      await fs.access(dir);
    } catch {
      return res.json({ postmortems: [] });
    }
    
    // Read directory
    const files = await fs.readdir(dir);
    
    // Filter markdown files and get metadata
    const postmortems = await Promise.all(
      files
        .filter(file => file.endsWith('.md') && file !== '.gitkeep')
        .map(async (filename) => {
          const filepath = path.join(dir, filename);
          const stats = await fs.stat(filepath);
          
          return {
            filename,
            path: filepath,
            createdAt: stats.birthtime.toISOString(),
            size: stats.size
          };
        })
    );
    
    // Sort by creation date (newest first)
    postmortems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({ postmortems });
  } catch (error) {
    console.error('[PostMortem API] List error:', error.message);
    res.status(500).json({
      success: false,
      error: {
        code: 'LIST_FAILED',
        message: error.message
      }
    });
  }
});

/**
 * GET /api/postmortem/:filename
 * Get specific post-mortem content
 */
router.get('/:filename', requireAuth, async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Validate filename
    if (!filename || !filename.endsWith('.md')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILENAME',
          message: 'Invalid filename format'
        }
      });
    }
    
    // Prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILENAME',
          message: 'Invalid filename format'
        }
      });
    }
    
    const filepath = path.join(process.cwd(), 'sentinel-postmortems', filename);
    
    // Check if file exists
    try {
      await fs.access(filepath);
    } catch {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: `Post-mortem file ${filename} not found`
        }
      });
    }
    
    // Read file
    const content = await fs.readFile(filepath, 'utf-8');
    const stats = await fs.stat(filepath);
    
    res.json({
      filename,
      content,
      metadata: {
        createdAt: stats.birthtime.toISOString(),
        size: stats.size
      }
    });
  } catch (error) {
    console.error('[PostMortem API] Get error:', error.message);
    res.status(500).json({
      success: false,
      error: {
        code: 'READ_FAILED',
        message: error.message
      }
    });
  }
});

module.exports = router;
