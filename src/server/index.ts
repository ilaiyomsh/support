// Load environment variables from .env file
import 'dotenv/config';

import express, { Express } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import apiRouter from './routes/index.js';
import { logger } from './utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();
const PORT = process.env.PORT || 8301;

// Middleware
app.use(cors({
  origin: true, // Allow all origins (needed for Monday.com iframe)
  credentials: true // Allow cookies to be sent
}));
app.use(cookieParser());

// הוסף middleware להגדרת headers עבור Client App
app.use('/client', (_req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'display-capture=(self)');
  next();
});

// Don't use express.json() globally - it interferes with multer
// Add it only to routes that need it (but NOT for /api/upload)
app.use((req, res, next) => {
  // Skip JSON parsing for upload routes
  if (req.path.startsWith('/api/upload')) {
    return next();
  }
  express.json({ limit: '10mb' })(req, res, next);
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// API Routes
app.use(apiRouter);

// Static files for shared assets (tokens, etc.)
app.use('/tokens', express.static(path.join(__dirname, '../../public/tokens')));

// Static files for temp uploads (recordings)
app.use('/temp', express.static(path.join(__dirname, '../../public/temp')));

// Static files for Admin App
app.use('/admin', express.static(path.join(__dirname, '../../public/admin'), { index: 'index.html' }));

// SPA fallback for Admin App - handle /admin route (redirect to /admin/)
app.get('/admin', (_req, res) => {
  res.redirect('/admin/');
});

// SPA fallback for Admin App - handle all other routes
app.get('/admin/*splat', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../public/admin/index.html'));
});

// Static files from the root public directory (for shared chunks, assets, etc.)
app.use(express.static(path.join(__dirname, '../../public')));

// Static files for Client App
app.use('/client', express.static(path.join(__dirname, '../../public/client'), { index: 'index.html' }));

// Routes for specific static files that should NOT be handled by SPA
app.get('/client/recorder.html', (_req, res) => {
  const filePath = path.join(__dirname, '../../public/client/recorder.html');
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error sending recorder.html:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
});

app.get('/client/agent.html', (_req, res) => {
  const filePath = path.join(__dirname, '../../public/client/agent.html');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'display-capture=(self)');
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error sending agent.html:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  });
});

app.get('/client/db.js', (_req, res) => {
  const filePath = path.join(__dirname, '../../public/client/db.js');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error sending db.js:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  });
});

app.get('/client/RecordRTC.js', (_req, res) => {
  const filePath = path.join(__dirname, '../../public/client/RecordRTC.js');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error sending RecordRTC.js:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  });
});

// SPA fallback for Client App - handle /client route (redirect to /client/)
app.get('/client', (_req, res) => {
  res.redirect('/client/');
});

// SPA fallback for Client App - handle all other routes (but not the static files above)
app.get('/client/*splat', (req, res) => {
  const staticFiles = ['/client/recorder.html', '/client/agent.html', '/client/db.js', '/client/RecordRTC.js'];
  if (staticFiles.includes(req.path)) {
    return res.sendFile(path.join(__dirname, `../../public${req.path}`));
  }
  res.sendFile(path.join(__dirname, '../../public/client/index.html'));
});

// Default route
app.get('/', (_req, res) => {
  res.json({
    message: 'Support App Server',
    endpoints: {
      admin: '/admin',
      client: '/client',
      api: '/api/(.*)',
      health: '/health'
    }
  });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error in Express middleware', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    statusCode: err.statusCode || 500
  });
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  logger.info('Server started successfully', {
    port: PORT,
    adminApp: `http://localhost:${PORT}/admin`,
    clientApp: `http://localhost:${PORT}/client`
  });
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Admin App: http://localhost:${PORT}/admin`);
  console.log(`Client App: http://localhost:${PORT}/client`);
});
