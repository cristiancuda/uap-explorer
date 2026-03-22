export default function Header({ onChatToggle, isChatOpen }) {
  return (
    <header
      className="flex items-center justify-between px-6 py-3 shrink-0"
      style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl" aria-hidden="true">&#9651;</span>
        <div>
          <h1 className="text-base font-semibold tracking-wide" style={{ color: 'var(--cyan)' }}>
            UAP Explorer
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            NUFORC Sighting Database · 1906–2024
          </p>
        </div>
      </div>

      <button
        onClick={onChatToggle}
        className="flex items-center gap-2 px-4 py-1.5 rounded text-sm font-medium transition-colors"
        style={{
          background: isChatOpen ? 'rgba(34,211,238,0.15)' : 'transparent',
          color: isChatOpen ? 'var(--cyan)' : 'var(--text-secondary)',
          border: '1px solid',
          borderColor: isChatOpen ? 'rgba(34,211,238,0.4)' : 'var(--border)',
        }}
      >
        <span>Ask Claude</span>
        <span style={{ color: 'var(--cyan)' }}>↗</span>
      </button>
    </header>
  );
}
