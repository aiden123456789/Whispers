'use client';

import { useMap } from 'react-leaflet';
import { useEffect } from 'react';
// @ts-expect-error leaflet.heat has no types
import 'leaflet.heat';
import L from 'leaflet';

interface HeatmapLayerProps {
  points: [number, number, number?][]; // [lat, lng, intensity]
}

export function HeatmapLayer({ points }: HeatmapLayerProps) {
  const map = useMap();

  useEffect(() => {
    const heatLayer = (L as any).heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      gradient: {
        0.0: 'blue',
        0.4: 'lime',
        0.7: 'yellow',
        1.0: 'red'
      }
    });

    heatLayer.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points]);

  return null;
}
