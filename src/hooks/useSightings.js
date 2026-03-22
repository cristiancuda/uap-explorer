import { useState, useEffect, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export function useSightings(filters = {}) {
  const [sightings, setSightings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    const params = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => v)
    );

    fetch(`${API_BASE}/api/sightings?${params}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`API ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setSightings(data.sightings || []);
        setError(null);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setSightings([]);
        setError('backend-offline');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [filters.shape, filters.decade, filters.country]);

  return { sightings, loading, error };
}
