'use client';

import EventsMap from './components/EventsMap/EventsMap';
import AgeGate from './components/AgeGate';

export default function HomePage() {
  return (
    <AgeGate>
      <main className="min-h-screen p-4">
        <EventsMap />
      </main>
    </AgeGate>
  );
}
