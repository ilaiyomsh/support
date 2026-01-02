import { Router, Request, Response } from 'express';
import type { ConnectRequest, ConnectResponse, ConnectionStatus } from '@shared/types';
import { isValidLinkCode } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';

const router = Router();

// POST /api/config/connect - Connect client
router.post('/connect', (req: Request<{}, ConnectResponse, ConnectRequest>, res: Response<ConnectResponse>) => {
  const { linkCode, instanceId } = req.body;
  
  logger.info('Client connection request received', { 
    linkCode, 
    instanceId,
    hasLinkCode: !!linkCode,
    hasInstanceId: !!instanceId
  });
  
  if (!linkCode || !instanceId) {
    logger.warn('Client connection request missing required fields', { 
      hasLinkCode: !!linkCode, 
      hasInstanceId: !!instanceId 
    });
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: linkCode, instanceId'
    });
  }
  
  if (!isValidLinkCode(linkCode)) {
    logger.warn('Invalid link code format in connection request', { linkCode });
    return res.status(400).json({
      success: false,
      error: 'Invalid link code format'
    });
  }
  
  logger.info('Client connection request validated successfully', { linkCode, instanceId });
  
  res.json({
    success: true,
    adminName: 'Test Admin'
  });
  
  logger.info('Client connection response sent', { linkCode, instanceId });
});

// GET /api/config/status - Get connection status
router.get('/status', (_req: Request, res: Response<ConnectionStatus>) => {
  logger.info('Connection status check requested');
  
  res.json({
    connected: false
  });
  
  logger.info('Connection status response sent', { connected: false });
});

export default router;

