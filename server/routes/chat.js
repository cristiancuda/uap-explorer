import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();
const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

const SYSTEM_PROMPT = `You are a UAP/UFO data analyst assistant embedded in an interactive sighting explorer.
You have access to the NUFORC database (~147,000 sightings from 1906–2024) and AARO public records.

Current filter state: {FILTER_STATE}
Visible sightings count: {COUNT}

Answer questions about UAP sightings, trends, patterns, and notable cases.
Be factual, reference specific data where possible, and maintain a tone that is curious
and analytical — not sensationalist, but not dismissive either.
Keep responses concise (2–4 sentences) unless the user asks for detail.`;

router.post('/', async (req, res) => {
  const { message, history = [], context = {} } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured on server.' });
  }

  const filterDesc = context.filters
    ? Object.entries(context.filters)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ') || 'none (showing all)'
    : 'none (showing all)';

  const systemPrompt = SYSTEM_PROMPT
    .replace('{FILTER_STATE}', filterDesc)
    .replace('{COUNT}', (context.visibleCount ?? '?').toLocaleString?.() ?? context.visibleCount ?? '?');

  // Build message history for the API
  const messages = [
    ...history
      .filter((m) => m.role && m.content)
      .map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const reply = response.content[0]?.text ?? '';
    res.json({ reply });
  } catch (err) {
    console.error('Claude API error:', err.message);
    res.status(502).json({ error: `Claude API error: ${err.message}` });
  }
});

export default router;
