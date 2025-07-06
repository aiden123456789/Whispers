'use client';

import { useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { DivIcon } from 'leaflet';


// 👉  Dynamically load every React‑Leaflet piece (no SSR)
const MapContainer = dynamic(
  () => import('react-leaflet').then(m => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then(m => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then(m => m.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then(m => m.Popup),
  { ssr: false }
);

const FALLBACK_CENTER: [number, number] = [33.9519, -83.3576]; // Athens, GA

interface Whisper {
  id: number;
  text: string;
  lat: number;
  lng: number;
  createdAt: number;
}

export default function EventsMap() {
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Whisper[]>([]);
  const [speechBubbleIcon, setSpeechBubbleIcon] = useState<DivIcon | null>(null);
  const whisperInput = useRef<HTMLInputElement>(null);

  /* ----------  create custom Leaflet icon on client ---------- */
  useEffect(() => {
    import('leaflet').then(L => {
      const icon = L.divIcon({
        html: '💬…',
        className: 'custom-speech-bubble',
        iconSize: [24, 24],
        iconAnchor: [12, 24],
      });
      setSpeechBubbleIcon(icon);
    });
  }, []);

  /* ----------  live geolocation tracking ---------- */
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

  /* ----------  fetch whispers whenever user moves ---------- */
  useEffect(() => {
    if (!center) return;
    const [lat, lng] = center;
    fetch(`/api/messages?lat=${lat}&lng=${lng}`)
      .then(r => r.json())
      .then((data: Whisper[]) => setMessages(data))
      .catch(console.error);
  }, [center]);

  /* ----------  submit a new whisper ---------- */
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

  if (!center || !speechBubbleIcon) return <p>Loading map …</p>;

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

        

        {/* nearby whispers */}
        {messages.map(({ id, text, lat, lng }) => (
          <Marker key={id} position={[lat, lng]} icon={speechBubbleIcon}>
            <Popup>{text}</Popup>
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
