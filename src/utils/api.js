const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

/**
 * Send a chat message to the Claude proxy endpoint.
 * @param {string} userMessage
 * @param {Array<{role: string, content: string}>} history - prior messages
 * @param {{ filters: object, visibleCount: number }} context
 * @returns {Promise<string>} assistant reply text
 */
export async function sendChatMessage(userMessage, history = [], context = {}) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: userMessage, history, context }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.reply;
}
