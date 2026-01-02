import { Router, Request, Response } from 'express';
import type { SubmitTicketResponse } from '@shared/types';
import { mondayService } from '../services/monday.service.js';
import { secureStorageService } from '../services/secure-storage.service.js';
import { logger } from '../utils/logger.js';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Configure multer for temp storage
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

router.post('/', upload.single('file'), async (req: Request, res: Response<SubmitTicketResponse>) => {
  try {
    logger.info('Ticket submission received', {
      body: req.body,
      hasFile: !!req.file,
      hasVideoUrl: !!req.body.videoUrl
    });

    const { linkCode, description, videoUrl, metadata } = req.body;

    if (!description && !req.file && !req.body.videoUrl) {
      logger.warn('Missing required field: description or video');
      return res.status(400).json({
        success: false,
        message: 'יש להקליט סרטון או לתאר את הבעיה'
      });
    }

    if (!linkCode) {
      logger.warn('Missing required field: linkCode');
      return res.status(400).json({
        success: false,
        message: 'Missing required field: linkCode'
      });
    }

    // 1. שליפת קונפיגורציה מ-SecureStorage (כמו במסמך)
    const linkConfig = await secureStorageService.getLinkConfig(linkCode);

    if (!linkConfig) {
      logger.error('Link config not found', { linkCode });
      return res.status(404).json({
        success: false,
        message: 'קוד יעד לא קיים או נמחק'
      });
    }

    logger.info('Link config found', {
      linkCode,
      boardId: linkConfig.targetConfig.boardId,
      ownerAccountId: linkConfig.targetConfig.ownerAccountId
    });

    // 2. שליפת טוקן אדמין (כמו במסמך: token_{ownerAccountId})
    const adminToken = await secureStorageService.getAdminToken(linkConfig.targetConfig.ownerAccountId);

    if (!adminToken) {
      logger.error('Admin token not found', { ownerAccountId: linkConfig.targetConfig.ownerAccountId });
      return res.status(500).json({
        success: false,
        message: 'האדמין ניתק את החיבור'
      });
    }

    // ✅ לוג להדפסת הטוקן (ללא הצגת כל הטוקן)
    logger.info('Admin token retrieved', {
      ownerAccountId: linkConfig.targetConfig.ownerAccountId,
      tokenLength: adminToken.length,
      tokenPrefix: adminToken.substring(0, 20) + '...',
      tokenType: typeof adminToken
    });

    // 3. ביצוע פעולה עם הטוקן
    const boardId = linkConfig.targetConfig.boardId;
    const mapping = linkConfig.columnMapping;

    // Extract metadata fields
    const parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : (metadata || {});
    const requesterName = parsedMetadata?.requesterName || parsedMetadata?.userName || 'משתמש';
    const accountName = parsedMetadata?.accountName || 'לא ידוע';
    const sourceBoardName = parsedMetadata?.sourceBoardName || '';
    const sourceBoardUrl = parsedMetadata?.sourceBoardUrl || '';

    // Build item name according to bridge_architecture.md: ${requesterName} - ${accountName}
    const itemName = `${requesterName} - ${accountName}`;

    // Build column values based on mapping
    const columnValues: Record<string, any> = {};

    // Description (required)
    if (mapping.description && description) {
      columnValues[mapping.description] = description;
    }

    // Requester Name (optional)
    if (mapping.requesterName && requesterName) {
      columnValues[mapping.requesterName] = requesterName;
    }

    // Account Name (optional)
    if (mapping.accountName && accountName) {
      columnValues[mapping.accountName] = accountName;
    }

    // Source Board Name (optional) - עמודת LINK
    if (mapping.sourceBoardName && sourceBoardName && sourceBoardUrl) {
      columnValues[mapping.sourceBoardName] = {
        url: sourceBoardUrl,
        text: sourceBoardName
      };
    }

    // User Email (optional)
    if (mapping.userEmail && parsedMetadata?.userEmail) {
      const userEmail = parsedMetadata.userEmail;
      // Monday API expects: { email: "...", text: "..." }
      columnValues[mapping.userEmail] = {
        email: userEmail,
        text: userEmail  // Display text can be the email itself
      };
    }

    // Status (optional - with default value)
    // Monday API מצפה ל-status column בפורמט: {"label": "New"} או {"index": 0}
    if (mapping.status?.columnId && mapping.status?.defaultValue) {
      // אם ה-defaultValue הוא מספר, נשתמש ב-index, אחרת ב-label
      const statusValue = mapping.status.defaultValue;
      const isNumeric = /^\d+$/.test(statusValue);

      if (isNumeric) {
        // אם זה מספר, נשתמש ב-index
        columnValues[mapping.status.columnId] = { index: parseInt(statusValue, 10) };
      } else {
        // אחרת, נשתמש ב-label
        columnValues[mapping.status.columnId] = { label: statusValue };
      }
    }

    logger.info('Creating item with dynamic values', {
      boardId,
      itemName,
      hasVideo: !!(req.file || videoUrl),
      hasDescription: !!mapping.description,
      columnValuesCount: Object.keys(columnValues).length
    });

    // 4. Create Item in Monday (Step 1)
    const itemResult = await mondayService.createItem({
      token: adminToken,
      boardId: boardId,
      itemName: itemName,
      columnValues: columnValues
    });

    logger.info('Item created successfully', { itemId: itemResult.id, boardId });

    // 4. Upload Video asynchronously (Step 2) - don't wait for it
    const videoColumnId = mapping.video;
    if ((req.file || videoUrl) && videoColumnId) {
      // Prepare file data
      let fileBuffer: Buffer | null = null;
      let fileName: string | null = null;
      let tempFilePath: string | null = null;

      if (req.file) {
        // Video uploaded directly with this request
        tempFilePath = req.file.path;
        fileBuffer = fs.readFileSync(tempFilePath);
        fileName = req.file.originalname;
      } else if (videoUrl) {
        // Video URL provided (already uploaded to /temp)
        // Extract filename from URL (e.g., /temp/rec-xxx.webm -> rec-xxx.webm)
        const urlPath = videoUrl.startsWith('/') ? videoUrl : `/${videoUrl}`;
        const filename = path.basename(urlPath);
        tempFilePath = path.join(tempDir, filename);

        if (!fs.existsSync(tempFilePath)) {
          logger.warn('Video file not found at path', { videoFilePath: tempFilePath, videoUrl });
          // Don't throw - continue without video
        } else {
          fileBuffer = fs.readFileSync(tempFilePath);
          fileName = filename;
        }
      }

      // Upload file asynchronously (don't block the response)
      if (fileBuffer && fileName) {
        mondayService.uploadFile({
          token: adminToken,
          itemId: itemResult.id,
          columnId: videoColumnId,
          file: fileBuffer,
          fileName: fileName
        })
          .then(() => {
            logger.info('Video uploaded to Monday successfully', { itemId: itemResult.id, fileName, columnId: videoColumnId });

            // Cleanup temp file after successful upload
            if (tempFilePath && fs.existsSync(tempFilePath)) {
              try {
                fs.unlinkSync(tempFilePath);
                logger.info('Temp video file deleted after upload', { path: tempFilePath });
              } catch (err) {
                logger.error('Failed to delete temp video file after upload', { err, path: tempFilePath });
              }
            }
          })
          .catch((error) => {
            logger.error('Failed to upload video to Monday', {
              error: error.message,
              itemId: itemResult.id,
              fileName
            });
            // Don't throw - item was created successfully
          });
      }
    }

    // Return success immediately (video upload happens in background)
    res.json({
      success: true,
      itemId: itemResult.id,
      message: 'פנייה נשלחה בהצלחה'
    });

  } catch (error: any) {
    logger.error('Error submitting ticket', {
      error: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      success: false,
      message: `שגיאה בשליחת הפנייה: ${error.message}`
    });
  } finally {
    // Note: Temp files are now cleaned up after async upload completes
    // Only cleanup if upload failed or was skipped
    // (Most temp files are cleaned up in the async upload promise)
  }
});

export default router;

