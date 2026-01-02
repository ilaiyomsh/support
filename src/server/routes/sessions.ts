import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import type { SubmitTicketResponse } from '@shared/types';
import { mondayService } from '../services/monday.service.js';
import { secureStorageService } from '../services/secure-storage.service.js';

const router = Router();

// In-memory storage for sessions (in production, use Redis or database)
interface SessionData {
  sessionId: string;
  status: 'pending' | 'recording' | 'completed' | 'error' | 'cancelled';
  videoUrl?: string;
  createdAt: number;
  completedAt?: number;
  stopRequested?: boolean; // Flag to request recording stop from agent window
  // New fields for metadata and ticket information
  description?: string;
  metadata?: any;
  linkCode?: string;
}

const sessions = new Map<string, SessionData>();

// Configure multer for file uploads
const tempDir = path.join(process.cwd(), 'public', 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, tempDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = uuidv4();
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `rec-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

// Cleanup old sessions (older than 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [sessionId, session] of sessions.entries()) {
    if (session.createdAt < oneHourAgo) {
      sessions.delete(sessionId);
      logger.info('Cleaned up old session', { sessionId });
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes

/**
 * POST /api/sessions
 * Create a new recording session
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const { description, metadata, linkCode } = req.body;
    const sessionId = uuidv4();
    const session: SessionData = {
      sessionId,
      status: 'pending',
      createdAt: Date.now(),
      description,
      metadata,
      linkCode
    };

    sessions.set(sessionId, session);

    logger.info('Session created', { 
      sessionId,
      hasDescription: !!description,
      hasMetadata: !!metadata,
      linkCode
    });

    res.json({
      success: true,
      sessionId
    });
  } catch (error: any) {
    logger.error('Error creating session', { error: error.message });
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/sessions/:sessionId
 * Get session status
 */
router.get('/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    logger.info('Get session request', { sessionId });
    
    const session = sessions.get(sessionId);

    if (!session) {
      logger.warn('Session not found', { sessionId });
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    logger.info('Session found', { 
      sessionId, 
      status: session.status,
      hasVideoUrl: !!session.videoUrl,
      createdAt: session.createdAt,
      completedAt: session.completedAt
    });

    res.json({
      success: true,
      status: session.status,
      videoUrl: session.videoUrl,
      createdAt: session.createdAt,
      completedAt: session.completedAt,
      stopRequested: session.stopRequested || false
    });
  } catch (error: any) {
    logger.error('Error getting session', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/sessions/:sessionId/status
 * Update session status (used by agent.html after upload)
 */
router.put('/:sessionId/status', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { status, videoUrl } = req.body;

    logger.info('Update session status request', { 
      sessionId, 
      status, 
      hasVideoUrl: !!videoUrl,
      videoUrl: videoUrl ? videoUrl.substring(0, 100) : undefined
    });

    const session = sessions.get(sessionId);

    if (!session) {
      logger.warn('Session not found for status update', { sessionId, requestedStatus: status });
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    logger.info('Session found, updating status', { 
      sessionId, 
      oldStatus: session.status, 
      newStatus: status 
    });

    session.status = status;
    if (videoUrl) {
      session.videoUrl = videoUrl;
    }
    if (status === 'completed') {
      session.completedAt = Date.now();
      logger.info('Session marked as completed', { sessionId, completedAt: session.completedAt });
    }

    sessions.set(sessionId, session);

    logger.info('Session status updated successfully', { 
      sessionId, 
      status: session.status, 
      hasVideoUrl: !!session.videoUrl,
      completedAt: session.completedAt
    });

    res.json({
      success: true,
      sessionId,
      status: session.status
    });
  } catch (error: any) {
    logger.error('Error updating session status', { 
      error: error.message, 
      stack: error.stack,
      sessionId: req.params.sessionId
    });
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/sessions/:sessionId/stop
 * Request to stop recording (polled by agent.html)
 */
router.post('/:sessionId/stop', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    logger.info('Stop session request', { sessionId });
    
    const session = sessions.get(sessionId);

    if (!session) {
      logger.warn('Session not found for stop request', { sessionId });
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    logger.info('Session found, setting stop requested flag', { 
      sessionId, 
      currentStatus: session.status,
      wasStopRequested: session.stopRequested || false
    });

    session.stopRequested = true;
    sessions.set(sessionId, session);

    logger.info('Stop requested for session successfully', { sessionId });

    res.json({
      success: true,
      sessionId
    });
  } catch (error: any) {
    logger.error('Error requesting stop', { 
      error: error.message, 
      stack: error.stack,
      sessionId: req.params.sessionId
    });
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/sessions/:sessionId/submit
 * Submit ticket with video file from session
 */
router.post('/:sessionId/submit', upload.single('file'), async (req: Request, res: Response<SubmitTicketResponse>) => {
  try {
    const { sessionId } = req.params;
    const { description } = req.body; // Get description from request body
    logger.info('Submit ticket request', { 
      sessionId,
      hasFile: !!req.file,
      hasDescription: !!description
    });

    // Get session data
    const session = sessions.get(sessionId);
    if (!session) {
      logger.warn('Session not found for submit', { sessionId });
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Validate required session data
    if (!session.linkCode) {
      logger.warn('Session missing linkCode', { sessionId });
      return res.status(400).json({
        success: false,
        message: 'Session missing linkCode'
      });
    }

    if (!req.file && !session.videoUrl) {
      logger.warn('Missing video file', { sessionId });
      return res.status(400).json({
        success: false,
        message: 'יש להקליט סרטון או לתאר את הבעיה'
      });
    }

    // Get link configuration
    const linkConfig = await secureStorageService.getLinkConfig(session.linkCode);
    if (!linkConfig) {
      logger.error('Link config not found', { linkCode: session.linkCode });
      return res.status(404).json({
        success: false,
        message: 'קוד יעד לא קיים או נמחק'
      });
    }

    logger.info('Link config found', {
      linkCode: session.linkCode,
      boardId: linkConfig.targetConfig.boardId,
      ownerAccountId: linkConfig.targetConfig.ownerAccountId
    });

    // Get admin token
    const adminToken = await secureStorageService.getAdminToken(linkConfig.targetConfig.ownerAccountId);
    if (!adminToken) {
      logger.error('Admin token not found', { ownerAccountId: linkConfig.targetConfig.ownerAccountId });
      return res.status(500).json({
        success: false,
        message: 'האדמין ניתק את החיבור'
      });
    }

    // Extract metadata
    const parsedMetadata = typeof session.metadata === 'string' ? JSON.parse(session.metadata) : (session.metadata || {});
    const requesterName = parsedMetadata?.requesterName || parsedMetadata?.userName || 'משתמש';
    const accountName = parsedMetadata?.accountName || 'לא ידוע';
    const sourceBoardName = parsedMetadata?.sourceBoardName || '';
    const sourceBoardUrl = parsedMetadata?.sourceBoardUrl || '';

    // Build item name
    const itemName = `${requesterName} - ${accountName}`;

    // Build column values
    const mapping = linkConfig.columnMapping;
    const columnValues: Record<string, any> = {};

    // Description - use from request body (user can edit in preview)
    if (mapping.description && description) {
      columnValues[mapping.description] = description;
    }

    // Requester Name
    if (mapping.requesterName && requesterName) {
      columnValues[mapping.requesterName] = requesterName;
    }

    // Account Name
    if (mapping.accountName && accountName) {
      columnValues[mapping.accountName] = accountName;
    }

    // Source Board Name (LINK column)
    if (mapping.sourceBoardName && sourceBoardName && sourceBoardUrl) {
      columnValues[mapping.sourceBoardName] = {
        url: sourceBoardUrl,
        text: sourceBoardName
      };
    }

    // User Email
    if (mapping.userEmail && parsedMetadata?.userEmail) {
      const userEmail = parsedMetadata.userEmail;
      columnValues[mapping.userEmail] = {
        email: userEmail,
        text: userEmail
      };
    }

    // Status
    if (mapping.status?.columnId && mapping.status?.defaultValue) {
      const statusValue = mapping.status.defaultValue;
      const isNumeric = /^\d+$/.test(statusValue);
      if (isNumeric) {
        columnValues[mapping.status.columnId] = { index: parseInt(statusValue, 10) };
      } else {
        columnValues[mapping.status.columnId] = { label: statusValue };
      }
    }

    // Create item in Monday
    const boardId = linkConfig.targetConfig.boardId;
    const itemResult = await mondayService.createItem({
      token: adminToken,
      boardId: boardId,
      itemName: itemName,
      columnValues: columnValues
    });

    logger.info('Item created successfully', { itemId: itemResult.id, boardId });

    // Upload video asynchronously
    const videoColumnId = mapping.video;
    if (req.file && videoColumnId) {
      const tempFilePath = req.file.path;
      const fileName = req.file.originalname;
      
      logger.info('Starting async video upload', { 
        itemId: itemResult.id, 
        tempFilePath,
        fileName,
        columnId: videoColumnId 
      });

      // Upload video file asynchronously (don't wait for completion)
      (async () => {
        try {
          const fileBuffer = fs.readFileSync(tempFilePath);
          
          await mondayService.uploadFile({
            token: adminToken,
            itemId: itemResult.id,
            columnId: videoColumnId,
            file: fileBuffer,
            fileName: fileName
          });

          logger.info('Video uploaded to Monday successfully', { 
            itemId: itemResult.id, 
            fileName, 
            columnId: videoColumnId 
          });

          // Delete temp file after successful upload
          if (fs.existsSync(tempFilePath)) {
            try {
              fs.unlinkSync(tempFilePath);
              logger.info('Temp video file deleted after upload', { path: tempFilePath });
            } catch (err) {
              logger.error('Failed to delete temp video file after upload', { err, path: tempFilePath });
            }
          }
        } catch (error: any) {
          logger.error('Failed to upload video to Monday', {
            error: error.message,
            itemId: itemResult.id,
            fileName,
            stack: error.stack
          });
        }
      })();
    }

    // Update session status
    session.status = 'completed';
    session.completedAt = Date.now();
    sessions.set(sessionId, session);

    // Return success
    res.json({
      success: true,
      itemId: itemResult.id,
      message: 'פנייה נשלחה בהצלחה'
    });

  } catch (error: any) {
    logger.error('Error submitting ticket from session', {
      error: error.message,
      stack: error.stack,
      sessionId: req.params.sessionId
    });
    res.status(500).json({
      success: false,
      message: `שגיאה בשליחת הפנייה: ${error.message}`
    });
  }
});

export default router;

