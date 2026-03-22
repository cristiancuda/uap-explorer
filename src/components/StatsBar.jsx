function Stat({ value, label, color }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-lg font-bold tabular-nums" style={{ color: color || 'var(--cyan)' }}>
        {value ?? '—'}
      </span>
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
    </div>
  );
}

export default function StatsBar({ stats }) {
  const total = stats?.total != null ? stats.total.toLocaleString() : null;
  const aaroCount = stats?.aaroCount != null ? stats.aaroCount.toLocaleString() : null;
  const unresolved = stats?.unresolvedCount != null ? stats.unresolvedCount.toLocaleString() : null;
  const dataSpan =
    stats?.minYear != null && stats?.maxYear != null
      ? `${stats.maxYear - stats.minYear}yr`
      : null;

  return (
    <div
      className="flex items-center gap-8 px-6 py-2 shrink-0"
      style={{
        background: 'rgba(13,17,32,0.8)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <Stat value={total} label="total sightings" />
      <Stat value={aaroCount} label="AARO featured cases" color="var(--amber)" />
      <Stat value={unresolved} label="unresolved" color="var(--coral)" />
      <Stat value={dataSpan} label="data span" color="var(--text-secondary)" />
    </div>
  );
}
