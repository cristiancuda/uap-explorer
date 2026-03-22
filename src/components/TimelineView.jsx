import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const TAG_COLORS = {
  military: '#f87171',
  government: '#fbbf24',
  civilian: '#22d3ee',
  congressional: '#a78bfa',
};

export default function TimelineView() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/timeline`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setEvents)
      .catch(() => setError('Could not load timeline events. Is the server running? (npm run server)'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="h-full overflow-y-auto px-8 py-6" style={{ background: 'var(--bg)' }}>
      <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
        UAP Timeline · 1947–2025
      </h2>

      {loading && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading events…</p>
      )}

      {error && (
        <p className="text-sm" style={{ color: 'var(--coral)' }}>{error}</p>
      )}

      {!loading && !error && (
        <div className="relative max-w-3xl">
          <div
            className="absolute left-24 top-0 bottom-0 w-px"
            style={{ background: 'var(--border)' }}
          />
          <div className="flex flex-col gap-6">
            {events.map((event) => (
              <div key={event.id} className="flex gap-6 items-start">
                <div
                  className="w-20 shrink-0 text-right text-sm font-bold tabular-nums pt-0.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {event.year}
                </div>
                <div
                  className="w-2 h-2 rounded-full shrink-0 mt-1.5 relative z-10"
                  style={{ background: TAG_COLORS[event.tag] || 'var(--cyan)' }}
                />
                <div
                  className="flex-1 rounded p-4"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {event.title}
                    </h3>
                    {event.tag && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: `${TAG_COLORS[event.tag]}22`,
                          color: TAG_COLORS[event.tag] || 'var(--cyan)',
                        }}
                      >
                        {event.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {event.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
