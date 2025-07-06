import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Detect if running on Vercel serverless environment
const isVercel = !!process.env.VERCEL;

// Choose writable directory on Vercel, else use local data folder
const dbDir = isVercel ? os.tmpdir() : path.join(process.cwd(), 'data');

fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, 'whispers.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

// Rest of your code unchanged...
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
  const cutoff = now - 30 * 24 * 60 * 60 * 1000;

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
  const cutoff = now - 30 * 24 * 60 * 60 * 1000;
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

  deleteMessagesNear(lat, lng, 30, result.lastInsertRowid as number);

  return {
    id: result.lastInsertRowid as number,
    text,
    lat,
    lng,
    createdAt: now,
  };
}
