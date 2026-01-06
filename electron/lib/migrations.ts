import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type Database from "better-sqlite3";
import { app } from "electron";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Migration {
	version: number;
	name: string;
	sql: string;
}

/**
 * Get the migrations directory path
 * Works in both development (compiled to electron-dist) and production
 */
function getMigrationsDir(): string {
	// Try compiled location first (electron-dist/migrations)
	const compiledDir = join(__dirname, "../migrations");
	if (existsSync(compiledDir)) {
		return compiledDir;
	}

	// Fallback to source location (electron/migrations) for development
	const sourceDir = join(__dirname, "../../electron/migrations");
	if (existsSync(sourceDir)) {
		return sourceDir;
	}

	// If app is packaged, try app.asar path
	if (app.isPackaged) {
		const appPath = app.getAppPath();
		const packagedDir = join(appPath, "electron/migrations");
		if (existsSync(packagedDir)) {
			return packagedDir;
		}
	}

	// Default to compiled location
	return compiledDir;
}

/**
 * Get all migration files in order using dynamic discovery
 */
function getMigrations(): Migration[] {
	const migrationsDir = getMigrationsDir();

	try {
		const files = readdirSync(migrationsDir)
			.filter((f) => f.endsWith(".sql"))
			.sort(); // Files should be named with leading zeros for proper sorting

		return files.map((file) => {
			const sql = readFileSync(join(migrationsDir, file), "utf-8");
			/** regex to match the file number and name format(e.g. 001_initial_schema.sql -> ['001_initial_schema.sql', '001', 'initial_schema']) */
			const match = file.match(/^(\d+)_(.+)\.sql$/);

			if (!match) {
				throw new Error(
					`Invalid migration file name: ${file}. Expected format: NNN_name.sql`,
				);
			}

			return {
				version: parseInt(match[1], 10),
				name: match[2],
				sql,
			};
		});
	} catch (error) {
		console.error("Failed to read migrations directory:", error);
		console.error("Looked in:", migrationsDir);
		return [];
	}
}

/**
 * Initialize the migrations table
 */
function initMigrationsTable(db: Database.Database): void {
	db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

/**
 * Get applied migration versions
 */
function getAppliedMigrations(db: Database.Database): number[] {
	const stmt = db.prepare("SELECT version FROM migrations ORDER BY version");
	const rows = stmt.all() as Array<{ version: number }>;
	return rows.map((row) => row.version);
}

/**
 * Mark a migration as applied
 */
function markMigrationApplied(
	db: Database.Database,
	version: number,
	name: string,
): void {
	const stmt = db.prepare(
		"INSERT INTO migrations (version, name) VALUES (?, ?)",
	);
	stmt.run(version, name);
}

/**
 * Run all pending migrations
 */
export function runMigrations(db: Database.Database): void {
	initMigrationsTable(db);
	const appliedVersions = getAppliedMigrations(db);
	const migrations = getMigrations();

	if (migrations.length === 0) {
		console.warn("No migrations found");
		return;
	}

	for (const migration of migrations) {
		if (appliedVersions.includes(migration.version)) {
			console.log(
				`Migration ${migration.version} (${migration.name}) already applied`,
			);
			continue;
		}

		console.log(
			`Running migration ${migration.version} (${migration.name})...`,
		);

		// Run migration in a transaction
		const transaction = db.transaction(() => {
			db.exec(migration.sql);
			markMigrationApplied(db, migration.version, migration.name);
		});

		try {
			transaction();
			console.log(
				`Migration ${migration.version} (${migration.name}) applied successfully`,
			);
		} catch (error) {
			console.error(`Failed to apply migration ${migration.version}:`, error);
			throw error; // Stop on first failure
		}
	}
}
