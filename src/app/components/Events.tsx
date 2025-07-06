'use client';

import dynamic from 'next/dynamic';

/**
 * Dynamically import the Leaflet‑based map **only on the client** to avoid
 * “window is not defined” errors during SSR.
 */
const EventsMap = dynamic(() => import('./EventsMap'), { ssr: false });

export default function Events() {
  return <EventsMap />;
}
