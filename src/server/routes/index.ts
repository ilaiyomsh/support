import { Router } from 'express';
import oauthRouter from './oauth.js';
import linksRouter from './links.js';
import ticketsRouter from './tickets.js';
import configRouter from './config.js';
import uploadRouter from './upload.js';
import sessionsRouter from './sessions.js';

const router = Router();

router.use('/oauth', oauthRouter);
router.use('/api/links', linksRouter);
router.use('/api/tickets', ticketsRouter);
router.use('/api/config', configRouter);
router.use('/api/upload', uploadRouter);
router.use('/api/sessions', sessionsRouter);

export default router;

