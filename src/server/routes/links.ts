import { Router, Request, Response } from 'express';
import type { CreateLinkRequest, CreateLinkResponse, GetLinksResponse, ValidateLinkResponse, ColumnMapping } from '@shared/types';
import { generateLinkCode, isValidLinkCode } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';
import { storageService } from '../services/storage.service.js';
import { secureStorageService, type LinkConfig } from '../services/secure-storage.service.js';

const router = Router();

// POST /api/links - Create new link
// לפי bridge_architecture.md - השרת מקבל boardId, boardName, columnMapping
router.post('/', async (req: Request<{}, CreateLinkResponse, CreateLinkRequest>, res: Response<CreateLinkResponse>) => {
  const { boardId, boardName, columnMapping, adminAccountId, formTitle, formDescription, newRequestIndicator } = req.body;

  logger.info('Create link request received', { 
    boardId,
    boardName,
    hasColumnMapping: !!columnMapping,
    hasAdminAccountId: !!adminAccountId
  });

  if (!boardId || !boardName) {
    return res.status(400).json({ success: false, linkCode: '' });
  }

  // Validation for new column mapping structure
  if (!columnMapping?.description || !columnMapping?.video) {
    logger.warn('Missing required column mapping (description and video are required)', { columnMapping });
    return res.status(400).json({ success: false, linkCode: '' });
  }

  if (!adminAccountId) {
    logger.error('Missing adminAccountId in create link request');
    return res.status(400).json({ 
      success: false, 
      linkCode: ''
    });
  }

  try {
    // Get userId from request if available (for metadata)
    const userId = (req as any).userId || adminAccountId;

    logger.info('Starting link code generation', { adminAccountId, userId });

    // Generate unique code
    let linkCode: string;
    let exists = true;
    let attempts = 0;

    // Try to generate unique code (max 10 attempts)
    while (exists && attempts < 10) {
      linkCode = generateLinkCode();
      logger.info('Generated link code, checking if unique', { linkCode, attempt: attempts + 1 });
      // Check in SecureStorage (primary) and Storage (fallback for list)
      const existing = await secureStorageService.getLinkConfig(linkCode);
      exists = existing !== null;
      if (exists) {
        logger.info('Link code already exists, generating new one', { linkCode, attempt: attempts + 1 });
      }
      attempts++;
    }

    if (exists) {
      logger.error('Failed to generate unique link code after maximum attempts', { attempts });
      return res.status(500).json({ success: false, linkCode: '' });
    }

    logger.info('Unique link code generated successfully', { linkCode: linkCode!, attempts });

    // Save link config to SecureStorage only (according to bridge_architecture.md)
    // The index (global_links_index) is managed by the client
    const linkConfig: LinkConfig = {
      targetConfig: {
        boardId: boardId,
        boardName: boardName,
        ownerAccountId: adminAccountId
      },
      columnMapping: columnMapping || {},
      formConfig: (formTitle || formDescription) ? {
        title: formTitle || undefined,
        description: formDescription || undefined
      } : undefined,
      newRequestIndicator: newRequestIndicator,
      metadata: {
        createdAt: Date.now(),
        createdByUserId: userId,
        version: 1
      }
    };

    logger.info('Preparing to save link config to SecureStorage', {
      linkCode: linkCode!,
      boardId,
      boardName,
      adminAccountId,
      hasFormConfig: !!linkConfig.formConfig,
      hasNewRequestIndicator: !!linkConfig.newRequestIndicator,
      columnMappingKeys: Object.keys(linkConfig.columnMapping),
      createdAt: linkConfig.metadata.createdAt
    });

    await secureStorageService.setLinkConfig(linkCode!, linkConfig);

    logger.info('Link created and saved to SecureStorage successfully', { 
      linkCode: linkCode!, 
      boardId,
      boardName,
      adminAccountId,
      version: linkConfig.metadata.version,
      note: 'Index (global_links_index) is managed by client'
    });

    res.json({
      success: true,
      linkCode: linkCode!
    });
  } catch (error: any) {
    logger.error('Error creating link', {
      error: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      success: false,
      linkCode: ''
    });
  }
});

