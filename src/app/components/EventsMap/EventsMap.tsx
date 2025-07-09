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
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false }); // <-- Add this

const FALLBACK_CENTER: [number, number] = [33.9519, -83.3576];
const GROUP_RADIUS_METERS = 30.48;

export default function EventsMap() {
  const { position: center, error: geoError } = useGeolocation(FALLBACK_CENTER);
  const [messages, setMessages] = useState<Whisper[]>([]);
  const [speechBubbleIcon, setSpeechBubbleIcon] = useState<DivIcon | null>(null);
  const [greenDotIcon, setGreenDotIcon] = useState<DivIcon | null>(null);
  const whisperInput = useRef<HTMLInputElement>(null);
  const [myMessageId, setMyMessageId] = useState<number | null>(null);

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
    setMyMessageId(newWhisper.id);
    if (whisperInput.current) whisperInput.current.value = '';
  }

  // Build user-local group (including their own message)
  const groupedMessages: Array<{ lat: number; lng: number; messages: Whisper[] }> = [];
  const groupSet = new Set<number>();
  const ungroupedMessages: Whisper[] = [];

  if (center) {
    const [lat, lng] = center;

    const nearby = messages.filter(
      msg => haversineDistance(lat, lng, msg.lat, msg.lng) <= GROUP_RADIUS_METERS
    );

    if (nearby.length > 0) {
      nearby.forEach(msg => groupSet.add(msg.id));

      const avgLat = nearby.reduce((sum, msg) => sum + msg.lat, 0) / nearby.length;
      const avgLng = nearby.reduce((sum, msg) => sum + msg.lng, 0) / nearby.length;

      groupedMessages.push({ lat: avgLat, lng: avgLng, messages: nearby });
    }

    // Ensure user's message is included even if it was alone
    if (myMessageId !== null && !groupSet.has(myMessageId)) {
      const mine = messages.find(msg => msg.id === myMessageId);
      if (mine) {
        groupSet.add(mine.id);
        groupedMessages.push({ lat: mine.lat, lng: mine.lng, messages: [mine] });
      }
    }

    // Everything else is an ungrouped green dot
    for (const msg of messages) {
      if (!groupSet.has(msg.id)) {
        ungroupedMessages.push(msg);
      }
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

        {/* 💬 Nearby or user's own messages */}
        {groupedMessages.map((group, i) => (
          <Marker key={`group-${i}`} position={[group.lat, group.lng]} icon={speechBubbleIcon}>
            <Popup>
              <MessageList messages={group.messages} />
            </Popup>
          </Marker>
        ))}

        {/* 🟢 Faraway messages – no popup */}
        {ungroupedMessages.map((msg, i) => (
          <Marker key={`dot-${i}`} position={[msg.lat, msg.lng]} icon={greenDotIcon} />
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
