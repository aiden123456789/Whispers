'use client';

import { useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import L, { DivIcon, Map } from 'leaflet';

// 👉  Dynamically load every React‑Leaflet piece (no SSR)
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
  const containerRef = useRef<HTMLDivElement>(null);

  // Reverse messages so newest appear at the top
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

// Helper: Calculate distance between two lat/lng points (meters)
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (x: number) => (x * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Cluster messages within radiusMeters (e.g., 30.48 meters)
function groupMessagesByRadius(messages: Whisper[], radiusMeters: number) {
  type Group = {
    center: [number, number];
    messages: Whisper[];
  };

  const groups: Group[] = [];

  messages.forEach(msg => {
    // Try to find a group that is within radiusMeters of this msg
    const foundGroup = groups.find(({ center }) =>
      haversineDistance(center[0], center[1], msg.lat, msg.lng) <= radiusMeters
    );

    if (foundGroup) {
      foundGroup.messages.push(msg);
    } else {
      // Create new group centered at this message's location
      groups.push({ center: [msg.lat, msg.lng], messages: [msg] });
    }
  });

  return groups;
}

export default function EventsMap() {
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Whisper[]>([]);
  const [speechBubbleIcon, setSpeechBubbleIcon] = useState<DivIcon | null>(null);
  const whisperInput = useRef<HTMLInputElement>(null);
  const mapRef = useRef<Map | null>(null);
  const heatLayerRef = useRef<L.Layer | null>(null);

  /* ----------  create custom Leaflet icon on client ---------- */
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

  const radiusInMeters = 30.48; // 100 feet

  // Use the clustering function here
  const groupedMessagesByRadius = groupMessagesByRadius(messages, radiusInMeters);

  /* ---------- heatmap effect ---------- */
  useEffect(() => {
    if (!mapRef.current) return;

    // Dynamically import leaflet.heat plugin
    import('leaflet.heat').then(() => {
      // Filter messages from last hour
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const recentMessages = messages.filter(msg => msg.createdAt >= oneHourAgo);

      // Prepare heat points: [lat, lng, intensity] — intensity = 1 for each point
      const heatPoints = recentMessages.map(msg => [msg.lat, msg.lng, 1]);

      // Remove existing heatLayer if any
      if (heatLayerRef.current) {
        heatLayerRef.current.remove();
        heatLayerRef.current = null;
      }

      // Create new heatLayer and add to map
      heatLayerRef.current = (L as any).heatLayer(heatPoints, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        max: 1,
      }).addTo(mapRef.current!);
    });
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

        {/* clustered whisper markers */}
        {groupedMessagesByRadius.map(({ center, messages: group }, index) => {
          // Sort oldest → newest so newest appear at bottom for popup ordering, but
          // actual display reversed in MessageList now so newest top
          const sortedGroup = [...group].sort((a, b) => a.createdAt - b.createdAt);

          return (
            <Marker key={index} position={center} icon={speechBubbleIcon}>
              <Popup>
                <MessageList messages={sortedGroup} />
              </Popup>
            </Marker>
          );
        })}
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
