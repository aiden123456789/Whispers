import { useState, useEffect } from 'react';

export function useGeolocation(fallback: [number, number]) {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const roundToOneDecimals = (num: number): number => Math.round(num * 10) / 10;

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation not supported');
      setPosition([
        roundToOneDecimals(fallback[0]),
        roundToOneDecimals(fallback[1]),
      ]);
      return;
    }

    const id = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const lat = roundToOneDecimals(coords.latitude);
        const lng = roundToOneDecimals(coords.longitude);
        setPosition([lat, lng]);
        setError(null);
      },
      err => {
        setError(err.message || 'Location error');
        setPosition([
          roundToOneDecimals(fallback[0]),
          roundToOneDecimals(fallback[1]),
        ]);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(id);
  }, [fallback]);

  return { position, error };
}
