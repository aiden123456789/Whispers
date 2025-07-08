// src/lib/db.ts
import { createClient, Row } from "@libsql/client";

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  throw new Error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
}

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

/* ---------- one‑time table creation (runs on first import) ---------- */
await turso.execute(`
  CREATE TABLE IF NOT EXISTS whispers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT,
    lat  REAL,
    lng  REAL,
    createdAt INTEGER
  );
`);

export async function getNearbyMessages(
  lat: number,
  lng: number,
  radiusMeters = 50,
) {
  const cutoff        = Date.now() - 90 * 24 * 60 * 60 * 1000; // 90 days
  const degreeRadius  = radiusMeters / 111_111;

  const { rows } = await turso.execute(
    `
      SELECT * FROM whispers
      WHERE createdAt > ?
        AND lat BETWEEN ? AND ?
        AND lng BETWEEN ? AND ?
    `,
    [
      cutoff,
      lat - degreeRadius,
      lat + degreeRadius,
      lng - degreeRadius,
      lng + degreeRadius,
    ],
  );

  return (rows as Row[]).map((r) => ({
    id:         r.id,
    text:       r.text,
    lat:        r.lat,
    lng:        r.lng,
    createdAt:  r.createdAt,
  }));
}

export async function saveMessage(text: string, lat: number, lng: number) {
  const now = Date.now();

  // Insert the new message
  await turso.execute(
    `
      INSERT INTO whispers (text, lat, lng, createdAt)
      VALUES (?, ?, ?, ?);
    `,
    [text, lat, lng, now],
  );

  // Retrieve the auto-incremented ID
  const { rows } = await turso.execute(`SELECT last_insert_rowid() AS id;`);
  const id = (rows[0] as Row).id as number;

  return { id, text, lat, lng, createdAt: now };
}
