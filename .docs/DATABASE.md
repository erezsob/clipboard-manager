# Database Schema & Migrations

## Current Schema

```sql
CREATE TABLE history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## Applied Migrations

### Migration 001: Initial Schema
- Creates `history` table with basic fields
- Stores clipboard content, type, and timestamp

### Migration 002: Add Favorites Support
```sql
ALTER TABLE history ADD COLUMN is_favorite INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_is_favorite ON history(is_favorite);
```
- Adds `is_favorite` column (INTEGER, 0 = false, 1 = true)
- Creates index for efficient favorites filtering
- ✅ Applied

### Migration 003: Add RTF Support
```sql
ALTER TABLE history ADD COLUMN rtf TEXT;
```
- Adds nullable `rtf` column for storing RTF clipboard data
- Plain text stored in `content`, RTF stored separately
- Preserves rich text formatting on paste
- ✅ Applied

## Planned Migrations

### Migration 004: Create Snippets Table
```sql
CREATE TABLE snippets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT, -- JSON array or comma-separated
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_used_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_snippets_title ON snippets(title);
CREATE INDEX IF NOT EXISTS idx_snippets_tags ON snippets(tags);
CREATE INDEX IF NOT EXISTS idx_snippets_last_used ON snippets(last_used_at);
```
- Creates separate table for user-created snippets
- Includes title, content, tags, and timestamps
- Indexes for efficient searching and sorting
- 🔨 Planned for Phase 6

## Migration Patterns

### Migration File Naming
- Format: `XXX_description.sql`
- Example: `001_initial_schema.sql`, `002_add_favorites.sql`
- Sequential numbering ensures proper execution order

### Migration Execution
- Migrations run automatically on app startup
- Managed by `electron/lib/migrations.ts`
- Tracks applied migrations in `migrations` table
- Prevents duplicate execution

### Migration Best Practices
1. Always use transactions for data migrations
2. Use `IF NOT EXISTS` for idempotent operations
3. Create indexes for frequently queried columns
4. Test migrations on sample data before deployment
5. Never modify existing migration files after deployment

## Database Operations

### Location
- Database file: Stored in Electron's userData directory
- Path: `~/Library/Application Support/mac-clipboard-manager/clipboard.db`
- Created automatically on first run

### Operations
- All database operations go through IPC (Inter-Process Communication)
- Main process handles all SQLite operations
- Renderer process calls via `window.electronAPI.db.*`
- See `src/lib/db.ts` for typed interface

### Key Operations
- `getHistory()` - Fetch clipboard history with pagination
- `addClip()` - Add new clipboard item (with duplicate detection)
- `deleteHistoryItem()` - Delete specific item
- `clearAllHistory()` - Clear all history
- `toggleFavorite()` - Toggle favorite status

## Database Design Notes

- **SQLite**: Chosen for simplicity and local storage needs
- **No foreign keys**: Simple schema, no complex relationships
- **Text timestamps**: Using `datetime('now')` for simplicity
- **Integer booleans**: SQLite doesn't have native boolean type
- **Indexes**: Added for performance on frequently queried columns

