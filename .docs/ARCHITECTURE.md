# System Architecture

## Tech Stack

### Current Stack
- **Frontend**: React 19 + TypeScript + Tailwind CSS v4
- **Backend**: Electron (Node.js + TypeScript)
- **Database**: SQLite (via `better-sqlite3`)
- **State Management**: TanStack Query (`@tanstack/react-query`) for server state, React hooks for UI state
- **Testing**: Vitest + React Testing Library (118 tests)
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
│   ├── App.tsx          # Main application component (composition layer)
│   ├── components/      # React components
│   │   ├── common/      # Shared UI components
│   │   │   ├── ErrorBanner.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   └── SettingsMenu.tsx
│   │   └── history/     # History-specific components
│   │       ├── HistoryItem.tsx
│   │       └── HistoryList.tsx
│   ├── hooks/           # React hooks
│   │   ├── queries/               # TanStack Query hooks
│   │   │   ├── index.ts           # Query hooks exports
│   │   │   ├── useHistoryQuery.ts # Infinite query for history
│   │   │   ├── useHistoryMutations.ts # Mutations (delete, favorite, clear)
│   │   │   └── useClipboardMonitor.ts # Clipboard polling
│   │   ├── useHistoryActions.ts   # Item actions (copy, delete, favorite)
│   │   ├── useHistorySearch.ts    # Search and filter state (uses TanStack Query)
│   │   ├── useKeyboardNavigation.ts # Keyboard shortcuts
│   │   └── useWindowVisibility.ts # Window visibility state
│   ├── lib/             # Utility libraries
│   │   ├── constants.ts # Application constants
│   │   ├── db.ts        # Database operations
│   │   ├── queryKeys.ts # TanStack Query key factory
│   │   └── utils.ts     # Utility functions
│   ├── test/            # Test infrastructure
│   │   ├── setup.ts     # Global test setup
│   │   ├── utils.tsx    # Test utilities
│   │   └── mocks/       # Mock factories
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

### Clipboard Monitoring (`src/hooks/queries/useClipboardMonitor.ts`)
- Polls clipboard every 1000ms
- Detects clipboard changes
- Adds new items to database via `addClip()`
- Invalidates TanStack Query cache on new content

### TanStack Query Integration (`src/hooks/queries/`)
- `useHistoryQuery`: Infinite query for paginated history fetching
- `useHistoryMutations`: Mutations with optimistic updates for delete/favorite/clear
- `useClipboardMonitor`: Clipboard polling with cache invalidation
- Query key factory in `src/lib/queryKeys.ts` for consistent cache management

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

## Testing Architecture

See [`.docs/TESTING.md`](./TESTING.md) for comprehensive testing documentation.

### Test Infrastructure

```bash
src/test/
├── setup.ts           # Global test setup, electronAPI mocks
├── utils.tsx          # Test utilities (createTestQueryClient)
└── mocks/
    └── electronAPI.ts # Mock factory for window.electronAPI
```

### Test Categories

- **Unit Tests**: Pure function tests (`*.test.ts`)
- **Component Tests**: React component tests (`*.test.tsx`)
- **Hook Integration Tests**: TanStack Query hook tests

### Test Coverage

Tests are co-located with source files:
- `src/lib/utils.test.ts` - Utility function tests
- `src/lib/db.test.ts` - Database layer tests
- `src/components/**/*.test.tsx` - Component tests
- `src/hooks/queries/*.test.tsx` - Hook tests

### Running Tests

```bash
pnpm test           # Run all tests
pnpm test:watch     # Watch mode
pnpm test:coverage  # With coverage report
```

