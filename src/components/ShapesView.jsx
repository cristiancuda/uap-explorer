import { useMemo } from 'react';

const SHAPE_COLORS = {
  light: '#fbbf24',
  circle: '#22d3ee',
  triangle: '#a78bfa',
  fireball: '#fbbf24',
  sphere: '#22d3ee',
  disk: '#22d3ee',
  oval: '#22d3ee',
  unknown: '#64748b',
  other: '#64748b',
  cylinder: '#f87171',
  formation: '#4ade80',
  cigar: '#f87171',
  changing: '#4ade80',
  diamond: '#e2e8f0',
  chevron: '#a78bfa',
};

export default function ShapesView({ sightings }) {
  const shapeCounts = useMemo(() => {
    const counts = {};
    for (const s of sightings) {
      const shape = s.shape?.toLowerCase() || 'unknown';
      counts[shape] = (counts[shape] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
  }, [sightings]);

  const max = shapeCounts[0]?.[1] || 1;

  return (
    <div className="h-full overflow-y-auto px-8 py-6" style={{ background: 'var(--bg)' }}>
      <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
        Shape Breakdown
      </h2>

      {sightings.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No data loaded yet.</p>
      ) : (
        <div className="max-w-2xl flex flex-col gap-3">
          {shapeCounts.map(([shape, count]) => (
            <div key={shape} className="flex items-center gap-4">
              <div
                className="text-sm capitalize text-right"
                style={{ width: 90, color: 'var(--text-secondary)', flexShrink: 0 }}
              >
                {shape}
              </div>
              <div className="flex-1 h-6 rounded overflow-hidden" style={{ background: 'var(--surface)' }}>
                <div
                  className="h-full rounded transition-all duration-500"
                  style={{
                    width: `${(count / max) * 100}%`,
                    background: SHAPE_COLORS[shape] || '#64748b',
                    opacity: 0.8,
                  }}
                />
              </div>
              <div
                className="text-sm tabular-nums"
                style={{ width: 60, color: 'var(--text-muted)', flexShrink: 0 }}
              >
                {count.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
