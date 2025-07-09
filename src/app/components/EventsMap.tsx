// app/components/EventsMap.tsx
'use client';

import { MapContainer, TileLayer } from 'react-leaflet';
import GreenDotMarker from './GreenDotMarker';
import SpeechBubbleMarker from './SpeechBubbleMarker';

interface Whisper {
  id: number;
  text: string;
  lat: number;
  lng: number;
  createdAt: number;
}

interface GroupedMessages {
  lat: number;
  lng: number;
  messages: Whisper[];
}

// Assume center, messages, grouping logic etc. are defined here

export default function EventsMap() {
  // ... your existing state and hooks

  // Your grouping logic (splitting grouped vs ungrouped)

  return (
    <MapContainer /* ... props */>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />

      {groupedMessages.map((group, i) => (
        <SpeechBubbleMarker
          key={`group-${i}`}
          position={[group.lat, group.lng]}
          messages={group.messages}
        />
      ))}

      {ungroupedMessages.map((msg, i) => (
        <GreenDotMarker
          key={`solo-${i}`}
          position={[msg.lat, msg.lng]}
          messages={[msg]}
        />
      ))}
    </MapContainer>
  );
}
