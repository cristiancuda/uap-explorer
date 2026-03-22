import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import sightingsRouter from './routes/sightings.js';
import statsRouter from './routes/stats.js';
import timelineRouter from './routes/timeline.js';
import aaroCasesRouter from './routes/aaroCases.js';
import militaryBasesRouter from './routes/militaryBases.js';
import insightsRouter from './routes/insights.js';
import chatRouter from './routes/chat.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ['http://localhost:3000', 'http://127.0.0.1:3000'] }));
app.use(express.json());

app.use('/api/sightings', sightingsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/timeline', timelineRouter);
app.use('/api/aaro-cases', aaroCasesRouter);
app.use('/api/military-bases', militaryBasesRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/chat', chatRouter);

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`UAP Explorer API — http://localhost:${PORT}`);
});
