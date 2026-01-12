import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import {
	app,
	BrowserWindow,
	clipboard,
	dialog,
	globalShortcut,
	ipcMain,
	Menu,
	nativeImage,
	shell,
	Tray,
} from "electron";
import {
	checkAccessibilityPermission,
	simulatePaste,
} from "./lib/applescript.js";
import { runMigrations } from "./lib/migrations.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Types
// ============================================================================

/**
 * Represents a row from the history table.
 * Used for explicit typing of database query results.
 */
type HistoryRow = {
	id: number;
	content: string;
	type: string;
	created_at: string;
	is_favorite: number;
};

// ============================================================================
// Pure Functions
// ============================================================================

/**
 * Normalizes whitespace in text for near-duplicate detection.
 * Pure function - no side effects.
 *
 * @param text - Input text to normalize
 * @returns Text with trimmed edges and collapsed internal whitespace
 */
export const normalizeWhitespace = (text: string): string =>
	text.trim().replace(/\s+/g, " ");

/**
 * Checks if new text is a near-duplicate of recent text.
 * Pure function - compares normalized versions.
 *
 * @param newText - New text to check
 * @param recentText - Recent text to compare against
 * @returns true if texts are duplicates (exact or near-duplicate)
 */
export const isNearDuplicate = (newText: string, recentText: string): boolean =>
	newText === recentText ||
	normalizeWhitespace(newText) === normalizeWhitespace(recentText);

/**
 * Checks if text is empty or whitespace-only.
 * Pure function.
 */
export const isEmptyText = (text: string | null | undefined): boolean =>
	!text || text.trim().length === 0;

/**
 * Maximum allowed clipboard content characters.
 * Prevents storing excessively large content.
 */
const MAX_CLIP_CHARS = 1_000_000;

/**
 * Delay in milliseconds before simulating paste after hiding window.
 * Allows time for focus to transfer to the previous application.
 */
const PASTE_DELAY_MS = 100;

/**
 * Validates that an id is a positive integer.
 * Pure function.
 */
export const isValidId = (id: unknown): id is number =>
	typeof id === "number" && Number.isInteger(id) && id > 0;

/**
 * Validates pagination parameters.
 * Pure function.
 */
export const isValidPaginationParams = (
	limit: unknown,
	offset: unknown,
): boolean =>
	(limit === undefined ||
		(typeof limit === "number" && Number.isInteger(limit) && limit > 0)) &&
	(offset === undefined ||
		(typeof offset === "number" && Number.isInteger(offset) && offset >= 0));

/**
 * Pagination limits for history queries.
 */
const DEFAULT_LIMIT = 50;
const MIN_LIMIT = 1;
const MAX_LIMIT = 200;

/**
 * Safely coerces a value to a non-negative integer.
 * Returns the default if the value is not a valid number.
 * Pure function.
 */
const toSafeInt = (value: unknown, defaultValue: number): number => {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return defaultValue;
	}
	return Math.floor(value);
};

/**
 * Builds a SQL query for history with optional filters.
 * Pure function - returns query string and params.
 *
 * Sanitizes pagination parameters:
 * - limit: coerced to integer, clamped to [1, 200], defaults to 50
 * - offset: coerced to integer, clamped to >= 0, defaults to 0
 */
export const buildHistoryQuery = (options: {
	query?: string;
	limit?: number;
	favoritesOnly?: boolean;
	offset?: number;
}): { sql: string; params: (string | number)[] } => {
	const { query = "", favoritesOnly = false } = options;

	// Coerce and clamp pagination parameters to safe values
	const rawLimit = toSafeInt(options.limit, DEFAULT_LIMIT);
	const rawOffset = toSafeInt(options.offset, 0);
	const limit = Math.min(Math.max(rawLimit, MIN_LIMIT), MAX_LIMIT);
	const offset = Math.max(rawOffset, 0);

	const conditions: string[] = [];
	const params: (string | number)[] = [];

	if (query.trim()) {
		conditions.push("content LIKE ?");
		params.push(`%${query}%`);
	}

	if (favoritesOnly) {
		conditions.push("is_favorite = 1");
	}

	const whereClause =
		conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
	const sql = `SELECT id, content, type, created_at, is_favorite FROM history${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;

	params.push(limit, offset);

	return { sql, params };
};

// ============================================================================
// Database Module (encapsulated state)
// ============================================================================

/**
 * Creates a database module with encapsulated state.
 * The database instance is private to this closure.
 */
const createDbModule = () => {
	let db: Database.Database | null = null;

	const init = (dbPath: string): void => {
		if (db) throw new Error("Database already initialized");
		try {
			db = new Database(dbPath);
			runMigrations(db);
		} catch (error) {
			console.error("Failed to initialize database:", error);
			throw new Error(
				`Database initialization failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	};

	const getDb = (): Database.Database => {
		if (!db) throw new Error("Database not initialized");
		return db;
	};

	const close = (): void => {
		if (db) {
			db.close();
			db = null;
		}
	};

	const isInitialized = (): boolean => db !== null;

	return { init, getDb, close, isInitialized };
};

