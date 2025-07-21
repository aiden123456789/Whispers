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

  // Insert the new message
  await turso.execute(
    `
      INSERT INTO whispers (text, lat, lng, createdAt)
      VALUES (?, ?, ?, ?);
    `,
    [text, lat, lng, now]
  );

  // Retrieve the auto-incremented ID
  const { rows } = await turso.execute(`SELECT last_insert_rowid() AS id;`);
  const id = (rows[0] as Row).id as number;

  return { id, text, lat, lng, createdAt: now };
}

// 🆕 Get all recent messages (up to 90 days old), sorted by newest first
export async function getAllRecentMessages(limit = 100) {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 90 days

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
