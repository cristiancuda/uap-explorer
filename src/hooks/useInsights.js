import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export function useInsights() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/insights`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => setInsights(data?.computed ? data : null))
      .catch(() => setInsights(null))
      .finally(() => setLoading(false));
  }, []);

  return { insights, loading };
}
