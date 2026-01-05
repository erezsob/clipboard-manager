import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import {
	app,
	BrowserWindow,
	clipboard,
	globalShortcut,
	ipcMain,
} from "electron";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let db = null;

function createWindow() {
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

	mainWindow.on("closed", () => {
		mainWindow = null;
	});
}

function initDatabase() {
	const dbPath = path.join(app.getPath("userData"), "clipboard.db");
	db = new Database(dbPath);

	// Create history table if it doesn't exist
	db.exec(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'text',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

	// Create index
	db.exec(`
    CREATE INDEX IF NOT EXISTS idx_created_at ON history(created_at DESC)
  `);
}

app.whenReady().then(() => {
	initDatabase();
	createWindow();

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

ipcMain.handle("clipboard:writeText", (_, text) => {
	clipboard.writeText(text);
});

ipcMain.handle("db:getHistory", (_, limit = 50) => {
	const stmt = db.prepare(
		"SELECT id, content, type, created_at FROM history ORDER BY created_at DESC LIMIT ?",
	);
	return stmt.all(limit);
});

ipcMain.handle("db:addClip", (_, text) => {
	if (!text || text.trim().length === 0) return;

	// Check for duplicate
	const recent = db
		.prepare("SELECT content FROM history ORDER BY created_at DESC LIMIT 1")
		.get();
	if (recent && recent.content === text) {
		return;
	}

	const stmt = db.prepare("INSERT INTO history (content, type) VALUES (?, ?)");
	stmt.run(text, "text");
});

ipcMain.handle("db:searchHistory", (_, query, limit = 50) => {
	const stmt = db.prepare(
		"SELECT id, content, type, created_at FROM history WHERE content LIKE ? ORDER BY created_at DESC LIMIT ?",
	);
	return stmt.all(`%${query}%`, limit);
});

ipcMain.handle("db:deleteHistoryItem", (_, id) => {
	const stmt = db.prepare("DELETE FROM history WHERE id = ?");
	stmt.run(id);
});

ipcMain.handle("db:clearAllHistory", () => {
	db.prepare("DELETE FROM history").run();
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
	}
});

ipcMain.handle("window:isVisible", () => {
	if (mainWindow) {
		return mainWindow.isVisible();
	}
	return false;
});
