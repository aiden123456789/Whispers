// src/lib/db.ts
import { createClient } from "@libsql/client";

export const turso = createClient({
  url: process.env.TURSO_DATABASE_URL!,     // from .env.local or Vercel env vars
  authToken: process.env.TURSO_AUTH_TOKEN!, // from .env.local or Vercel env vars
});

export async function getNearbyMessages(
  lat: number,
  lng: number,
  radiusMeters = 50
) {
  const now = Date.now();
  const cutoff = now - 90 * 24 * 60 * 60 * 1000; // 90 days ago
  const degreeRadius = radiusMeters / 111111;

  const sql = `
    SELECT * FROM whispers
    WHERE createdAt > ?
      AND lat BETWEEN ? AND ?
      AND lng BETWEEN ? AND ?
  `;

  const result = await turso.execute(sql, [
    cutoff,
    lat - degreeRadius,
    lat + degreeRadius,
    lng - degreeRadius,
    lng + degreeRadius,
  ]);

  // result.rows is an array of arrays by default, convert as needed
  return result.rows.map(([id, text, lat, lng, createdAt]) => ({
    id,
    text,
    lat,
    lng,
    createdAt,
  }));
}

export async function saveMessage(text: string, lat: number, lng: number) {
  const now = Date.now();

  const insertSql = `
    INSERT INTO whispers (text, lat, lng, createdAt)
    VALUES (?, ?, ?, ?)
  `;

  const result = await turso.execute(insertSql, [text, lat, lng, now]);

  // Turso may not return lastInsertRowid directly, so you might fetch the last inserted row separately if needed.
  // For simplicity, just return the data you saved:
  return {
    id: null, // You can enhance this by querying the last inserted row if needed
    text,
    lat,
    lng,
    createdAt: now,
  };
}
