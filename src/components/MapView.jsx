import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Shape → color mapping using design system tokens
const SHAPE_COLORS = {
  light: '#fbbf24',
  flash: '#fbbf24',
  fireball: '#fbbf24',
  flare: '#fbbf24',
  circle: '#22d3ee',
  sphere: '#22d3ee',
  oval: '#22d3ee',
  disk: '#22d3ee',
  egg: '#22d3ee',
  round: '#22d3ee',
  triangle: '#a78bfa',
  delta: '#a78bfa',
  chevron: '#a78bfa',
  pyramid: '#a78bfa',
  cylinder: '#f87171',
  cigar: '#f87171',
  rectangle: '#f87171',
  cone: '#f87171',
  formation: '#4ade80',
  changing: '#4ade80',
  diamond: '#e2e8f0',
  cross: '#e2e8f0',
  teardrop: '#e2e8f0',
  star: '#e2e8f0',
  unknown: '#64748b',
  other: '#64748b',
};

const SHAPES = Object.keys(SHAPE_COLORS).filter(
  (s) => !['unknown', 'other'].includes(s)
);

function getShapeColor(shape) {
  return SHAPE_COLORS[shape?.toLowerCase?.()] ?? '#64748b';
}

function makeCircleMarker(sighting, onClick) {
  const color = getShapeColor(sighting.shape);
  const year = new Date(sighting.datetime).getFullYear();
  const isRecent = year >= 2015;
  const radius = isRecent ? 6 : 5;

  const marker = L.circleMarker([sighting.lat, sighting.lon], {
    radius,
    fillColor: color,
    color: 'rgba(0,0,0,0.4)',
    weight: 1,
    opacity: 1,
    fillOpacity: isRecent ? 0.9 : 0.7,
  });

  const year4 = year || '?';
  const shape = sighting.shape ? sighting.shape.charAt(0).toUpperCase() + sighting.shape.slice(1) : 'Unknown';
  const location = [sighting.city, sighting.state || sighting.country]
    .filter(Boolean)
    .join(', ');
  const excerpt = sighting.comments
    ? sighting.comments.slice(0, 120) + (sighting.comments.length > 120 ? '…' : '')
    : '';

  const tooltipHtml = `
    <div class="sighting-tooltip-inner">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block;flex-shrink:0"></span>
        <strong style="color:#e2e8f0;font-size:12px">${shape}</strong>
        <span style="color:#475569;font-size:11px;margin-left:auto">${year4}</span>
      </div>
      <div style="color:#94a3b8;font-size:11px;margin-bottom:${excerpt ? '4px' : '0'}">${location}</div>
      ${sighting.duration ? `<div style="color:#475569;font-size:10px;margin-bottom:4px">Duration: ${sighting.duration}</div>` : ''}
      ${excerpt ? `<div style="color:#94a3b8;font-size:11px;line-height:1.4">${excerpt}</div>` : ''}
    </div>
  `;

  marker.bindTooltip(tooltipHtml, {
    className: 'sighting-tooltip',
    direction: 'top',
    offset: [0, -4],
    interactive: true,
  });

  marker.on('click', () => onClick(sighting));

  return marker;
}

