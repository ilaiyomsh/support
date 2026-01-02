import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Plugin to move HTML files to correct location after build
const moveHtmlPlugin = () => {
  return {
    name: 'move-html',
    buildStart() {
      const filesToCopy = ['recorder.html', 'agent.html', 'db.js', 'RecordRTC.js'];

      filesToCopy.forEach(file => {
        const src = path.resolve(__dirname, `src/client/client/public/${file}`);
        const dest = path.resolve(__dirname, `public/client/${file}`);

        if (fs.existsSync(src)) {
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.copyFileSync(src, dest);
          console.log(`[moveHtmlPlugin] Copied ${file} to public/client/`);
        }
      });
    },
    closeBundle() {
      const adminHtmlSrc = path.resolve(__dirname, 'public/src/client/admin/index.html');
      const clientHtmlSrc = path.resolve(__dirname, 'public/src/client/client/index.html');
      const adminHtmlDest = path.resolve(__dirname, 'public/admin/index.html');
      const clientHtmlDest = path.resolve(__dirname, 'public/client/index.html');

      if (fs.existsSync(adminHtmlSrc)) {
        fs.mkdirSync(path.dirname(adminHtmlDest), { recursive: true });
        fs.renameSync(adminHtmlSrc, adminHtmlDest);
        try { fs.rmdirSync(path.dirname(adminHtmlSrc), { recursive: true }); } catch { }
      }

      if (fs.existsSync(clientHtmlSrc)) {
        fs.mkdirSync(path.dirname(clientHtmlDest), { recursive: true });
        fs.renameSync(clientHtmlSrc, clientHtmlDest);
        try { fs.rmdirSync(path.dirname(clientHtmlSrc), { recursive: true }); } catch { }
      }

      // Ensure assets are in place
      const filesToCopy = ['recorder.html', 'agent.html', 'db.js', 'RecordRTC.js'];
      filesToCopy.forEach(file => {
        const src = path.resolve(__dirname, `src/client/client/public/${file}`);
        const dest = path.resolve(__dirname, `public/client/${file}`);
        if (fs.existsSync(src) && !fs.existsSync(dest)) {
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.copyFileSync(src, dest);
        }
      });
    },
  };
};

export default defineConfig({
  plugins: [react(), moveHtmlPlugin()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        admin: path.resolve(__dirname, 'src/client/admin/index.html'),
        client: path.resolve(__dirname, 'src/client/client/index.html'),
        // הסר את recorder.html מה-input - הוא לא צריך build
      },
      output: {
        dir: 'public',
        entryFileNames: '[name]/[name].js',
        chunkFileNames: '[name]/[name]-[hash].js',
        assetFileNames: '[name]/[hash][extname]',
      },
    },
    outDir: 'public',
    sourcemap: true,
  },
  server: {
    middlewareMode: false,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Permissions-Policy': 'display-capture=(self)',
    },
  },
});

