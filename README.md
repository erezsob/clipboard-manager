# macOS Clipboard Manager

A personal-use macOS clipboard manager with background monitoring, local SQLite storage, and a clean dark-mode interface. Built with Electron, React, TypeScript, and Tailwind CSS.

## Features

### ✅ Currently Implemented

- **Clipboard History Tracking**: Automatically monitors and stores clipboard text in a local SQLite database
- **Search Functionality**: Real-time search through clipboard history with case-insensitive matching
- **Keyboard Navigation**: 
  - `Cmd+Shift+V` - Toggle window visibility
  - `↑/↓` - Navigate through history items
  - `Enter` - Copy selected item to clipboard and hide window
  - `Esc` - Hide window
- **Item Management**: 
  - Click any item to copy it to clipboard
  - Delete individual items with trash icon (appears on hover)
  - Clear all history with confirmation dialog
- **Dark Mode UI**: Modern, clean dark theme interface
- **Error Handling**: Retry logic with exponential backoff for clipboard operations
- **Window Management**: Starts hidden, toggles via keyboard shortcut

### 🔨 Planned Features

See [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) for detailed roadmap including:
- Settings menu with Quit option
- System tray integration
- Favorites/star system
- Pagination (Load More)
- Near-duplicate detection
- Persisted snippets management
- TanStack Query integration
- Comprehensive test suite

## Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS v4
- **Backend**: Electron
- **Database**: SQLite (via `better-sqlite3`)
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Code Quality**: Biome (linting & formatting)

## Prerequisites

- Node.js (v18 or higher)
- pnpm (package manager)
- macOS (designed for macOS, may work on other platforms with modifications)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mac-clipboard-manager
```

2. Install dependencies:
```bash
pnpm install
```

## Development

### Run in Development Mode

```bash
pnpm electron:dev
```

This will:
- Start the Vite dev server
- Launch Electron with hot-reload enabled
- Open the application window

### Build for Production

```bash
pnpm electron:build
```

This will:
- Compile TypeScript
- Build the React app with Vite
- Package the Electron app with electron-builder

### Other Scripts

```bash
# Run Vite dev server only
pnpm dev

# Build frontend only
pnpm build

# Preview production build
pnpm preview

# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format

# Check for unused code
pnpm knip

# Check TypeScript types
pnpm type-check
```

### Git Hooks

This project uses [Husky](https://typicode.github.io/husky/) to manage Git hooks. A pre-push hook is configured to automatically run code quality checks before pushing to the remote repository.

**Pre-Push Hook Checks:**
- **Formatting**: Automatically formats code with Biome and stages the changes
- **Linting**: Runs Biome linter to check for code quality issues
- **Type Checking**: Validates TypeScript types (`tsc --noEmit`)
- **Unused Code Detection**: Runs Knip to identify unused code and dependencies

The hook will automatically format your code before running other checks. If formatting changes are made, they will be automatically staged and included in your push. The hook will prevent pushing if any of the checks fail. To bypass the hook in emergency situations, use:
```bash
git push --no-verify
```

**Note**: It's recommended to fix any issues rather than bypassing the hook, as these checks help maintain code quality and prevent broken code from being pushed.

## Project Structure

```
mac-clipboard-manager/
├── electron/           # Electron main process files
│   ├── main.ts        # Main process entry point (TypeScript)
│   └── preload.ts     # Preload script for secure IPC (TypeScript)
├── src/               # React application source
│   ├── App.tsx        # Main application component
│   ├── hooks/         # React hooks
│   │   └── useClipboard.ts  # Clipboard monitoring hook
│   ├── lib/           # Utility libraries
│   │   └── db.ts      # Database operations
│   └── main.tsx       # React entry point
├── public/            # Static assets
├── package.json       # Dependencies and scripts
└── DEVELOPMENT_PLAN.md # Detailed development roadmap
```

## Usage

1. **Start the application**: Run `pnpm electron:dev` or launch the built app
2. **Toggle window**: Press `Cmd+Shift+V` to show/hide the clipboard manager
3. **Search**: Type in the search bar to filter clipboard history
4. **Navigate**: Use arrow keys to select items
5. **Copy**: Press Enter or click an item to copy it to clipboard
6. **Delete**: Hover over an item and click the trash icon to delete it
7. **Clear All**: Click "Clear All" button in the top bar (confirmation required)

## Database

The application uses SQLite to store clipboard history locally. The database file is created automatically in the application's data directory.

### Current Schema

```sql
CREATE TABLE history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## Development Status

This is an active development project. Current focus areas:
- Core functionality is working
- UI/UX improvements in progress
- Additional features planned (see DEVELOPMENT_PLAN.md)

## Contributing

This is a personal-use project, but suggestions and feedback are welcome. Please refer to the [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) for planned features and implementation details.

## License

[Add your license here]

## Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- UI components with [Lucide React](https://lucide.dev/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
