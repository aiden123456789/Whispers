// app/components/SpeechBubbleMarker.tsx
'use client';

import { Marker, Popup } from 'react-leaflet';
import { useEffect, useState } from 'react';
import { DivIcon } from 'leaflet';

interface Whisper {
  id: number;
  text: string;
  lat: number;
  lng: number;
  createdAt: number;
}

interface SpeechBubbleMarkerProps {
  position: [number, number];
  messages: Whisper[];
}

export default function SpeechBubbleMarker({ position, messages }: SpeechBubbleMarkerProps) {
  const [speechBubbleIcon, setSpeechBubbleIcon] = useState<DivIcon | null>(null);

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

  if (!speechBubbleIcon) return null;

  return (
    <Marker position={position} icon={speechBubbleIcon}>
      <Popup>
        <div className="space-y-2 max-h-48 overflow-y-auto">
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
      </Popup>
    </Marker>
  );
}
