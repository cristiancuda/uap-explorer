function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Rendered as a flex sibling in the layout row — pushes the map left rather than overlapping it.
export default function SightingDrawer({ sighting, onClose, allSightings }) {
  const isOpen = Boolean(sighting);

  const nearby = isOpen
    ? allSightings
        .filter(
          (s) =>
            s.id !== sighting.id &&
            s.lat &&
            s.lon &&
            haversineKm(sighting.lat, sighting.lon, s.lat, s.lon) < 80
        )
        .slice(0, 5)
    : [];

  const year = sighting?.datetime ? new Date(sighting.datetime).getFullYear() : '?';
  const location = [sighting?.city, sighting?.state || sighting?.country].filter(Boolean).join(', ');

  return (
    <aside
      className="shrink-0 flex flex-col overflow-hidden transition-all duration-300"
      style={{
        width: isOpen ? 380 : 0,
        background: 'var(--surface)',
        borderLeft: isOpen ? '1px solid var(--border)' : 'none',
      }}
    >
      {isOpen && (
        <>
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4 shrink-0"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                Sighting Report
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {location} · {year}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-lg leading-none"
              style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Shape', value: sighting.shape || 'Unknown' },
                { label: 'Duration', value: sighting.duration || '—' },
                { label: 'Date', value: sighting.datetime?.slice(0, 10) || '—' },
                { label: 'Country', value: (sighting.country || '—').toUpperCase() },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded p-3"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}
                >
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                    {label}
                  </p>
                  <p className="text-sm font-medium capitalize" style={{ color: 'var(--text-primary)' }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {/* Full report */}
            {sighting.comments && (
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                  Witness Report
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {sighting.comments}
                </p>
              </div>
            )}

            {/* Nearby sightings */}
            {nearby.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                  Similar sightings nearby (80 km)
                </p>
                <div className="flex flex-col gap-2">
                  {nearby.map((s) => (
                    <div
                      key={s.id}
                      className="rounded p-3 text-xs"
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div className="flex justify-between mb-1">
                        <span className="font-medium capitalize" style={{ color: 'var(--text-primary)' }}>
                          {s.shape || 'Unknown'}
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {s.datetime?.slice(0, 10) || '?'}
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-muted)' }}>
                        {s.comments?.slice(0, 80)}
                        {s.comments?.length > 80 ? '…' : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
