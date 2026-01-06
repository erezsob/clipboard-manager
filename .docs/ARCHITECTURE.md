# System Architecture

## Tech Stack

### Current Stack
- **Frontend**: React 19 + TypeScript + Tailwind CSS v4
- **Backend**: Electron (Node.js + TypeScript)
- **Database**: SQLite (via `better-sqlite3`)
- **State Management**: React hooks (TanStack Query planned for Phase 5)
- **Testing**: Not yet implemented (planned for Phase 7)
- **Build Tool**: Vite
- **Linting/Formatting**: Biome
- **Package Manager**: pnpm

### Electron APIs Used
- `electron.clipboard` - Clipboard read/write operations
- `electron.globalShortcut` - Global keyboard shortcuts
- `electron.Tray` - System tray icon and menu
- `electron.BrowserWindow` - Main application window
- `electron.ipcMain/ipcRenderer` - Inter-process communication

## Project Structure

```
mac-clipboard-manager/
├── .docs/                # Project documentation
├── electron/            # Electron main process files
│   ├── main.ts          # Main process entry point (TypeScript)
│   ├── preload.ts       # Preload script for secure IPC (TypeScript)
│   ├── lib/             # Electron utilities
│   │   └── migrations.ts # Database migration runner
│   └── migrations/      # SQL migration files
│       ├── 001_initial_schema.sql
│       └── 002_add_favorites.sql
├── electron-dist/       # Compiled Electron files
├── src/                 # React application source
│   ├── App.tsx          # Main application component
│   ├── hooks/           # React hooks
│   │   ├── useClipboard.ts  # Clipboard monitoring hook
│   │   └── usePagination.ts # Pagination logic
│   ├── lib/             # Utility libraries
│   │   ├── constants.ts # Application constants
│   │   ├── db.ts        # Database operations
│   │   └── utils.ts     # Utility functions
│   ├── types/           # TypeScript type definitions
│   │   └── electron.d.ts # Electron API types
│   └── main.tsx         # React entry point
├── public/              # Static assets
├── package.json         # Dependencies and scripts
└── .cursorrules         # Cursor IDE rules
```

## Key Components

### Electron Main Process (`electron/main.ts`)
- Initializes database and runs migrations
- Creates and manages BrowserWindow
- Sets up system tray icon and menu
- Registers global keyboard shortcuts
- Handles IPC communication with renderer process
- Manages clipboard monitoring (via renderer process polling)

### Preload Script (`electron/preload.ts`)
- Bridges Electron APIs to renderer process securely
- Exposes `window.electronAPI` with typed interfaces
- Enables context isolation and secure IPC

### React Frontend (`src/App.tsx`)
- Main application UI component
- Manages search, filtering, and item display
- Handles keyboard navigation
- Coordinates clipboard operations

### Database Layer (`src/lib/db.ts`)
- Provides typed interface to database operations
- Handles IPC calls to Electron main process
- Manages history, favorites, and search operations

### Clipboard Monitoring (`src/hooks/useClipboard.ts`)
- Polls clipboard every 1000ms
- Detects clipboard changes
- Adds new items to database
- Manages history state

## Data Flow

### Clipboard Item Addition Flow
```
1. User copies text to clipboard
2. useClipboard hook detects change (polling)
3. Calls addClip() from db.ts
4. IPC call to electron main process
5. Main process checks for duplicates
6. Inserts into SQLite database
7. Frontend refreshes history display
```

### Window Visibility Flow
```
1. User presses Cmd+Shift+V (global shortcut)
2. Electron main process receives shortcut
3. Toggles BrowserWindow visibility
4. Window shows/hides accordingly
5. Clipboard monitoring continues in background
```

### IPC Communication Pattern
```
Renderer Process          Main Process
     |                         |
     |-- invoke("db:getHistory") -->|
     |                         | Query SQLite
     |<-- return results -------|
     |                         |
```

## Background Monitoring

- Continues polling clipboard every 1000ms when window is hidden
- Stores new items in database automatically
- No UI updates needed when hidden (performance optimization)
- Implemented via `useClipboard` hook with interval polling

## System Tray Integration

- Uses Electron's `Tray` API (native macOS support)
- Creates tray icon with menu using `Menu.buildFromTemplate()`
- Handles click events to show window
- Menu options: Open, Quit
- Tray icon remains visible in menu bar

## Security Considerations

- Context isolation enabled (prevents renderer from accessing Node.js directly)
- Preload script uses `contextBridge` for secure API exposure
- No `nodeIntegration` in renderer process
- All database operations go through IPC (main process only)

## Build Process

1. **TypeScript Compilation**:
   - Preload script: `tsc -p electron/tsconfig.preload.json` (CommonJS)
   - Main process: `tsc -p tsconfig.electron.json` (ES modules)
   - Frontend: Handled by Vite

2. **Frontend Build**:
   - Vite compiles React app
   - Outputs to `dist/` directory

3. **Electron Packaging**:
   - electron-builder packages application
   - Creates macOS app bundle

## Development vs Production

- **Development**: Loads from Vite dev server (`http://localhost:5173`)
- **Production**: Loads from packaged `dist/index.html`
- Migrations run automatically on app startup
- Database stored in Electron's userData directory