const FILTERS_SHAPES = ['All shapes', ...SHAPES.sort()];
const DECADES = ['All decades', '1950s', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'];

export default function MapView({ sightings, loading, error, filters, onFiltersChange, onSightingSelect }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const clusterGroupRef = useRef(null);
  const militaryLayerRef = useRef(null);
  const [showMilitary, setShowMilitary] = useState(false);
  const [colorBy, setColorBy] = useState('shape'); // 'shape' | 'decade'
  const [militaryBases, setMilitaryBases] = useState(null); // cached after first fetch

  // Initialize map once
  useEffect(() => {
    if (mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [30, -20],
      zoom: 3,
      minZoom: 2,
      maxZoom: 14,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Rebuild markers when sightings or colorBy changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing cluster group
    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current);
    }

    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 50,
      disableClusteringAtZoom: 10,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction(cluster) {
        const count = cluster.getChildCount();
        const size = count < 10 ? 32 : count < 100 ? 38 : 44;
        return L.divIcon({
          html: `<div style="
            width:${size}px;height:${size}px;
            border-radius:50%;
            background:rgba(34,211,238,0.18);
            border:1.5px solid rgba(34,211,238,0.45);
            display:flex;align-items:center;justify-content:center;
            color:#e2e8f0;font-size:${count < 100 ? 12 : 11}px;font-weight:600;
          ">${count < 1000 ? count : Math.round(count / 1000) + 'k'}</div>`,
          className: '',
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      },
    });

    for (const sighting of sightings) {
      if (!sighting.lat || !sighting.lon) continue;
      const marker = makeCircleMarker(sighting, onSightingSelect);
      clusterGroup.addLayer(marker);
    }

    clusterGroup.addTo(map);
    clusterGroupRef.current = clusterGroup;
  }, [sightings, colorBy, onSightingSelect]);

  // Military base overlay toggle — fetches from API on first enable, caches in state
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!showMilitary) {
      if (militaryLayerRef.current) {
        map.removeLayer(militaryLayerRef.current);
        militaryLayerRef.current = null;
      }
      return;
    }

    function renderLayer(bases) {
      if (militaryLayerRef.current) map.removeLayer(militaryLayerRef.current);
      const layer = L.layerGroup(
        bases
          .filter((b) => b.lat && b.lon)
          .map((base) =>
            L.marker([base.lat, base.lon], {
              icon: L.divIcon({
                html: `<div title="${base.name}" style="
                  width:10px;height:10px;border-radius:2px;
                  background:#f87171;border:1.5px solid rgba(248,113,113,0.6);
                "></div>`,
                className: '',
                iconSize: [10, 10],
                iconAnchor: [5, 5],
              }),
            }).bindTooltip(`<strong>${base.name}</strong><br/>${base.branch}`, {
              className: 'sighting-tooltip',
              direction: 'top',
            })
          )
      );
      layer.addTo(map);
      militaryLayerRef.current = layer;
    }

    if (militaryBases) {
      renderLayer(militaryBases);
      return;
    }

    fetch(`${API_BASE}/military-bases`)
      .then((res) => res.json())
      .then((data) => {
        const bases = data.bases || [];
        setMilitaryBases(bases);
        renderLayer(bases);
      })
      .catch((err) => console.warn('[MapView] military-bases fetch failed:', err.message));
  }, [showMilitary, militaryBases]);

  function handleNearMe() {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        mapInstanceRef.current?.flyTo([coords.latitude, coords.longitude], 9, {
          animate: true,
          duration: 1.5,
        });
      },
      () => alert('Location access denied.')
    );
  }

  return (
    <div className="relative w-full h-full flex">
      {/* Filter panel */}
      <aside
        className="w-56 shrink-0 flex flex-col gap-4 p-4 overflow-y-auto"
        style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
      >
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
            Shape
          </label>
          <select
            value={filters.shape || ''}
            onChange={(e) => onFiltersChange({ ...filters, shape: e.target.value })}
            className="w-full rounded px-2 py-1.5 text-sm"
            style={{
              background: '#0a0d1a',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          >
            {FILTERS_SHAPES.map((s) => (
              <option key={s} value={s === 'All shapes' ? '' : s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
            Decade
          </label>
          <select
            value={filters.decade || ''}
            onChange={(e) => onFiltersChange({ ...filters, decade: e.target.value })}
            className="w-full rounded px-2 py-1.5 text-sm"
            style={{
              background: '#0a0d1a',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          >
            {DECADES.map((d) => (
              <option key={d} value={d === 'All decades' ? '' : d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
            Country
          </label>
          <select
            value={filters.country || ''}
            onChange={(e) => onFiltersChange({ ...filters, country: e.target.value })}
            className="w-full rounded px-2 py-1.5 text-sm"
            style={{
              background: '#0a0d1a',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          >
            <option value="">All countries</option>
            <option value="us">United States</option>
            <option value="ca">Canada</option>
            <option value="gb">United Kingdom</option>
            <option value="au">Australia</option>
            <option value="de">Germany</option>
          </select>
        </div>

        <hr style={{ borderColor: 'var(--border)' }} />

        {/* Layers */}
        <div>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
            Layers
          </p>
          <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={showMilitary}
              onChange={(e) => setShowMilitary(e.target.checked)}
              className="accent-red-400"
            />
            <span style={{ color: '#f87171' }}>■</span> Military bases
          </label>
        </div>

        {/* Near me */}
        <button
          onClick={handleNearMe}
          className="w-full py-1.5 rounded text-sm font-medium transition-colors"
          style={{
            background: 'rgba(34,211,238,0.1)',
            color: 'var(--cyan)',
            border: '1px solid rgba(34,211,238,0.25)',
          }}
        >
          Near me ◎
        </button>

        {/* Legend */}
        <div>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
            Shape legend
          </p>
          <div className="flex flex-col gap-1">
            {[
              { label: 'Light / Fireball', color: '#fbbf24' },
              { label: 'Circle / Disk / Sphere', color: '#22d3ee' },
              { label: 'Triangle / Chevron', color: '#a78bfa' },
              { label: 'Cylinder / Cigar', color: '#f87171' },
              { label: 'Formation / Changing', color: '#4ade80' },
              { label: 'Diamond / Cross', color: '#e2e8f0' },
              { label: 'Unknown / Other', color: '#64748b' },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: color,
                    flexShrink: 0,
                    display: 'inline-block',
                  }}
                />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Visible count */}
        <div
          className="mt-auto rounded px-3 py-2 text-center text-xs"
          style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid var(--border)' }}
        >
          {loading ? (
            <span style={{ color: 'var(--text-muted)' }}>Loading…</span>
          ) : (
            <>
              <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>
                {sightings.length.toLocaleString()}
              </span>{' '}
              <span style={{ color: 'var(--text-muted)' }}>sightings visible</span>
            </>
          )}
        </div>
      </aside>

      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full" />

        {loading && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ background: 'rgba(10,13,26,0.5)' }}
          >
            <p className="text-sm" style={{ color: 'var(--cyan)' }}>Loading sightings…</p>
          </div>
        )}

        {!loading && error === 'backend-offline' && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ pointerEvents: 'none' }}>
            <div
              className="rounded-lg px-8 py-6 max-w-sm w-full mx-4"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                pointerEvents: 'auto',
              }}
            >
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                No sighting data loaded
              </p>
              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
                The NUFORC dataset is not available. To load 147k real sightings:
              </p>
              <ol className="flex flex-col gap-2 text-xs" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <li>
                  <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>1.</span> Download{' '}
                  <code style={{ color: 'var(--amber)' }}>scrubbed.csv</code> from{' '}
                  <span style={{ color: 'var(--cyan)' }}>kaggle.com/datasets/camnugent/ufo-sightings-around-the-world</span>
                </li>
                <li>
                  <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>2.</span> Place at{' '}
                  <code style={{ color: 'var(--amber)' }}>server/data/raw/scrubbed.csv</code>
                </li>
                <li>
                  <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>3.</span>{' '}
                  <code style={{ color: 'var(--amber)' }}>npm run process</code>
                </li>
                <li>
                  <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>4.</span>{' '}
                  <code style={{ color: 'var(--amber)' }}>npm run server</code>
                </li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