// GET /api/links - Get all links
// NOTE: According to bridge_architecture.md, the index (global_links_index) is managed by the client.
// This endpoint is kept for backward compatibility but should return empty array.
// The client should use adminApi.getLinksIndex() instead.
router.get('/', async (_req: Request, res: Response<GetLinksResponse>) => {
  try {
    // Return empty array - client should use getLinksIndex() from local storage
    logger.info('GET /api/links called - returning empty (client should use getLinksIndex)');
    res.json({ links: [] });
  } catch (error: any) {
    logger.error('Error getting links', { error: error.message });
    res.json({ links: [] });
  }
});

// GET /api/links/:code - Get specific link
router.get('/:code', async (req: Request<{ code: string }>, res: Response) => {
  const { code } = req.params;

  logger.info('Get link request', { code });

  if (!isValidLinkCode(code)) {
    logger.warn('Invalid link code format in get request', { code });
    return res.status(400).json({ error: 'Invalid link code format' });
  }

  try {
    // Try SecureStorage first (primary)
    logger.info('Checking SecureStorage for link', { code });
    const linkConfig = await secureStorageService.getLinkConfig(code);
    
    if (linkConfig) {
      logger.info('Link found in SecureStorage', { 
        code, 
        boardId: linkConfig.targetConfig.boardId,
        ownerAccountId: linkConfig.targetConfig.ownerAccountId
      });
      return res.json({ link: linkConfig });
    }

    // Fallback to Storage
    logger.info('Link not found in SecureStorage, checking Storage fallback', { code });
    const link = await storageService.getLink(code);
    if (!link) {
      logger.warn('Link not found in SecureStorage or Storage', { code });
      return res.status(404).json({ error: 'Link not found' });
    }

    logger.info('Link found in Storage (fallback)', { code });
    res.json({ link });
  } catch (error: any) {
    logger.error('Error getting link', { code, error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to get link' });
  }
});

// DELETE /api/links/:code - Delete link
router.delete('/:code', async (req: Request<{ code: string }>, res: Response) => {
  const { code } = req.params;

  logger.info('Delete link request', { code });

  if (!isValidLinkCode(code)) {
    logger.warn('Invalid link code format in delete request', { code });
    return res.status(400).json({ error: 'Invalid link code format' });
  }

  try {
    // Get link config to find adminAccountId
    logger.info('Checking if link exists before deletion', { code });
    const linkConfig = await secureStorageService.getLinkConfig(code);
    
    if (!linkConfig) {
      logger.warn('Link not found for deletion', { code });
      return res.status(404).json({ error: 'Link not found' });
    }

    const adminAccountId = linkConfig.targetConfig.ownerAccountId;
    logger.info('Link found, proceeding with deletion', { 
      code, 
      adminAccountId,
      boardId: linkConfig.targetConfig.boardId
    });

    // Delete from SecureStorage only (according to bridge_architecture.md)
    // The index (global_links_index) is managed by the client
    const deletedFromSecure = await secureStorageService.deleteLinkConfig(code);
    if (!deletedFromSecure) {
      logger.error('Failed to delete from SecureStorage', { code, adminAccountId });
      return res.status(500).json({ error: 'Failed to delete link' });
    }

    logger.info('Link deleted successfully', { 
      code, 
      adminAccountId,
      note: 'Index (global_links_index) should be updated by client'
    });

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error deleting link', { code, error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to delete link' });
  }
});

