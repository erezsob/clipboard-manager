import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;

/**
 * Initialize the database connection and create tables if they don't exist
 */
export async function initDB(): Promise<void> {
  if (db) return;

  db = await Database.load("sqlite:clipboard.db");

  // Create history table if it doesn't exist
  await db.execute(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'text',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Create index for faster queries
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_created_at ON history(created_at DESC)
  `);
}

/**
 * Add a clipboard entry if it's different from the most recent entry
 */
export async function addClip(text: string): Promise<void> {
  if (!db) {
    await initDB();
  }

  if (!text || text.trim().length === 0) {
    return;
  }

  // Check if the most recent entry matches this text
  const recent = await db?.select<Array<{ content: string }>>(
    "SELECT content FROM history ORDER BY created_at DESC LIMIT 1"
  );

  if (recent && recent.length > 0 && recent[0].content === text) {
    // Duplicate of most recent entry, skip
    return;
  }

  // Insert new entry
  await db?.execute("INSERT INTO history (content, type) VALUES ($1, $2)", [
    text,
    "text",
  ]);
}

/**
 * Get the last 50 history items
 */
export async function getHistory(limit: number = 50): Promise<
  Array<{
    id: number;
    content: string;
    type: string;
    created_at: string;
  }>
> {
  if (!db) {
    await initDB();
  }

  const results = await db?.select<
    Array<{
      id: number;
      content: string;
      type: string;
      created_at: string;
    }>
  >(
    "SELECT id, content, type, created_at FROM history ORDER BY created_at DESC LIMIT $1",
    [limit]
  );

  return results || [];
}

/**
 * Search history by content
 */
export async function searchHistory(
  query: string,
  limit: number = 50
): Promise<
  Array<{
    id: number;
    content: string;
    type: string;
    created_at: string;
  }>
> {
  if (!db) {
    await initDB();
  }

  const results = await db?.select<
    Array<{
      id: number;
      content: string;
      type: string;
      created_at: string;
    }>
  >(
    "SELECT id, content, type, created_at FROM history WHERE content LIKE $1 ORDER BY created_at DESC LIMIT $2",
    [`%${query}%`, limit]
  );

  return results || [];
}

/**
 * Delete a history item by ID
 */
export async function deleteHistoryItem(id: number): Promise<void> {
  if (!db) {
    await initDB();
  }

  await db?.execute("DELETE FROM history WHERE id = $1", [id]);
}

/**
 * Clear all history
 */
export async function clearAllHistory(): Promise<void> {
  if (!db) {
    await initDB();
  }

  await db?.execute("DELETE FROM history");
}
