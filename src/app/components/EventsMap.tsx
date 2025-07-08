'use client';

import { useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { DivIcon } from 'leaflet';

// Dynamically import React-Leaflet components (no SSR)
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

import L from 'leaflet';

const FALLBACK_CENTER: [number, number] = [33.9519, -83.3576]; // Athens, GA

interface Whisper {
  id: number;
  text: string;
  lat: number;
  lng: number;
  createdAt: number;
}

const MessageList = ({ messages }: { messages: Whisper[] }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const messagesReversed = [...messages].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div ref={containerRef} className="space-y-2 max-h-48 overflow-y-auto">
      {messagesReversed.map(msg => (
        <div key={msg.id} className="text-sm p-1 border-b">
          <span className="block text-gray-600 text-xs">
            {new Date(msg.createdAt).toLocaleTimeString()}
          </span>
          <span>{msg.text}</span>
        </div>
      ))}
    </div>
  );
};

export default function EventsMap() {
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Whisper[]>([]);
  const [speechBubbleIcon, setSpeechBubbleIcon] = useState<DivIcon | null>(null);
  const whisperInput = useRef<HTMLInputElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const heatLayerRef = useRef<L.Layer | null>(null);

  // Dynamically import leaflet.heat on client side only
  useEffect(() => {
    import('leaflet.heat').then(() => {
      // leaflet.heat extends L with heatLayer
      // No extra assignment needed, but we wait for import before usage
    });
  }, []);

  useEffect(() => {
    import('leaflet').then(L => {
      const icon = L.divIcon({
        html: '💬',
        className: 'custom-speech-bubble',
        iconSize: [24, 24],
        iconAnchor: [12, 24],
      });
      setSpeechBubbleIcon(icon);
    });
  }, []);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGeoError('Geolocation not supported');
      setCenter(FALLBACK_CENTER);
      return;
    }

    const id = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setCenter([coords.latitude, coords.longitude]);
        setGeoError(null);
      },
      err => {
        console.error(err);
        setGeoError(err.message || 'Location error');
        setCenter(FALLBACK_CENTER);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(id);
  }, []);

  useEffect(() => {
    if (!center) return;
    const [lat, lng] = center;
    fetch(`/api/messages?lat=${lat}&lng=${lng}`)
      .then(r => r.json())
      .then((data: Whisper[]) => setMessages(data))
      .catch(console.error);
  }, [center]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!center) return;

    const text = whisperInput.current?.value.trim() ?? '';
    if (!text) return;

    const [lat, lng] = center;
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lat, lng }),
    });
    const newWhisper = await res.json();
    setMessages(prev => [...prev, newWhisper]);
    if (whisperInput.current) whisperInput.current.value = '';
  }

  useEffect(() => {
    if (!mapRef.current) return;

    // Remove old heat layer if present
    if (heatLayerRef.current) {
      heatLayerRef.current.remove();
      heatLayerRef.current = null;
    }

    const now = Date.now();
    const oneHourMs = 1000 * 60 * 60;

    // Filter messages less than 1 hour old
    const heatPoints = messages
      .filter(msg => now - msg.createdAt <= oneHourMs)
      .map(msg => {
        const intensity = 1 - (now - msg.createdAt) / oneHourMs; // newer = higher intensity
        return [msg.lat, msg.lng, intensity] as [number, number, number];
      });

    if (heatPoints.length === 0) return;

    // @ts-ignore: heatLayer added by leaflet.heat plugin
    heatLayerRef.current = (L as any).heatLayer(heatPoints, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      max: 1,
    }).addTo(mapRef.current);
  }, [messages]);

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
        whenCreated={mapInstance => {
          mapRef.current = mapInstance;
        }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {messages.length > 0 && messages.map(msg => (
          <Marker key={msg.id} position={[msg.lat, msg.lng]} icon={speechBubbleIcon}>
            <Popup>
              <MessageList messages={[msg]} />
            </Popup>
          </Marker>
        ))}
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
