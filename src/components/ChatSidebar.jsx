import { useState, useEffect, useRef } from 'react';
import { sendChatMessage } from '../utils/api';

export default function ChatSidebar({ isOpen, onClose, seedPrompt, filters, visibleCount }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // Seed prompt from Insights tab
  useEffect(() => {
    if (isOpen && seedPrompt && messages.length === 0) {
      setInput(seedPrompt);
    }
  }, [isOpen, seedPrompt]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(text) {
    const userText = text || input.trim();
    if (!userText || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userText }]);
    setLoading(true);

    try {
      const reply = await sendChatMessage(userText, messages, { filters, visibleCount });
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Error connecting to Claude. Make sure the backend is running and ANTHROPIC_API_KEY is set.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const EXAMPLE_PROMPTS = [
    "What's the most reported shape over the Pacific?",
    'Summarize sightings near military bases',
    'Which year had the most sightings?',
    'What are the 6 unexplained AARO cases?',
  ];

  return (
    <aside
      className="flex flex-col shrink-0 transition-all duration-300 overflow-hidden"
      style={{
        width: isOpen ? 360 : 0,
        background: 'var(--surface)',
        borderLeft: isOpen ? '1px solid var(--border)' : 'none',
      }}
    >
      {isOpen && (
        <>
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--cyan)' }}>
                Ask Claude
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {visibleCount.toLocaleString()} sightings in context
              </p>
            </div>
            <button
              onClick={onClose}
              style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
            {messages.length === 0 && (
              <div className="flex flex-col gap-2 mt-2">
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                  Try asking:
                </p>
                {EXAMPLE_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => handleSend(p)}
                    className="text-left text-xs px-3 py-2 rounded transition-colors"
                    style={{
                      background: 'rgba(34,211,238,0.06)',
                      border: '1px solid rgba(34,211,238,0.15)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className="text-sm leading-relaxed px-3 py-2 rounded-lg max-w-[85%]"
                  style={
                    msg.role === 'user'
                      ? {
                          background: 'rgba(34,211,238,0.12)',
                          color: 'var(--text-primary)',
                          border: '1px solid rgba(34,211,238,0.2)',
                        }
                      : {
                          background: 'rgba(255,255,255,0.04)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border)',
                        }
                  }
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div
                  className="text-sm px-3 py-2 rounded-lg"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border)',
                  }}
                >
                  Thinking…
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            className="shrink-0 px-4 py-3"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask about the data…"
                className="flex-1 rounded px-3 py-2 text-sm outline-none"
                style={{
                  background: '#0a0d1a',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="px-3 py-2 rounded text-sm font-medium transition-colors"
                style={{
                  background: loading || !input.trim() ? 'rgba(34,211,238,0.1)' : 'rgba(34,211,238,0.2)',
                  color: loading || !input.trim() ? 'var(--text-muted)' : 'var(--cyan)',
                  border: '1px solid rgba(34,211,238,0.3)',
                  cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                Send
              </button>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
