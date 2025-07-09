'use client';

import { useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { DivIcon } from 'leaflet';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

const FALLBACK_CENTER: [number, number] = [33.9519, -83.3576]; // Athens, GA
const GROUP_RADIUS_METERS = 30.48; // 100 feet

interface Whisper {
  id: number;
  text: string;
  lat: number;
  lng: number;
  createdAt: number;
}

const MessageList = ({ messages }: { messages: Whisper[] }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="space-y-2 max-h-48 overflow-y-auto">
      {[...messages]
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(msg => (
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

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function EventsMap() {
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Whisper[]>([]);
  const [speechBubbleIcon, setSpeechBubbleIcon] = useState<DivIcon | null>(null);
  const [greenDotIcon, setGreenDotIcon] = useState<DivIcon | null>(null);
  const whisperInput = useRef<HTMLInputElement>(null);

  // Create Leaflet DivIcons for speech bubble and green dot
  useEffect(() => {
    import('leaflet').then(L => {
      const speechIcon = L.divIcon({
        html: '💬',
        className: 'custom-speech-bubble',
        iconSize: [24, 24],
        iconAnchor: [12, 24],
      });
      setSpeechBubbleIcon(speechIcon);

      const greenIcon = L.divIcon({
        html: '🟢',
        className: 'custom-green-dot',
        iconSize: [20, 20],
        iconAnchor: [10, 20],
      });
      setGreenDotIcon(greenIcon);
    });
  }, []);

  // Track user geolocation
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

  // Fetch messages near current center
  useEffect(() => {
    if (!center) return;
    const [lat, lng] = center;
    fetch(`/api/messages?lat=${lat}&lng=${lng}`)
      .then(r => r.json())
      .then((data: Whisper[]) => setMessages(data))
      .catch(console.error);
  }, [center]);

  // Handle form submission to post new whisper
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

  // Group messages that are within GROUP_RADIUS_METERS of each other
  const groupedMessages: Array<{ lat: number; lng: number; messages: Whisper[] }> = [];
  const ungroupedMessages: Whisper[] = [];
  const assignedIds = new Set<number>();

  for (const msg of messages) {
    if (assignedIds.has(msg.id)) continue;

    const nearbyGroup = messages.filter(
      m =>
        !assignedIds.has(m.id) &&
        haversineDistance(msg.lat, msg.lng, m.lat, m.lng) <= GROUP_RADIUS_METERS
    );

    nearbyGroup.forEach(m => assignedIds.add(m.id));

    if (nearbyGroup.length > 1) {
      // Compute average location for the group marker
      const avgLat = nearbyGroup.reduce((sum, m) => sum + m.lat, 0) / nearbyGroup.length;
      const avgLng = nearbyGroup.reduce((sum, m) => sum + m.lng, 0) / nearbyGroup.length;
      groupedMessages.push({ lat: avgLat, lng: avgLng, messages: nearbyGroup });
    } else {
      ungroupedMessages.push(nearbyGroup[0]);
    }
  }

  if (!center || !speechBubbleIcon || !greenDotIcon) return <p>Loading map…</p>;

  return (
    <>
      {geoError && (
        <div className="p-3 mb-2 rounded bg-red-100 text-red-800">
          {geoError}. Showing fallback view.
        </div>
      )}

      <MapContainer center={center} zoom={16} scrollWheelZoom style={{ height: '80vh', width: '100%' }}>
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Grouped messages as speech bubbles */}
        {groupedMessages.map((group, i) => (
          <Marker key={`group-${i}`} position={[group.lat, group.lng]} icon={speechBubbleIcon}>
            <Popup>
              <MessageList messages={group.messages} />
            </Popup>
          </Marker>
        ))}

        {/* Single ungrouped messages as green dots */}
        {ungroupedMessages.map((msg, i) => (
          <Marker key={`solo-${i}`} position={[msg.lat, msg.lng]} icon={greenDotIcon}>
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
        .custom-green-dot {
          font-size: 18px;
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
