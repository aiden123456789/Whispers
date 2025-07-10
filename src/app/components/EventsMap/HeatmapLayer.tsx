'use client';

import { useMap } from 'react-leaflet';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.heat';

interface HeatmapLayerProps {
  points: [number, number, number?][];
}

export function HeatmapLayer({ points }: HeatmapLayerProps) {
  const map = useMap();
  const heatRef = useRef<L.Layer | null>(null);

  useEffect(() => {
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

    const heatLayer = leafletWithHeat.heatLayer(points, {
      radius: 100,
      blur: 15,
      gradient: {
        0.6: 'blue',
      },
    });

    heatRef.current = heatLayer;
    if (map.getZoom() < 10) {
      heatLayer.addTo(map);
    }

    const handleZoom = () => {
      const zoom = map.getZoom();
      if (zoom >= 10) {
        map.removeLayer(heatLayer);
      } else {
        if (!map.hasLayer(heatLayer)) {
          heatLayer.addTo(map);
        }
      }
    };

    map.on('zoomend', handleZoom);

    return () => {
      map.off('zoomend', handleZoom);
      map.removeLayer(heatLayer);
    };
  }, [map, points]);

  return null;
}
