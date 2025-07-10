'use client';

import { useMap } from 'react-leaflet';
import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet.heat';

interface HeatmapLayerProps {
  points: [number, number, number?][];
}

export function HeatmapLayer({ points }: HeatmapLayerProps) {
  const map = useMap();

  useEffect(() => {
    // Extend the leaflet module to include heatLayer
    const leafletWithHeat = L as typeof L & {
      heatLayer: (
        latlngs: [number, number, number?][],
        options?: {
          radius?: number;
          blur?: number;
          maxZoom?: number;
          gradient?: { [key: number]: string };
        }
      ) => L.Layer;
    };

    const heat = leafletWithHeat.heatLayer(points, {
      radius: 50,
      blur: 25,
      maxZoom: 17,
      gradient: {
        0.3: 'blue',
        0.4: 'lime',
        0.7: 'yellow',
        9.0: 'red',
      },
    });

    heat.addTo(map);
    return () => {
      map.removeLayer(heat);
    };
  }, [map, points]);

  return null;
}
