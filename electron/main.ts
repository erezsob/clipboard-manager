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
	Tray,
} from "electron";
import { runMigrations } from "./lib/migrations.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
 * Builds a SQL query for history with optional filters.
 * Pure function - returns query string and params.
 */
export const buildHistoryQuery = (options: {
	query?: string;
	limit?: number;
	favoritesOnly?: boolean;
	offset?: number;
}): { sql: string; params: (string | number)[] } => {
	const { query = "", limit = 50, favoritesOnly = false, offset = 0 } = options;
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
		db = new Database(dbPath);
		runMigrations(db);
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

	const create = (): void => {
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
		if (isDev) {
			mainWindow.loadURL("http://localhost:5173");
		} else {
			mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
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
		const db = dbModule.getDb();
		const { sql, params } = buildHistoryQuery(options);
		return db.prepare(sql).all(...params);
	},

	addClip: (_event: Electron.IpcMainInvokeEvent, text: string) => {
		if (isEmptyText(text)) return;

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
		const db = dbModule.getDb();
		db.prepare("DELETE FROM history WHERE id = ?").run(id);
	},

	clearAllHistory: () => {
		const db = dbModule.getDb();
		db.prepare("DELETE FROM history").run();
	},

	toggleFavorite: (_event: Electron.IpcMainInvokeEvent, id: number) => {
		const db = dbModule.getDb();
		db.prepare(
			"UPDATE history SET is_favorite = NOT is_favorite WHERE id = ?",
		).run(id);
		// Return the new favorite state
		const result = db
			.prepare("SELECT is_favorite FROM history WHERE id = ?")
			.get(id) as { is_favorite: number } | undefined;
		return result ? Boolean(result.is_favorite) : false;
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

	// App handlers
	ipcMain.handle("app:quit", () => app.quit());
};

// Application ready
app.whenReady().then(async () => {
	try {
		// Initialize database
		const dbPath = path.join(app.getPath("userData"), "clipboard.db");
		dbModule.init(dbPath);

		// Create window and tray
		windowModule.create();
		trayModule.create();

		// Register IPC handlers
		registerIpcHandlers();

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
				windowModule.create();
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
