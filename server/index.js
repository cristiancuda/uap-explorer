import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import sightingsRouter from './routes/sightings.js';
import statsRouter from './routes/stats.js';
import yearlyCountsRouter from './routes/yearlyCounts.js';
import timelineRouter from './routes/timeline.js';
import aaroCasesRouter from './routes/aaroCases.js';
import militaryBasesRouter from './routes/militaryBases.js';
import insightsRouter from './routes/insights.js';
import chatRouter from './routes/chat.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/sightings', sightingsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/yearly-counts', yearlyCountsRouter);
app.use('/api/timeline', timelineRouter);
app.use('/api/aaro-cases', aaroCasesRouter);
app.use('/api/military-bases', militaryBasesRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/chat', chatRouter);

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// Serve React frontend
app.use(express.static(path.join(__dirname, '../dist')));

// All non-API routes return the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const server = app.listen(PORT, () => {
  console.log(`UAP Explorer API — http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the existing server first.`);
    process.exit(1);
  }
  throw err;
});
