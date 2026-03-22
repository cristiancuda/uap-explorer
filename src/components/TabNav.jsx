const TAB_LABELS = {
  map: 'Map',
  timeline: 'Timeline',
  shapes: 'Shapes',
  insights: 'Insights',
};

export default function TabNav({ tabs, active, onChange }) {
  return (
    <nav
      className="flex gap-1 px-4 shrink-0"
      style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
    >
      {tabs.map((tab) => {
        const isActive = tab === active;
        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className="px-4 py-2.5 text-sm font-medium transition-colors relative"
            style={{
              color: isActive ? 'var(--cyan)' : 'var(--text-muted)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {TAB_LABELS[tab] || tab}
            {isActive && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t"
                style={{ background: 'var(--cyan)' }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
