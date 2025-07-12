'use client';

import { useState, useEffect, FormEvent } from 'react';
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
const HeatmapLayer = dynamic(() => import('./HeatmapLayer').then(m => m.HeatmapLayer), { ssr: false });

const FALLBACK_CENTER: [number, number] = [33.9519, -83.3576];
const GROUP_RADIUS_METERS = 304;
const MAX_CHARACTERS = 50;
const RATE_LIMIT_SECONDS = 60;
const STORAGE_KEY = 'lastMessageTimestamp';

export default function EventsMap() {
  const { position: center, error: geoError } = useGeolocation(FALLBACK_CENTER);
  const [messages, setMessages] = useState<Whisper[]>([]);
  const [speechBubbleIcon, setSpeechBubbleIcon] = useState<DivIcon | null>(null);
  const [myMessageId, setMyMessageId] = useState<number | null>(null);
  const [whisperText, setWhisperText] = useState('');
  const [lastMessageTime, setLastMessageTime] = useState<number | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false); // 🆕

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = parseInt(stored);
      if (!isNaN(parsed)) setLastMessageTime(parsed);
    }
  }, []);

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
    });
  }, []);

  useEffect(() => {
    if (!center) return;
    fetch('/api/messages')
      .then(res => res.json())
      .then((data: Whisper[]) => setMessages(data))
      .catch(console.error);
  }, [center]);

  useEffect(() => {
    if (!lastMessageTime) return;
    const interval = setInterval(() => {
      const secondsPassed = Math.floor((Date.now() - lastMessageTime) / 1000);
      const remaining = RATE_LIMIT_SECONDS - secondsPassed;
      setCooldown(remaining > 0 ? remaining : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, [lastMessageTime]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!center || sending) return;

    const now = Date.now();
    const secondsPassed = lastMessageTime ? Math.floor((now - lastMessageTime) / 1000) : RATE_LIMIT_SECONDS;

    if (secondsPassed < RATE_LIMIT_SECONDS) {
      alert(`Please wait ${RATE_LIMIT_SECONDS - secondsPassed}s before sending another whisper.`);
      return;
    }

    const text = whisperText.trim();
    if (!text || text.length > MAX_CHARACTERS) return;

    setSending(true); // ✅ lock while sending

    try {
      const [lat, lng] = center;
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lat, lng }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        alert(error || 'Failed to send message');
        return;
      }

      const newWhisper: Whisper = await res.json();
      setMessages(prev => [...prev, newWhisper]);
      setMyMessageId(newWhisper.id);
      setWhisperText('');
      setLastMessageTime(now);
      localStorage.setItem(STORAGE_KEY, now.toString());
    } catch (err) {
      console.error(err);
      alert('Failed to send message.');
    } finally {
      setSending(false); // ✅ unlock
    }
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
  if (myMessage && !groupMessages.some(m => m.id === myMessage!.id)) {
    groupMessages.push(myMessage);
  }

  const clusterLat = groupMessages.length > 0
    ? groupMessages.reduce((sum, m) => sum + m.lat, 0) / groupMessages.length
    : 0;
  const clusterLng = groupMessages.length > 0
    ? groupMessages.reduce((sum, m) => sum + m.lng, 0) / groupMessages.length
    : 0;

  const heatPoints = messages.map(m => [m.lat, m.lng, 0.6] as [number, number, number]);

  if (!center || !speechBubbleIcon) return <p>Loading map…</p>;

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
        <HeatmapLayer points={heatPoints} />
      </MapContainer>

      <form onSubmit={handleSubmit} className="flex flex-col gap-1 mt-4">
        <div className="flex gap-2">
          <input
            value={whisperText}
            onChange={e => setWhisperText(e.target.value)}
            maxLength={MAX_CHARACTERS}
            placeholder="Leave a whisper…"
            className="flex-grow p-2 border rounded"
          />
          <button
            className="px-4 py-2 border rounded"
            disabled={cooldown > 0 || sending}
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
        <div className="text-sm text-gray-500 text-right">
          {MAX_CHARACTERS - whisperText.length} characters left
          {cooldown > 0 && ` • Wait ${cooldown}s`}
        </div>
      </form>

      <footer className="mt-8 text-center text-sm text-gray-600">
        ❤️ Like this project? Support it on{' '}
        <a
          href="https://patreon.com/AKingB15"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline hover:text-blue-700"
        >
          Patreon
        </a>
        .
      </footer>

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
