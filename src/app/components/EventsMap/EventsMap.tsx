'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { DivIcon } from 'leaflet';
import { Whisper } from './types';
import { MessageList } from './MessageList';
import { haversineDistance } from './utils';
import { useGeolocation } from './useGeolocation';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

const FALLBACK_CENTER: [number, number] = [33.9519, -83.3576];
const GROUP_RADIUS_METERS = 30.48;

export default function EventsMap() {
  const { position: center, error: geoError } = useGeolocation(FALLBACK_CENTER);
  const [messages, setMessages] = useState<Whisper[]>([]);
  const [speechBubbleIcon, setSpeechBubbleIcon] = useState<DivIcon | null>(null);
  const [greenDotIcon, setGreenDotIcon] = useState<DivIcon | null>(null);
  const whisperInput = useRef<HTMLInputElement>(null);

  // Setup icons
  useEffect(() => {
    import('leaflet').then(L => {
      setSpeechBubbleIcon(
        L.divIcon({
          html: '💬',
          className: 'custom-speech-bubble',
          iconSize: [24, 24],
          iconAnchor: [12, 24],
        })
      );
      setGreenDotIcon(
        L.divIcon({
          html: '🟢',
          className: 'custom-green-dot',
          iconSize: [20, 20],
          iconAnchor: [10, 20],
        })
      );
    });
  }, []);

  // Load messages near center
  useEffect(() => {
    if (!center) return;
    const [lat, lng] = center;
    fetch(`/api/messages?lat=${lat}&lng=${lng}`)
      .then(r => r.json())
      .then((data: Whisper[]) => setMessages(data))
      .catch(console.error);
  }, [center]);

  // Handle submission
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

  // Group messages (only clusters of 2+) and identify ungrouped
  const groupedMessages: Array<{ lat: number; lng: number; messages: Whisper[] }> = [];
  const groupedIds = new Set<number>();

  for (const msg of messages) {
    if (groupedIds.has(msg.id)) continue;

    const group = messages.filter(
      other =>
        !groupedIds.has(other.id) &&
        haversineDistance(msg.lat, msg.lng, other.lat, other.lng) <= GROUP_RADIUS_METERS
    );

    if (group.length > 1) {
      group.forEach(m => groupedIds.add(m.id));

      const avgLat = group.reduce((sum, m) => sum + m.lat, 0) / group.length;
      const avgLng = group.reduce((sum, m) => sum + m.lng, 0) / group.length;

      groupedMessages.push({ lat: avgLat, lng: avgLng, messages: group });
    }
  }

  const ungroupedMessages = messages.filter(msg => !groupedIds.has(msg.id));

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

        {/* Grouped 💬 messages */}
        {groupedMessages.map((group, i) => (
          <Marker key={`group-${i}`} position={[group.lat, group.lng]} icon={speechBubbleIcon}>
            <Popup>
              <MessageList messages={group.messages} />
            </Popup>
          </Marker>
        ))}

        {/* Ungrouped 🟢 messages */}
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
