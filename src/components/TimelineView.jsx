import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer, Cell,
} from 'recharts';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const TAG_COLORS = {
  military:      '#f87171',
  government:    '#fbbf24',
  civilian:      '#22d3ee',
  congressional: '#a78bfa',
};

// ── helpers ──────────────────────────────────────────────────────────────────

function groupByYear(events) {
  const map = {};
  for (const e of events) {
    (map[e.year] ??= []).push(e);
  }
  return map;
}

// ── custom chart pieces ───────────────────────────────────────────────────────

/**
 * Dot rendered at the top of a ReferenceLine.
 * Recharts clones this element and injects { viewBox } = { x, y, width, height }.
 */
function EventMarker({ viewBox, events = [] }) {
  if (!viewBox || !events.length) return null;
  const { x, y } = viewBox;
  // Use the tag color of the first event; if multiple, show a small stacked effect
  const color = TAG_COLORS[events[0].tag] || '#22d3ee';
  return (
    <g>
      <circle cx={x} cy={y + 6} r={5} fill={color} opacity={0.9} />
      {events.length > 1 && (
        <circle cx={x + 5} cy={y + 3} r={3} fill={TAG_COLORS[events[1].tag] || color} opacity={0.8} />
      )}
    </g>
  );
}

function ChartTooltip({ active, payload, label, eventsByYear }) {
  if (!active || !payload?.length) return null;
  const count = payload[0]?.value ?? 0;
  const yearEvents = eventsByYear[label] ?? [];

  return (
    <div
      className="text-sm rounded"
      style={{
        background: '#0d1120',
        border: '1px solid rgba(255,255,255,0.12)',
        padding: '10px 14px',
        minWidth: 180,
        maxWidth: 280,
      }}
    >
      <div className="font-bold mb-1" style={{ color: '#22d3ee', fontSize: 15 }}>
        {label}
      </div>
      <div style={{ color: '#e2e8f0' }}>
        {count.toLocaleString()} sightings
      </div>
      {yearEvents.map((e) => (
        <div key={e.id} className="mt-2 leading-snug" style={{ color: TAG_COLORS[e.tag] || '#94a3b8' }}>
          <span className="font-medium">● {e.title}</span>
        </div>
      ))}
      {count > 0 && (
        <div className="mt-2 text-xs" style={{ color: '#475569' }}>
          Click to filter map
        </div>
      )}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function TimelineView({ filters = {}, onFiltersChange, onSwitchToMap }) {
  const [yearlyCounts, setYearlyCounts] = useState([]);
  const [events, setEvents]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  const selectedYear = filters.year ? parseInt(filters.year) : null;

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/yearly-counts`).then((r) => {
        if (!r.ok) throw new Error(`yearly-counts ${r.status}`);
        return r.json();
      }),
      fetch(`${API_BASE}/timeline`).then((r) => {
        if (!r.ok) throw new Error(`timeline ${r.status}`);
        return r.json();
      }),
    ])
      .then(([counts, evts]) => { setYearlyCounts(counts); setEvents(evts); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const eventsByYear = groupByYear(events);
  const eventYears   = Object.keys(eventsByYear).map(Number);

  const minYear = yearlyCounts[0]?.year ?? 1906;
  const maxYear = yearlyCounts[yearlyCounts.length - 1]?.year ?? 2014;
  const maxCount = Math.max(...yearlyCounts.map((d) => d.count), 1);

  function handleBarClick(data) {
    const year = data?.activePayload?.[0]?.payload?.year;
    if (!year) return;
    onFiltersChange?.({ ...filters, year: String(year), decade: '' });
    onSwitchToMap?.();
  }

  function clearYear() {
    onFiltersChange?.({ ...filters, year: '' });
  }

  // ── render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
        Loading timeline data…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--coral)' }}>
        {error} — is the server running?
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ── header ── */}
      <div className="px-8 pt-6 pb-3 shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            UAP Sightings by Year · {minYear}–{maxYear}
          </h2>

          {selectedYear && (
            <span
              className="flex items-center gap-2 text-sm px-3 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(34,211,238,0.12)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.25)' }}
            >
              {selectedYear} — {yearlyCounts.find((d) => d.year === selectedYear)?.count.toLocaleString() ?? 0} sightings
              <button
                onClick={clearYear}
                className="ml-1 opacity-60 hover:opacity-100"
                style={{ lineHeight: 1 }}
                title="Clear year filter"
              >
                ×
              </button>
            </span>
          )}
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Click any bar to filter the map · colored dots mark historical events
        </p>
      </div>

      {/* ── bar chart ── */}
      <div className="shrink-0 px-4" style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={yearlyCounts}
            margin={{ top: 20, right: 24, bottom: 0, left: 40 }}
            onClick={handleBarClick}
            style={{ cursor: 'pointer' }}
            barCategoryGap="10%"
          >
            <XAxis
              dataKey="year"
              tick={{ fill: '#475569', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.07)' }}
              tickFormatter={(y) => (y % 10 === 0 ? y : '')}
              interval={0}
            />
            <YAxis
              tick={{ fill: '#475569', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
              width={36}
            />
            <Tooltip
              content={<ChartTooltip eventsByYear={eventsByYear} />}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            />

            {/* Event reference lines */}
            {eventYears.map((year) => (
              <ReferenceLine
                key={year}
                x={year}
                stroke="rgba(255,255,255,0.08)"
                strokeDasharray="3 3"
                label={<EventMarker events={eventsByYear[year]} />}
              />
            ))}

            {/* Bars — selected year full cyan, event years purple, rest muted cyan */}
            <Bar dataKey="count" maxBarSize={18} radius={[2, 2, 0, 0]}>
              {yearlyCounts.map((entry) => {
                let fill;
                if (entry.year === selectedYear)       fill = '#22d3ee';
                else if (eventsByYear[entry.year])     fill = '#a78bfa88';
                else                                   fill = '#22d3ee33';
                return <Cell key={entry.year} fill={fill} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── legend ── */}
      <div className="px-8 pb-3 shrink-0 flex items-center gap-6 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#22d3ee33' }} />
          Sightings
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#a78bfa88' }} />
          Notable event year
        </span>
        {Object.entries(TAG_COLORS).map(([tag, color]) => (
          <span key={tag} className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />
            {tag}
          </span>
        ))}
      </div>

      <div className="mx-8 shrink-0" style={{ height: 1, background: 'var(--border)' }} />

      {/* ── event list ── */}
      <div className="flex-1 overflow-y-auto px-8 py-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
          Historical Events
        </h3>
        <div className="relative max-w-3xl">
          {/* Vertical timeline line */}
          <div
            className="absolute left-24 top-0 bottom-0 w-px"
            style={{ background: 'var(--border)' }}
          />
          <div className="flex flex-col gap-5">
            {events.map((event) => {
              const yearData = yearlyCounts.find((d) => d.year === event.year);
              const isSelected = event.year === selectedYear;
              return (
                <div key={event.id} className="flex gap-6 items-start">
                  {/* Year + count */}
                  <div className="w-20 shrink-0 text-right pt-0.5">
                    <button
                      className="text-sm font-bold tabular-nums hover:underline"
                      style={{ color: isSelected ? '#22d3ee' : 'var(--text-muted)' }}
                      onClick={() => {
                        onFiltersChange?.({ ...filters, year: String(event.year), decade: '' });
                        onSwitchToMap?.();
                      }}
                      title={`Filter map to ${event.year}`}
                    >
                      {event.year}
                    </button>
                    {yearData && (
                      <div className="text-xs tabular-nums mt-0.5" style={{ color: '#475569' }}>
                        {yearData.count >= 1000
                          ? `${(yearData.count / 1000).toFixed(1)}k`
                          : yearData.count}
                      </div>
                    )}
                  </div>

                  {/* Dot */}
                  <div
                    className="w-2 h-2 rounded-full shrink-0 mt-1.5 relative z-10"
                    style={{ background: TAG_COLORS[event.tag] || 'var(--cyan)' }}
                  />

                  {/* Event card */}
                  <div
                    className="flex-1 rounded p-4 transition-colors"
                    style={{
                      background: isSelected ? 'rgba(34,211,238,0.06)' : 'var(--surface)',
                      border: `1px solid ${isSelected ? 'rgba(34,211,238,0.25)' : 'var(--border)'}`,
                    }}
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
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