// PUT /api/links/:code - Update link configuration
// לפי bridge_architecture.md - משתמש ב-boardId/boardName
router.put('/:code', async (req: Request<{ code: string }, {}, {
  boardId?: string;
  boardName?: string;
  columnMapping?: ColumnMapping;
  formTitle?: string;
  formDescription?: string;
  newRequestIndicator?: {
    enabled: boolean;
    statusColumnId: string;
    targetStatusIndex: number;
    targetStatusLabel: string;
  };
}>, res: Response) => {
  const { code } = req.params;
  const { boardId, boardName, columnMapping, formTitle, formDescription, newRequestIndicator } = req.body;

  logger.info('Update link request', { 
    code, 
    requestedUpdates: {
      hasBoardId: !!boardId,
      hasBoardName: !!boardName,
      hasColumnMapping: !!columnMapping,
      hasFormTitle: formTitle !== undefined,
      hasFormDescription: formDescription !== undefined,
      hasNewRequestIndicator: newRequestIndicator !== undefined
    }
  });

  if (!isValidLinkCode(code)) {
    logger.warn('Invalid link code format in update request', { code });
    return res.status(400).json({ error: 'Invalid link code format' });
  }

  try {
    // Get existing link config
    logger.info('Checking if link exists before update', { code });
    const existingConfig = await secureStorageService.getLinkConfig(code);
    if (!existingConfig) {
      logger.warn('Link not found for update', { code });
      return res.status(404).json({ error: 'Link not found' });
    }

    const adminAccountId = existingConfig.targetConfig.ownerAccountId;
    logger.info('Link found, proceeding with update', { 
      code, 
      adminAccountId,
      currentBoardId: existingConfig.targetConfig.boardId,
      currentVersion: existingConfig.metadata.version
    });

    // Build updated config with new structure
    const updatedConfig: LinkConfig = {
      targetConfig: {
        boardId: boardId || existingConfig.targetConfig.boardId,
        boardName: boardName || existingConfig.targetConfig.boardName,
        ownerAccountId: adminAccountId // Don't change owner
      },
      columnMapping: columnMapping || existingConfig.columnMapping,
      formConfig: (formTitle !== undefined || formDescription !== undefined) ? {
        title: formTitle !== undefined ? formTitle : existingConfig.formConfig?.title,
        description: formDescription !== undefined ? formDescription : existingConfig.formConfig?.description
      } : existingConfig.formConfig,
      newRequestIndicator: newRequestIndicator !== undefined ? newRequestIndicator : existingConfig.newRequestIndicator,
      metadata: {
        ...existingConfig.metadata,
        version: existingConfig.metadata.version + 1 // Increment version
      }
    };

    logger.info('Saving updated link config', { code, newVersion: updatedConfig.metadata.version });

    // Update in SecureStorage only (according to bridge_architecture.md)
    // The index (global_links_index) is managed by the client
    await secureStorageService.setLinkConfig(code, updatedConfig);

    logger.info('Link updated successfully', { 
      code, 
      adminAccountId,
      newVersion: updatedConfig.metadata.version,
      updates: { 
        boardId: !!boardId, 
        boardName: !!boardName, 
        columnMapping: !!columnMapping,
        formTitle: formTitle !== undefined,
        formDescription: formDescription !== undefined,
        newRequestIndicator: newRequestIndicator !== undefined
      },
      note: 'Index (global_links_index) should be updated by client'
    });

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error updating link', { code, error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to update link' });
  }
});

// GET /api/links/:code/validate - Validate link
router.get('/:code/validate', async (req: Request<{ code: string }>, res: Response<ValidateLinkResponse>) => {
  const { code } = req.params;

  // הוסף cache-control headers כדי למנוע cache
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  logger.info('Validate link request', { code });

  if (!isValidLinkCode(code)) {
    logger.warn('Invalid link code format', { code });
    return res.status(400).json({ valid: false });
  }

  try {
    // Check in SecureStorage (primary source according to bridge_architecture.md)
    const linkConfig = await secureStorageService.getLinkConfig(code);

    logger.info('Link config check result', { code, found: !!linkConfig });

    if (!linkConfig) {
      logger.warn('Link code not found in SecureStorage', { code });
      return res.json({ valid: false });
    }

    logger.info('Link code found', { code, boardId: linkConfig.targetConfig.boardId });

    // Get admin info for adminName
    const admin = await secureStorageService.getAdmin(linkConfig.targetConfig.ownerAccountId);
    logger.info('Admin lookup result', { 
      accountId: linkConfig.targetConfig.ownerAccountId, 
      found: !!admin 
    });
    
    const adminName = admin?.userName || admin?.accountName || 'Admin';

    logger.info('Link validation successful', { code, adminName });
    
    res.json({
      valid: true,
      adminName
    });
  } catch (error: any) {
    logger.error('Error validating link', { code, error: error.message, stack: error.stack });
    res.json({ valid: false });
  }
});

export default router;