// ============================================================================
// Window Module (encapsulated state)
// ============================================================================

/**
 * Creates a window module with encapsulated state.
 */
const createWindowModule = () => {
	let mainWindow: BrowserWindow | null = null;
	let blurTimeout: NodeJS.Timeout | null = null;

	const create = async (): Promise<void> => {
		mainWindow = new BrowserWindow({
			width: 450,
			height: 600,
			frame: false,
			transparent: true,
			alwaysOnTop: true,
			show: false,
			webPreferences: {
				preload: path.join(__dirname, "preload.js"),
				contextIsolation: true,
				nodeIntegration: false,
			},
		});

		// Load the app
		const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
		try {
			if (isDev) {
				await mainWindow.loadURL("http://localhost:5173");
			} else {
				await mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
			}
		} catch (error) {
			console.error("Failed to load application:", error);
			dialog.showErrorBox(
				"Load Error",
				`Failed to load the application.\n\n${error instanceof Error ? error.message : String(error)}\n\nThe application will now quit.`,
			);
			app.quit();
			return;
		}

		// Center window on screen
		mainWindow.center();

		// Handle Escape key in main process
		// Check both key and code for Escape for cross-platform compatibility
		mainWindow.webContents.on("before-input-event", (event, input) => {
			if (
				(input.key === "Escape" || input.code === "Escape") &&
				mainWindow?.isVisible()
			) {
				mainWindow.hide();
				// On macOS, use app.hide() to return focus to the previous application
				if (process.platform === "darwin") {
					app.hide();
				}
				event.preventDefault();
			}
		});

		// Hide window when it loses focus (click outside)
		// Small delay to avoid hiding when interacting with window controls
		mainWindow.on("blur", () => {
			if (!mainWindow?.isVisible()) return;
			// Clear any existing timeout
			if (blurTimeout) clearTimeout(blurTimeout);
			blurTimeout = setTimeout(() => {
				if (mainWindow?.isVisible() && !mainWindow.isFocused()) {
					mainWindow.hide();
					// On macOS, use app.hide() to return focus to the previous application
					if (process.platform === "darwin") {
						app.hide();
					}
				}
				blurTimeout = null;
			}, 50);
		});

		// Cancel hide if window regains focus
		mainWindow.on("focus", () => {
			if (blurTimeout) {
				clearTimeout(blurTimeout);
				blurTimeout = null;
			}
		});

		mainWindow.on("closed", () => {
			if (blurTimeout) {
				clearTimeout(blurTimeout);
				blurTimeout = null;
			}
			mainWindow = null;
		});
	};

	const getWindow = (): BrowserWindow | null => mainWindow;

	const show = (): void => {
		if (mainWindow) {
			mainWindow.center();
			mainWindow.show();
			mainWindow.focus();
		}
	};

	const hide = (): void => {
		if (mainWindow) {
			mainWindow.hide();
			// On macOS, use app.hide() to return focus to the previous application
			if (process.platform === "darwin") {
				app.hide();
			}
		}
	};

	const toggle = (): void => {
		if (mainWindow?.isVisible()) {
			hide();
		} else {
			show();
		}
	};

	const center = (): void => mainWindow?.center();
	const isVisible = (): boolean => mainWindow?.isVisible() ?? false;

	return { create, getWindow, show, hide, toggle, center, isVisible };
};

// ============================================================================
// Tray Module (encapsulated state)
// ============================================================================

/**
 * Creates a tray module with encapsulated state.
 */
