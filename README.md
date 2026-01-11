# macOS Clipboard Manager

A personal-use macOS clipboard manager with background monitoring, local SQLite storage, and a clean dark-mode interface. Built with Electron, React, TypeScript, and Tailwind CSS.

## Features

### ✅ Currently Implemented

- **Clipboard History Tracking**: Automatically monitors and stores clipboard text in a local SQLite database
- **Search Functionality**: Real-time search through clipboard history with case-insensitive matching
- **Favorites System**: Star/unstar items with a dedicated filter toggle to view only favorites
- **Keyboard Navigation**: 
  - `Cmd+Shift+V` - Toggle window visibility
  - `↑/↓` - Navigate through history items
  - `Enter` - Copy selected item to clipboard and hide window
  - `Esc` - Hide window
- **Item Management**: 
  - Click any item to copy it to clipboard
  - Star/unstar items as favorites
  - Delete individual items with trash icon (appears on hover)
  - Clear all history with confirmation dialog (via Settings menu)
- **System Tray**: Menu bar icon with quick access to show window or quit
- **Settings Menu**: Cog icon in footer with Quit and Clear All options
- **Pagination**: Load more functionality with 100-item batches
- **Near-Duplicate Detection**: Whitespace normalization prevents duplicate entries
- **Dark Mode UI**: Modern, clean dark theme interface
- **Error Handling**: Retry logic with exponential backoff for clipboard operations
- **Window Management**: Starts hidden, toggles via keyboard shortcut
- **TanStack Query Integration**: 
  - Data fetching and caching with `@tanstack/react-query`
  - Optimistic updates for delete and favorite operations
  - Automatic refetching on window focus
  - Query key factory for consistent cache management
- **Modular Architecture**: 
  - Custom hooks for separation of concerns (`src/hooks/`)
  - Reusable UI components (`src/components/`)
- **Functional Programming Patterns**:
  - Result and Option types for explicit error handling (`src/lib/fp.ts`)
  - Domain-specific error types (`src/lib/errors.ts`)
  - Pure transformation functions and function composition
- **Automated Testing**: Comprehensive test suite with Vitest (115+ tests)

### 🔨 Planned Features

See [.docs/FEATURES.md](.docs/FEATURES.md) for detailed roadmap including:
- Settings/preferences window
- Persisted snippets management
- E2E testing with Playwright
- Release workflow (GitHub Actions)

## Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS v4
- **Backend**: Electron
- **Database**: SQLite (via `better-sqlite3`)
- **Data Management**: TanStack Query
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Testing**: Vitest + React Testing Library
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

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format

# Check for unused code
pnpm knip

# Check TypeScript types
pnpm types:check
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

### CI Pipeline

GitHub Actions runs automated checks on every push to `main` and on pull requests. The CI pipeline includes 5 parallel jobs:

| Job             | Description                                         |
| --------------- | --------------------------------------------------- |
| **Lint**        | Biome linting (`pnpm biome check`)                  |
| **Format**      | Code formatting check (`pnpm biome format --check`) |
| **Type Check**  | TypeScript validation (`pnpm types:check`)          |
| **Unused Code** | Knip detection (`pnpm knip`)                        |
| **Test**        | Vitest test suite (`pnpm test`)                     |

See [.docs/WORKFLOW.md](.docs/WORKFLOW.md) for more details.

## Project Structure

```
mac-clipboard-manager/
├── electron/              # Electron main process files
│   ├── main.ts           # Main process entry point
│   ├── preload.ts        # Preload script for secure IPC
│   ├── lib/              # Electron utilities
│   │   └── migrations.ts # Database migration runner
│   └── migrations/       # SQL migration files
├── src/                  # React application source
│   ├── App.tsx           # Main application component
│   ├── components/       # React components
│   │   ├── common/       # Shared components (ErrorBanner, Footer, SearchBar, SettingsMenu)
│   │   └── history/      # History-specific components (HistoryItem, HistoryList)
│   ├── hooks/            # Custom React hooks
│   │   ├── mutations/    # TanStack Query mutation hooks
│   │   └── queries/      # TanStack Query query hooks
│   ├── lib/              # Utility libraries
│   │   ├── db.ts         # Database operations
│   │   ├── fp.ts         # Functional programming utilities (Result, Option, pipe)
│   │   ├── errors.ts     # Domain-specific error types
│   │   ├── constants.ts  # App constants
│   │   ├── queryKeys.ts  # TanStack Query key factory
│   │   └── utils.ts      # Utility functions
│   ├── test/             # Test utilities and mocks
│   └── types/            # TypeScript type definitions
├── .docs/                # Project documentation
├── .github/              # GitHub Actions workflows
└── .husky/               # Git hooks
```

## Usage

1. **Start the application**: Run `pnpm electron:dev` or launch the built app
2. **Toggle window**: Press `Cmd+Shift+V` to show/hide the clipboard manager
3. **Search**: Type in the search bar to filter clipboard history
4. **Filter favorites**: Click the star icon next to search to show only favorites
5. **Navigate**: Use arrow keys to select items
6. **Copy**: Press Enter or click an item to copy it to clipboard
7. **Favorite**: Click the star icon on an item to add/remove from favorites
8. **Delete**: Hover over an item and click the trash icon to delete it
9. **Load more**: Click "Load More" at the bottom to load older items
10. **Settings**: Click the cog icon in the footer for Quit and Clear All options
11. **System tray**: Click the menu bar icon for quick access

## Database

The application uses SQLite to store clipboard history locally. The database file is created automatically in the application's data directory.

### Current Schema

```sql
CREATE TABLE history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text',
    is_favorite INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_history_is_favorite ON history(is_favorite);
CREATE INDEX idx_history_created_at ON history(created_at DESC);
```

## Testing

The project includes a comprehensive test suite using Vitest and React Testing Library.

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage

# Run tests with UI
pnpm test:ui
```

See [.docs/TESTING.md](.docs/TESTING.md) for testing documentation and patterns.

## Development Status

This is an active development project. See [.docs/CURRENT_STATE.md](.docs/CURRENT_STATE.md) for detailed implementation status.

**Completed Phases:**
- ✅ Phase 1: Core Enhancements
- ✅ Phase 2: Favorites System
- ✅ Phase 3: Pagination & Performance
- ✅ Phase 4.5: Code Refactoring & Component Extraction
- ✅ Phase 5: TanStack Query Integration
- ✅ Phase 7: Automated Testing Suite (unit/integration/component)
- ✅ Phase 8: Pre-Push Git Hook
- ✅ Phase 9: CI/CD Pipeline (partial)
- ✅ Phase 10: Functional Programming Refactor

**In Progress:**
- Phase 4: Polish & Settings (settings window)
- Phase 6: Persisted Snippets Management
- Phase 7: E2E Testing (deferred)

## Contributing

This is a personal-use project, but suggestions and feedback are welcome. Please refer to the [.docs/](.docs/) directory for project documentation:
- [Current State](.docs/CURRENT_STATE.md) - What's implemented
- [Features](.docs/FEATURES.md) - Planned features and roadmap
- [Architecture](.docs/ARCHITECTURE.md) - System design
- [Code Standards](.docs/CODE_STANDARDS.md) - Quality requirements
- [Testing](.docs/TESTING.md) - Testing documentation

## License

[Add your license here]

## Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- UI components with [Lucide React](https://lucide.dev/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Data management with [TanStack Query](https://tanstack.com/query)
