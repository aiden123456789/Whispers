import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure `data/` folder exists
const dbPath = path.join(process.cwd(), 'data/whispers.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Create table if not exists
db.prepare(`
  CREATE TABLE IF NOT EXISTS whispers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT,
    lat REAL,
    lng REAL,
    createdAt INTEGER
  )
`).run();

export function getNearbyMessages(lat: number, lng: number, radiusMeters = 50) {
  const now = Date.now();
  const cutoff = now - 90 * 24 * 60 * 60 * 1000; // 90 days ago

  // Approximate degree distance for radiusMeters (~111,111 meters per degree)
  const degreeRadius = radiusMeters / 111111;

  return db.prepare(`
    SELECT * FROM whispers
    WHERE createdAt > ?
      AND lat BETWEEN ? AND ?
      AND lng BETWEEN ? AND ?
  `).all(
    cutoff,
    lat - degreeRadius,
    lat + degreeRadius,
    lng - degreeRadius,
    lng + degreeRadius
  );
}

export function deleteMessagesNear(lat: number, lng: number, radiusMeters = 30, excludeId?: number) {
  const now = Date.now();
  const cutoff = now - 90 * 24 * 60 * 60 * 1000; // 90 days ago
  const degreeRadius = radiusMeters / 111111;

  let sql = `
    DELETE FROM whispers
    WHERE createdAt > ?
      AND lat BETWEEN ? AND ?
      AND lng BETWEEN ? AND ?
  `;

  if (excludeId !== undefined) {
    sql += ` AND id != ?`;
  }

  const stmt = db.prepare(sql);

  if (excludeId !== undefined) {
    return stmt.run(cutoff, lat - degreeRadius, lat + degreeRadius, lng - degreeRadius, lng + degreeRadius, excludeId);
  } else {
    return stmt.run(cutoff, lat - degreeRadius, lat + degreeRadius, lng - degreeRadius, lng + degreeRadius);
  }
}

export function saveMessage(text: string, lat: number, lng: number) {
  const now = Date.now();
  const result = db.prepare(`
    INSERT INTO whispers (text, lat, lng, createdAt)
    VALUES (?, ?, ?, ?)
  `).run(text, lat, lng, now);

  // Delete old messages near this new message, but exclude this new message itself
  deleteMessagesNear(lat, lng, 30, result.lastInsertRowid as number);

  return {
    id: result.lastInsertRowid as number,
    text,
    lat,
    lng,
    createdAt: now,
  };
}
