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

export async function saveMessage(text: string, lat: number, lng: number) {
  const now = Date.now();

  
  const roundedLat = Math.round(lat * 10) / 10;
  const roundedLng = Math.round(lng * 10) / 10;

  // Insert the new message
  await turso.execute(
    `
      INSERT INTO whispers (text, lat, lng, createdAt)
      VALUES (?, ?, ?, ?);
    `,
    [text, roundedLat, roundedLng, now]
  );

  // Retrieve the auto-incremented ID
  const { rows } = await turso.execute(`SELECT last_insert_rowid() AS id;`);
  const id = (rows[0] as Row).id as number;

  return { id, text, lat: roundedLat, lng: roundedLng, createdAt: now };
}


// 🆕 Get all recent messages (up to 30 days old), sorted by newest first
export async function getAllRecentMessages(limit = 100) {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days

  // Delete old messages first
  await turso.execute(
    `
      DELETE FROM whispers
      WHERE createdAt <= ?
    `,
    [cutoff]
  );

  // Now select recent messages
  const { rows } = await turso.execute(
    `
      SELECT * FROM whispers
      WHERE createdAt > ?
      ORDER BY createdAt DESC
      LIMIT ?
    `,
    [cutoff, limit]
  );

  return (rows as Row[]).map((r) => ({
    id: r.id,
    text: r.text,
    lat: r.lat,
    lng: r.lng,
    createdAt: r.createdAt,
  }));
}

export { turso };
