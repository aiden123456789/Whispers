// src/lib/db.ts
import { createClient } from "@libsql/client";

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  throw new Error("Missing Turso environment variables: TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
}

export const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
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

  return result.rows.map(row => ({
    id: row.id,
    text: row.text,
    lat: row.lat,
    lng: row.lng,
    createdAt: row.createdAt,
  }));
}


export async function saveMessage(text: string, lat: number, lng: number) {
  const now = Date.now();

  const insertSql = `
    INSERT INTO whispers (text, lat, lng, createdAt)
    VALUES (?, ?, ?, ?)
  `;

  await turso.execute(insertSql, [text, lat, lng, now]);

  // Turso does not return lastInsertRowid; fetch the last inserted row as a workaround:
  const fetchLastInsertedSql = `
    SELECT * FROM whispers
    WHERE rowid = (SELECT MAX(rowid) FROM whispers)
  `;

  const lastInsertedResult = await turso.execute(fetchLastInsertedSql);
  const [lastRow] = lastInsertedResult.rows;

  return {
    id: lastRow ? lastRow[0] : null,
    text,
    lat,
    lng,
    createdAt: now,
  };
}
