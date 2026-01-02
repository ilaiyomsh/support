import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

const router = Router();

// הגדרת תיקיית טמפ
const tempDir = path.join(process.cwd(), 'public', 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// קונפיגורציית Multer לשמירה בדיסק
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, tempDir);
  },
  filename: (_req, file, cb) => {
    // יצירת שם קובץ ייחודי עם הסיומת המקורית
    const uniqueSuffix = uuidv4();
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `rec-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 } // מגבלה של 500MB
});

// Error handler for multer
const handleMulterError = (err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err) {
    logger.error('Multer upload error', { 
      error: err.message,
      code: err.code,
      field: err.field,
      name: err.name
    });
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false, 
        message: 'File too large. Maximum size is 500MB' 
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: `Upload error: ${err.message}` 
    });
  }
  next();
};

// POST /api/upload/temp
// Supports optional sessionId query parameter
router.post('/temp', upload.single('file'), handleMulterError, (req: Request, res: Response) => {
  try {
    if (!req.file) {
      logger.warn('No file in upload request');
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const sessionId = req.query.sessionId as string | undefined;

    logger.info('Temp file uploaded', { 
      filename: req.file.filename, 
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path,
      sessionId
    });

    // החזרת URL פומבי לקובץ
    const publicUrl = `/temp/${req.file.filename}`;
    
    res.json({
      success: true,
      url: publicUrl,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      sessionId
    });

  } catch (error: any) {
    logger.error('Upload temp error', { 
      error: error.message,
      stack: error.stack 
    });
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
