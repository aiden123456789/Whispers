// useGeolocation.ts
import { useState, useEffect } from 'react';

export function useGeolocation(fallback: [number, number]) {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation not supported');
      setPosition(fallback);
      return;
    }

    const id = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setPosition([coords.latitude, coords.longitude]);
        setError(null);
      },
      err => {
        setError(err.message || 'Location error');
        setPosition(fallback);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(id);
  }, [fallback]);

  return { position, error };
}