const createTrayModule = (
	windowModule: ReturnType<typeof createWindowModule>,
) => {
	let tray: Tray | null = null;

	const create = (): void => {
		// Create a simple programmatic icon for the tray
		// On macOS, tray icons should be template images (black with transparency)
		const iconSize = 16;

		// Try to use the app icon as a fallback
		try {
			const appIcon = nativeImage.createFromNamedImage("NSApplicationIcon");
			if (!appIcon.isEmpty()) {
				tray = new Tray(appIcon.resize({ width: iconSize, height: iconSize }));
			} else {
				// Create a minimal icon using a 1x1 pixel image
				// This will show as a small dot, but it's better than nothing
				const buffer = Buffer.from(
					"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
					"base64",
				);
				tray = new Tray(nativeImage.createFromBuffer(buffer));
			}
		} catch {
			// Ultimate fallback: create from a tiny buffer
			const buffer = Buffer.from(
				"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
				"base64",
			);
			tray = new Tray(nativeImage.createFromBuffer(buffer));
		}

		// Guard against tray creation failure
		if (!tray) return;

		// Create context menu for tray icon
		const contextMenu = Menu.buildFromTemplate([
			{
				label: "Open",
				click: () => windowModule.show(),
			},
			{ type: "separator" },
			{
				label: "Quit",
				click: () => app.quit(),
			},
		]);

		tray.setContextMenu(contextMenu);
		tray.setToolTip("Clipboard Manager");
	};

	return { create };
};

// ============================================================================
// IPC Handler Factories (pure functions that create handlers)
// ============================================================================

/**
 * Creates clipboard IPC handlers
 */
const createClipboardHandlers = () => ({
	readText: () => clipboard.readText(),
	writeText: (_event: Electron.IpcMainInvokeEvent, text: string) =>
		clipboard.writeText(text),
});

/**
 * Creates database IPC handlers
 */
const createDbHandlers = (dbModule: ReturnType<typeof createDbModule>) => ({
	getHistory: (
		_event: Electron.IpcMainInvokeEvent,
		options: {
			query?: string;
			limit?: number;
			favoritesOnly?: boolean;
			offset?: number;
		} = {},
	) => {
		// Validate pagination parameters
		if (!isValidPaginationParams(options.limit, options.offset)) {
			throw new Error(
				`Invalid pagination parameters: limit=${options.limit}, offset=${options.offset}`,
			);
		}

		const db = dbModule.getDb();
		const { sql, params } = buildHistoryQuery(options);
		return db.prepare(sql).all(...params) as HistoryRow[];
	},

	addClip: (_event: Electron.IpcMainInvokeEvent, text: string) => {
		if (isEmptyText(text)) return;

		// Validate text length
		if (text.length > MAX_CLIP_CHARS) {
			throw new Error(
				`Clipboard content too large: ${text.length} bytes (max: ${MAX_CLIP_CHARS})`,
			);
		}

		const db = dbModule.getDb();
		const recent = db
			.prepare("SELECT content FROM history ORDER BY created_at DESC LIMIT 1")
			.get() as { content: string } | undefined;

		if (recent && isNearDuplicate(text, recent.content)) {
			return;
		}

		db.prepare("INSERT INTO history (content, type) VALUES (?, ?)").run(
			text,
			"text",
		);
	},

	deleteHistoryItem: (_event: Electron.IpcMainInvokeEvent, id: number) => {
		// Validate id
		if (!isValidId(id)) {
			throw new Error(`Invalid history item id: ${id}`);
		}

		const db = dbModule.getDb();
		db.prepare("DELETE FROM history WHERE id = ?").run(id);
	},

	clearAllHistory: () => {
		const db = dbModule.getDb();
		db.prepare("DELETE FROM history").run();
	},

	toggleFavorite: (_event: Electron.IpcMainInvokeEvent, id: number) => {
		// Validate id
		if (!isValidId(id)) {
			throw new Error(`Invalid history item id: ${id}`);
		}

		const db = dbModule.getDb();

		// Check if item exists first
		const existing = db
			.prepare("SELECT id FROM history WHERE id = ?")
			.get(id) as { id: number } | undefined;

		if (!existing) {
			throw new Error(`History item not found: ${id}`);
		}

		// Toggle favorite, treating NULL as 0 (not favorite)
		// NULL -> 1, 0 -> 1, 1 -> 0
		db.prepare(
			"UPDATE history SET is_favorite = CASE WHEN COALESCE(is_favorite, 0) = 1 THEN 0 ELSE 1 END WHERE id = ?",
		).run(id);

		// Return the new favorite state
		const result = db
			.prepare("SELECT is_favorite FROM history WHERE id = ?")
			.get(id) as { is_favorite: number } | undefined;
		return Boolean(result?.is_favorite);
	},
});

/**
 * Creates window IPC handlers
 */
