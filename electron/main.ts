import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import {
	app,
	BrowserWindow,
	clipboard,
	globalShortcut,
	ipcMain,
	Menu,
	nativeImage,
	Tray,
} from "electron";
import { runMigrations } from "./lib/migrations.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let db: Database.Database | null = null;
let tray: Tray | null = null;

function createWindow(): void {
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
	// In development, always try to load from dev server first
	const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
	if (isDev) {
		mainWindow.loadURL("http://localhost:5173");
	} else {
		mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
	}

	// Center window
	mainWindow.center();

	// Handle Escape key in main process
	mainWindow.webContents.on("before-input-event", (event, input) => {
		// Check both key and code for Escape
		if (
			(input.key === "Escape" || input.code === "Escape") &&
			mainWindow &&
			mainWindow.isVisible()
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
	let blurTimeout: NodeJS.Timeout | null = null;

	mainWindow.on("blur", () => {
		if (!mainWindow?.isVisible()) return;
		// Clear any existing timeout
		if (blurTimeout) {
			clearTimeout(blurTimeout);
		}
		// Small delay to avoid hiding when interacting with window controls
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

	mainWindow.on("focus", () => {
		// Cancel hide if window regains focus
		if (blurTimeout) {
			clearTimeout(blurTimeout);
			blurTimeout = null;
		}
	});

	mainWindow.on("closed", () => {
		mainWindow = null;
	});
}

function initDatabase(): void {
	const dbPath = path.join(app.getPath("userData"), "clipboard.db");
	db = new Database(dbPath);

	// Run all migrations
	runMigrations(db);
}

function createTray(): void {
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
			const minimalIcon = nativeImage.createFromBuffer(buffer);
			tray = new Tray(minimalIcon);
		}
	} catch {
		// Ultimate fallback: create from a tiny buffer
		const buffer = Buffer.from(
			"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
			"base64",
		);
		const minimalIcon = nativeImage.createFromBuffer(buffer);
		tray = new Tray(minimalIcon);
	}

	// Create context menu
	const contextMenu = Menu.buildFromTemplate([
		{
			label: "Open",
			click: () => {
				if (mainWindow) {
					mainWindow.center();
					mainWindow.show();
					mainWindow.focus();
				}
			},
		},
		{
			type: "separator",
		},
		{
			label: "Quit",
			click: () => {
				app.quit();
			},
		},
	]);

	tray.setContextMenu(contextMenu);
	tray.setToolTip("Clipboard Manager");
}

app.whenReady().then(() => {
	initDatabase();
	createWindow();
	createTray();

	// Register global shortcut Cmd+Shift+V
	globalShortcut.register("CommandOrControl+Shift+V", () => {
		if (mainWindow) {
			if (mainWindow.isVisible()) {
				mainWindow.hide();
			} else {
				mainWindow.center();
				mainWindow.show();
				mainWindow.focus();
			}
		}
	});

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on("window-all-closed", () => {
	// On macOS, keep the app running even when all windows are closed
	// The tray icon keeps the app alive
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("will-quit", () => {
	globalShortcut.unregisterAll();
	if (db) {
		db.close();
	}
});

// IPC handlers
ipcMain.handle("clipboard:readText", () => {
	return clipboard.readText();
});

ipcMain.handle("clipboard:writeText", (_event, text: string) => {
	clipboard.writeText(text);
});

ipcMain.handle(
	"db:getHistory",
	(
		_event,
		options: {
			query?: string;
			limit?: number;
			favoritesOnly?: boolean;
			offset?: number;
		},
	) => {
		if (!db) throw new Error("Database not initialized");

		const {
			query = "",
			limit = 50,
			favoritesOnly = false,
			offset = 0,
		} = options;
		const conditions: string[] = [];
		const params: (string | number)[] = [];

		if (query.trim()) {
			conditions.push("content LIKE ?");
			params.push(`%${query}%`);
		}

		if (favoritesOnly) {
			conditions.push("is_favorite = 1");
		}

		const sql = `
			SELECT id, content, type, created_at, is_favorite FROM history${
				conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : ""
			} ORDER BY created_at DESC LIMIT ? OFFSET ?`;

		params.push(limit, offset);

		return db.prepare(sql).all(...params);
	},
);

// Normalize whitespace for near-duplicate detection
function normalizeWhitespace(text: string): string {
	return text.trim().replace(/\s+/g, " ");
}

ipcMain.handle("db:addClip", (_event, text: string) => {
	if (!db) throw new Error("Database not initialized");
	if (!text || text.trim().length === 0) return;

	// Normalize the new text for comparison
	const normalizedNew = normalizeWhitespace(text);

	// Check for exact duplicate or near-duplicate
	const recent = db
		.prepare("SELECT content FROM history ORDER BY created_at DESC LIMIT 1")
		.get() as { content: string } | undefined;
	if (recent) {
		const normalizedRecent = normalizeWhitespace(recent.content);
		// Skip if exact duplicate or near-duplicate (normalized whitespace matches)
		if (recent.content === text || normalizedRecent === normalizedNew) {
			return;
		}
	}

	const stmt = db.prepare("INSERT INTO history (content, type) VALUES (?, ?)");
	stmt.run(text, "text");
});

ipcMain.handle("db:deleteHistoryItem", (_event, id: number) => {
	if (!db) throw new Error("Database not initialized");
	const stmt = db.prepare("DELETE FROM history WHERE id = ?");
	stmt.run(id);
});

ipcMain.handle("db:clearAllHistory", () => {
	if (!db) throw new Error("Database not initialized");
	db.prepare("DELETE FROM history").run();
});

ipcMain.handle("db:toggleFavorite", (_event, id: number) => {
	if (!db) throw new Error("Database not initialized");
	const stmt = db.prepare(
		"UPDATE history SET is_favorite = NOT is_favorite WHERE id = ?",
	);
	stmt.run(id);
	// Return the new favorite state
	const getStmt = db.prepare("SELECT is_favorite FROM history WHERE id = ?");
	const result = getStmt.get(id) as { is_favorite: number } | undefined;
	return result ? Boolean(result.is_favorite) : false;
});

ipcMain.handle("window:center", () => {
	if (mainWindow) {
		mainWindow.center();
	}
});

ipcMain.handle("window:show", () => {
	if (mainWindow) {
		mainWindow.show();
		mainWindow.focus();
	}
});

ipcMain.handle("window:hide", () => {
	if (mainWindow) {
		mainWindow.hide();
		// On macOS, use app.hide() to return focus to the previous application
		if (process.platform === "darwin") {
			app.hide();
		}
	}
});

ipcMain.handle("window:isVisible", () => {
	if (mainWindow) {
		return mainWindow.isVisible();
	}
	return false;
});

ipcMain.handle("app:quit", () => {
	app.quit();
});
