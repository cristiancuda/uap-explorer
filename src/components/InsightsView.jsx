import { useInsights } from '../hooks/useInsights';

// Static card config — titles, descriptions, colors, Claude prompts.
// Dynamic stat values come from the /api/insights endpoint.
const INSIGHT_CONFIG = [
  {
    id: 'military-proximity',
    title: 'Military Base Correlation',
    statLabel: 'of sightings within 80 km of a military installation',
    body: 'Sightings cluster significantly around USAF and Navy bases, particularly in the Southwest US. Whether this reflects unreported test flights or genuine anomalous activity near sensitive airspace remains unresolved.',
    color: '#f87171',
    prompt: 'What percentage of UAP sightings occur near military bases, and which bases have the highest concentrations?',
    format: (v) => `${v.toFixed(0)}%`,
  },
  {
    id: 'decade-spike',
    title: 'Post-2000 Surge',
    statLabel: 'increase in average annual reports from 1990–2000 to 2001–2014',
    body: "Annual sighting reports surged after 2000. This likely reflects smartphone proliferation and NUFORC's online reporting form — but the volume increase also coincides with post-Nimitz UAP awareness.",
    color: '#fbbf24',
    prompt: 'Which decade had the most UAP sightings, and what drove the post-2000 surge in reports?',
    format: (v) => `${v.toFixed(1)}×`,
  },
  {
    id: 'orb-dominance',
    title: 'Orb / Light Dominance',
    statLabel: 'of all sightings described as light, sphere, or circle',
    body: 'Across all eras, luminous spherical objects dominate the dataset. The consistency across 70+ years and geographic regions is striking — "light" remains the most reported shape regardless of cultural context.',
    color: '#22d3ee',
    prompt: 'Why do orbs and lights dominate UAP sighting reports, and has this changed over time?',
    format: (v) => `${v.toFixed(0)}%`,
  },
  {
    id: 'aaro-cases',
    title: 'AARO Unresolved Cases',
    statLabel: 'cases officially designated "unexplained" by the DoD',
    body: 'A curated set of cases remain formally unexplained with no plausible conventional explanation. These include the Nimitz (2004), Roosevelt (2014–2015), and Rendlesham Forest (1980) incidents.',
    color: '#a78bfa',
    prompt: 'Summarize the officially unexplained AARO UAP cases and what makes them anomalous.',
    format: (v) => `${v}`,
  },
];

function getStatValue(id, insights) {
  if (!insights) return null;
  switch (id) {
    case 'military-proximity': return insights.militaryProximityPct;
    case 'decade-spike':       return insights.decadeSurgeFactor;
    case 'orb-dominance':      return insights.orbDominancePct;
    case 'aaro-cases':         return insights.aaroUnresolvedCount;
    default:                   return null;
  }
}

export default function InsightsView({ onAskClaude }) {
  const { insights, loading } = useInsights();

  return (
    <div className="h-full overflow-y-auto px-8 py-6" style={{ background: 'var(--bg)' }}>
      <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
        Key Insights
      </h2>

      {!loading && !insights && (
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Stats computed from NUFORC dataset — start the server to load.{' '}
          <code style={{ color: 'var(--cyan)' }}>npm run server</code>
        </p>
      )}
      {loading && (
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Computing from dataset…</p>
      )}
      {insights && !loading && (
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Computed from {insights.computed ? 'full NUFORC dataset' : 'dataset'}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 max-w-4xl lg:grid-cols-2">
        {INSIGHT_CONFIG.map((cfg) => {
          const raw = getStatValue(cfg.id, insights);
          const display = raw != null ? cfg.format(raw) : '—';

          return (
            <div
              key={cfg.id}
              className="rounded-lg p-5 flex flex-col gap-3"
              style={{
                background: 'var(--surface)',
                border: `1px solid ${cfg.color}33`,
              }}
            >
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {cfg.title}
              </h3>

              <div className="flex items-baseline gap-2">
                <span
                  className="text-3xl font-bold tabular-nums"
                  style={{ color: display === '—' ? 'var(--text-muted)' : cfg.color }}
                >
                  {display}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {cfg.statLabel}
                </span>
              </div>

              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {cfg.body}
              </p>

              <button
                onClick={() => onAskClaude(cfg.prompt)}
                className="mt-auto self-start text-xs px-3 py-1.5 rounded font-medium transition-colors"
                style={{
                  background: `${cfg.color}18`,
                  color: cfg.color,
                  border: `1px solid ${cfg.color}40`,
                }}
              >
                Ask Claude ↗
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