const createWindowHandlers = (
	windowModule: ReturnType<typeof createWindowModule>,
) => ({
	center: () => windowModule.center(),
	show: () => windowModule.show(),
	hide: () => windowModule.hide(),
	isVisible: () => windowModule.isVisible(),
	hideAndPaste: async () => {
		// Auto-paste only works on macOS (requires AppleScript)
		if (process.platform !== "darwin") return;

		windowModule.hide();
		// Wait for focus to transfer to previous application
		await new Promise((resolve) => setTimeout(resolve, PASTE_DELAY_MS));
		try {
			await simulatePaste();
		} catch (error) {
			console.error("Failed to simulate paste:", error);
		}
	},
});

// ============================================================================
// Application Bootstrap
// ============================================================================

// Create module instances
const dbModule = createDbModule();
const windowModule = createWindowModule();
const trayModule = createTrayModule(windowModule);

// Create handlers
const clipboardHandlers = createClipboardHandlers();
const dbHandlers = createDbHandlers(dbModule);
const windowHandlers = createWindowHandlers(windowModule);

// Register all IPC handlers
const registerIpcHandlers = (): void => {
	// Clipboard handlers
	ipcMain.handle("clipboard:readText", clipboardHandlers.readText);
	ipcMain.handle("clipboard:writeText", clipboardHandlers.writeText);

	// Database handlers
	ipcMain.handle("db:getHistory", dbHandlers.getHistory);
	ipcMain.handle("db:addClip", dbHandlers.addClip);
	ipcMain.handle("db:deleteHistoryItem", dbHandlers.deleteHistoryItem);
	ipcMain.handle("db:clearAllHistory", dbHandlers.clearAllHistory);
	ipcMain.handle("db:toggleFavorite", dbHandlers.toggleFavorite);

	// Window handlers
	ipcMain.handle("window:center", windowHandlers.center);
	ipcMain.handle("window:show", windowHandlers.show);
	ipcMain.handle("window:hide", windowHandlers.hide);
	ipcMain.handle("window:isVisible", windowHandlers.isVisible);
	ipcMain.handle("window:hideAndPaste", windowHandlers.hideAndPaste);

	// App handlers
	ipcMain.handle("app:quit", () => app.quit());
};

// Application ready
app.whenReady().then(async () => {
	try {
		// Initialize database
		const dbPath = path.join(app.getPath("userData"), "clipboard.db");
		dbModule.init(dbPath);

		// Register IPC handlers before creating window (renderer needs them immediately)
		registerIpcHandlers();

		// Create window and tray
		await windowModule.create();
		trayModule.create();

		// Check Accessibility permissions on macOS (required for auto-paste)
		// Done after window creation so it doesn't block the UI
		if (process.platform === "darwin") {
			const hasPermission = await checkAccessibilityPermission();
			if (!hasPermission) {
				const response = await dialog.showMessageBox({
					type: "warning",
					title: "Accessibility Permission Required",
					message:
						"Clipboard Manager needs Accessibility permission to auto-paste.",
					detail:
						"To enable auto-paste after selecting an item, please grant Accessibility permission in System Settings > Privacy & Security > Accessibility.\n\nWithout this permission, items will still be copied to clipboard, but you'll need to paste manually.",
					buttons: ["Open System Settings", "Later"],
					defaultId: 0,
					cancelId: 1,
				});

				if (response.response === 0) {
					shell.openExternal(
						"x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
					);
				}
			}
		}

		// Register global shortcut Cmd+Shift+V (or Ctrl+Shift+V on Windows/Linux)
		const shortcut = "CommandOrControl+Shift+V";
		const registered = globalShortcut.register(shortcut, () =>
			windowModule.toggle(),
		);
		if (!registered) {
			console.error(
				`Global shortcut registration failed for "${shortcut}". ` +
					"The shortcut may already be in use by another application.",
			);
		}

		app.on("activate", () => {
			if (BrowserWindow.getAllWindows().length === 0) {
				windowModule.create().catch((error) => {
					console.error("Failed to create window on activate:", error);
				});
			}
		});
	} catch (error) {
		console.error("Failed to initialize application:", error);
		dialog.showErrorBox(
			"Initialization Error",
			`The application failed to start properly.\n\n${error instanceof Error ? error.message : String(error)}\n\nThe application will now quit.`,
		);
		app.quit();
	}
});

app.on("window-all-closed", () => {
	// On macOS, keep the app running even when all windows are closed
	// The tray icon keeps the app alive for background clipboard monitoring
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("will-quit", () => {
	globalShortcut.unregisterAll();
	dbModule.close();
});
