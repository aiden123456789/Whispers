'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
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
const GROUP_RADIUS_METERS = 200;

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

    fetch('/api/messages')
      .then(res => res.json())
      .then((data: Whisper[]) => {
        console.log('[DEBUG] Loaded messages:', data);
        setMessages(data);
      })
      .catch(console.error);
  }, [center]);

  async function handleSubmit(e: FormEvent) {
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
    const newWhisper: Whisper = await res.json();
    setMessages(prev => [...prev, newWhisper]);
    setMyMessageId(newWhisper.id);
    if (whisperInput.current) whisperInput.current.value = '';
  }

  const nearMessages: Whisper[] = [];
  const farMessages: Whisper[] = [];
  let myMessage: Whisper | null = null;

  if (center) {
    const [userLat, userLng] = center;

    for (const msg of messages) {
      if (msg.lat == null || msg.lng == null) continue;

      const distance = haversineDistance(userLat, userLng, msg.lat, msg.lng);
      const isNear = distance <= GROUP_RADIUS_METERS;
      const isMine = msg.id === myMessageId;

      if (isMine) myMessage = msg;
      if (isNear) nearMessages.push(msg);
      else if (!isMine) farMessages.push(msg);
    }
  }

  const groupMessages = [...nearMessages];
  if (myMessage && !groupMessages.some(m => m.id === myMessage.id)) {
    groupMessages.push(myMessage);
  }

  const clusterLat = groupMessages.length > 0
    ? groupMessages.reduce((sum, m) => sum + m.lat, 0) / groupMessages.length
    : 0;
  const clusterLng = groupMessages.length > 0
    ? groupMessages.reduce((sum, m) => sum + m.lng, 0) / groupMessages.length
    : 0;

  if (!center || !speechBubbleIcon || !greenDotIcon) return <p>Loading map…</p>;

  return (
    <>
      {geoError && (
        <div className="p-3 mb-2 rounded bg-red-100 text-red-800">
          {geoError}. Showing fallback view.
        </div>
      )}

      <MapContainer center={center} zoom={14} scrollWheelZoom style={{ height: '80vh', width: '100%' }}>
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {groupMessages.length > 0 && (
          <Marker position={[clusterLat, clusterLng]} icon={speechBubbleIcon}>
            <Popup>
              <MessageList messages={groupMessages} />
            </Popup>
          </Marker>
        )}

        {farMessages.map((msg, i) => (
          <Marker key={`green-${msg.id ?? i}`} position={[msg.lat, msg.lng]} icon={greenDotIcon} />
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
          font-size: 28px;
          text-align: center;
          line-height: 1;
          user-select: none;
          background: white !important;
          border: 2px solid green !important;
          border-radius: 50% !important;
          box-shadow: 0 0 6px rgba(0, 255, 0, 0.9) !important;
        }
      `}</style>
    </>
  );
}
