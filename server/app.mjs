import express from 'express';
import compression from 'compression';
import cors from 'cors';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getCatalog, getHealth } from './store.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');

export const app = express();
app.disable('x-powered-by');
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '64kb' }));

app.get('/api/health', async (_req, res, next) => {
  try {
    res.json(await getHealth());
  } catch (error) {
    next(error);
  }
});

app.get('/api/models', async (req, res, next) => {
  try {
    const catalog = await getCatalog({ force: req.query.refresh === '1' });
    res.set('Cache-Control', 'no-store');
    res.json(catalog);
  } catch (error) {
    next(error);
  }
});

app.use(
  express.static(distDir, {
    index: false,
    setHeaders: (res, filePath) => {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }),
);

if (existsSync(distDir)) {
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((error, _req, res, _next) => {
  console.error(`[api] ${error.message}`);
  res.status(503).json({
    error: 'catalog_unavailable',
    message: 'Could not load the model catalog from any source or the local snapshots.',
  });
});
