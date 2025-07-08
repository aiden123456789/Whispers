'use client';

import { useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';
import { useMap } from 'react-leaflet';

// Add leaflet heat plugin typings for TS
declare module 'leaflet' {
  function heatLayer(
    latlngs: Array<[number, number, number]>,
    options?: object
  ): L.Layer;
}

// Dynamically load React-Leaflet components (no SSR)
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

const FALLBACK_CENTER: [number, number] = [33.9519, -83.3576]; // Athens, GA

interface Whisper {
  id: number;
  text: string;
  lat: number;
  lng: number;
  createdAt: number;
}

const MessageList = ({ messages }: { messages: Whisper[] }) => {
  // ... same as before ...
};

// Haversine distance and grouping functions same as before ...

// HeatmapLayer component manages adding/removing heat layer
function HeatmapLayer({ points }: { points: Array<[number, number, number]> }) {
  const map = useMap();
  const heatLayerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    // Remove previous heat layer
    if (heatLayerRef.current) {
      heatLayerRef.current.remove();
      heatLayerRef.current = null;
    }

    if (points.length === 0) return;

    heatLayerRef.current = L.heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      max: 1,
    }).addTo(map);

    // Cleanup on unmount
    return () => {
      if (heatLayerRef.current) {
        heatLayerRef.current.remove();
        heatLayerRef.current = null;
      }
    };
  }, [map, points]);

  return null;
}

export default function EventsMap() {
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Whisper[]>([]);
  const [speechBubbleIcon, setSpeechBubbleIcon] = useState<L.DivIcon | null>(null);
  const whisperInput = useRef<HTMLInputElement>(null);

  // create icon effect same as before...

  // geolocation watch same as before...

  // fetch messages on center change same as before...

  // handleSubmit same as before...

  const radiusInMeters = 30.48; // 100 feet
  const groupedMessagesByRadius = groupMessagesByRadius(messages, radiusInMeters);

  // Filter messages for heatmap (last 1 hour)
  const heatPoints = messages
    .filter(msg => (Date.now() - msg.createdAt) <= 1000 * 60 * 60)
    .map(msg => [msg.lat, msg.lng, 1] as [number, number, number]);

  if (!center || !speechBubbleIcon) return <p>Loading map…</p>;

  return (
    <>
      {geoError && (
        <div className="p-3 mb-2 rounded bg-red-100 text-red-800">
          {geoError}. Showing fallback view.
        </div>
      )}

      <MapContainer
        center={center}
        zoom={16}
        scrollWheelZoom
        style={{ height: '80vh', width: '100%' }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* clustered whisper markers */}
        {groupedMessagesByRadius.map(({ center, messages: group }, index) => {
          const sortedGroup = [...group].sort((a, b) => a.createdAt - b.createdAt);
          return (
            <Marker key={index} position={center} icon={speechBubbleIcon}>
              <Popup>
                <MessageList messages={sortedGroup} />
              </Popup>
            </Marker>
          );
        })}

        {/* Heatmap Layer */}
        <HeatmapLayer points={heatPoints} />
      </MapContainer>

      <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
        <input
          ref={whisperInput}
          placeholder="Leave a whisper…"
          className="flex-grow p-2 border rounded"
        />
        <button className="px-4 py-2 border rounded">Send</button>
      </form>

      <style>{`
        .custom-speech-bubble {
          font-size: 20px;
          text-align: center;
          line-height: 1;
          user-select: none;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
      `}</style>
    </>
  );
}
