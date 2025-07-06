import fs from 'fs';
import path from 'path';

// Path to your whispers.json file in the project root
const dataPath = path.join(process.cwd(), 'whispers.json');

// Helper: read all whispers from JSON file
function readWhispers() {
  try {
    const json = fs.readFileSync(dataPath, 'utf-8');
    return JSON.parse(json);
  } catch (e) {
    // If file missing or invalid, return empty array
    return [];
  }
}

// Helper: save all whispers to JSON file
function saveWhispers(whispers: any[]) {
  fs.writeFileSync(dataPath, JSON.stringify(whispers, null, 2), 'utf-8');
}

// Convert meters radius to approximate degrees latitude/longitude
function metersToDegrees(meters: number) {
  return meters / 111111;
}

// Calculate distance between two lat/lng points using Haversine formula
function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000; // meters
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Filter whispers near lat/lng within radiusMeters and within cutoff time
export function getNearbyMessages(lat: number, lng: number, radiusMeters = 50) {
  const now = Date.now();
  const cutoff = now - 90 * 24 * 60 * 60 * 1000; // 90 days ago
  const whispers = readWhispers();

  return whispers.filter(
    (w) =>
      w.createdAt > cutoff &&
      getDistanceMeters(lat, lng, w.lat, w.lng) <= radiusMeters
  );
}

// Delete whispers near lat/lng within radiusMeters except excludeId
export function deleteMessagesNear(lat: number, lng: number, radiusMeters = 30, excludeId?: number) {
  const whispers = readWhispers();

  const filtered = whispers.filter((w) => {
    if (excludeId !== undefined && w.id === excludeId) return true; // keep the new one
    const dist = getDistanceMeters(lat, lng, w.lat, w.lng);
    return dist > radiusMeters;
  });

  saveWhispers(filtered);
}

// Save new whisper message, assign new ID
export function saveMessage(text: string, lat: number, lng: number) {
  const whispers = readWhispers();
  const now = Date.now();

  // Generate new ID (max existing ID + 1)
  const newId = whispers.length ? Math.max(...whispers.map((w) => w.id)) + 1 : 1;

  const newWhisper = {
    id: newId,
    text,
    lat,
    lng,
    createdAt: now,
  };

  whispers.push(newWhisper);

  // Delete old whispers near this new one except itself
  deleteMessagesNear(lat, lng, 30, newId);

  saveWhispers(whispers);

  return newWhisper;
}
