# macOS Clipboard Manager

Personal-use clipboard manager with background monitoring, SQLite storage, and dark-mode UI. Built with Electron, React, TypeScript.

## Quick Start

```bash
pnpm install
pnpm electron:dev     # Development
pnpm electron:build   # Production build
```

## Scripts

| Command               | Description                               |
| --------------------- | ----------------------------------------- |
| `pnpm electron:dev`   | Run dev server + Electron with hot reload |
| `pnpm electron:build` | Build production app                      |
| `pnpm test`           | Run tests                                 |
| `pnpm test:watch`     | Run tests in watch mode                   |
| `pnpm test:coverage`  | Run tests with coverage report            |
| `pnpm lint`           | Lint code                                 |
| `pnpm lint:fix`       | Fix lint issues                           |
| `pnpm format`         | Format code                               |
| `pnpm types:check`    | TypeScript type checking                  |
| `pnpm knip`           | Check for unused code                     |

## Features

- Clipboard history tracking with search
- Favorites system with filter
- Keyboard navigation (Cmd+Shift+V, arrows, Enter, Esc)
- System tray icon
- Near-duplicate detection
- Pagination (100-item batches)

## Usage

| Shortcut      | Action         |
| ------------- | -------------- |
| `Cmd+Shift+V` | Toggle window  |
| `↑/↓`         | Navigate items |
| `Enter`       | Copy & close   |
| `Esc`         | Hide window    |

## Tech Stack

React 19, Electron, TypeScript, Tailwind CSS v4, SQLite, TanStack Query, Vitest

## Documentation

See [.docs/](.docs/) for detailed documentation:

- [Current State](.docs/CURRENT_STATE.md) - Implementation status
- [Features](.docs/FEATURES.md) - Roadmap
- [Architecture](.docs/ARCHITECTURE.md) - System design
- [Database](.docs/DATABASE.md) - Schema & migrations
- [Code Standards](.docs/CODE_STANDARDS.md) - Quality requirements
- [Workflow](.docs/WORKFLOW.md) - Dev process & CI
- [Testing](.docs/TESTING.md) - Test patterns
