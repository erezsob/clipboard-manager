# Development Workflow

## Pre-Push Git Hook

### Purpose
Enforce code quality checks before code is pushed to remote repository.

### Implementation
- **Hook Type**: Git pre-push hook (runs before `git push`)
- **Implementation Tool**: Husky
- **Status**: ✅ Implemented

### Checks Run
1. **Formatting**: Automatically format code with Biome (`biome format --write`) and stage changes
2. **Linting**: Run Biome linter (`biome check` or `biome lint`)
3. **Type Checking**: Run TypeScript compiler (`tsc --noEmit`)
4. **Knip Check**: Run Knip to detect unused code (`knip` or `knip --production`)

### Husky Pre-Push Script Structure
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Format code and stage any changes
pnpm format
git add -u

# Run linting
pnpm biome check || exit 1
# Run type checking
pnpm tsc --noEmit || exit 1
# Run Knip
pnpm knip || exit 1
```

### Benefits
- Prevents broken code from being pushed
- Ensures consistent code style
- Catches type errors early
- Identifies unused code and dependencies
- Reduces CI/CD failures
- Cross-platform support (Windows, macOS, Linux)
- Version-controlled hooks (committed to repository)

### Bypassing the Hook
In emergency situations, you can bypass the hook with:
```bash
git push --no-verify
```

**Note**: It's recommended to fix any issues rather than bypassing the hook, as these checks help maintain code quality and prevent broken code from being pushed.

## Development Process

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

### Available Scripts

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

# Compile Electron preload script
pnpm electron:compile:preload

# Compile Electron main process
pnpm electron:compile

# Copy migrations
pnpm electron:copy:migrations
```

## Build Process

### TypeScript Compilation
1. **Preload Script**: `tsc -p electron/tsconfig.preload.json` (outputs CommonJS)
2. **Main Process**: `tsc -p tsconfig.electron.json` (outputs ES modules)
3. **Frontend**: Handled by Vite during build

### Development vs Production
- **Development**: Loads from Vite dev server (`http://localhost:5173`)
- **Production**: Loads from packaged `dist/index.html`
- Migrations run automatically on app startup
- Database stored in Electron's userData directory

## Code Quality Checks

### Before Committing
1. Run `pnpm format` to ensure consistent formatting
2. Run `pnpm lint` to check for linting issues
3. Run `pnpm types:check` to verify TypeScript types
4. Run `pnpm knip` to check for unused code

### Pre-Push Hook
The pre-push hook automatically runs all checks. If any check fails, the push is blocked.

## Testing Workflow (Planned)

When automated testing is implemented (Phase 7):

### Test Scripts
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run E2E tests
pnpm test:e2e
```

### Test Strategy
- **Unit Tests**: Database functions, utility functions, data transformation
- **Integration Tests**: Database operations, clipboard operations, TanStack Query hooks
- **Component Tests**: React components with React Testing Library
- **E2E Tests**: Full application flows with Playwright

### Coverage Goals
- Aim for 80%+ coverage on critical paths
- Focus on database operations, clipboard logic, core UI interactions

## CI/CD Pipeline

### GitHub Actions CI

The project uses GitHub Actions for continuous integration. The CI workflow runs on every push to `main` and on pull requests targeting `main`.

**Workflow File**: `.github/workflows/ci.yml`

### CI Jobs

All jobs run in parallel on `ubuntu-latest` with Node.js 24 and pnpm 9:

| Job | Description | Command |
|-----|-------------|---------|
| **Lint** | Biome linting | `pnpm biome check` |
| **Format** | Code formatting check | `pnpm biome format --check` |
| **Type Check** | TypeScript validation | `pnpm types:check` |
| **Unused Code Check** | Knip detection | `pnpm knip` |
| **Test** | Vitest test suite | `pnpm test` |

### Configuration Details

- **Triggers**: Push to `main`, pull requests to `main`
- **Concurrency**: Automatically cancels in-progress runs when new commits are pushed
- **Caching**: pnpm dependencies are cached for faster subsequent runs
- **Lockfile**: Uses `--frozen-lockfile` to ensure reproducible builds

### Running CI Checks Locally

Before pushing, you can run the same checks locally:

```bash
# Run all checks (same as CI)
pnpm biome check          # Lint
pnpm biome format --check # Format check
pnpm types:check          # TypeScript
pnpm knip                 # Unused code
pnpm test                 # Tests
```

The pre-push hook will also run these checks automatically.

## Git Workflow

### Branch Strategy
- Main branch: `main` (or `master`)
- Feature branches: `feature/description`
- Bug fixes: `fix/description`

### Commit Messages
- Use clear, descriptive commit messages
- Reference issue numbers if applicable
- Follow conventional commit format when possible

### Pull Requests
- Ensure all pre-push checks pass
- Update documentation if needed
- Test changes thoroughly before submitting

## Troubleshooting

### Pre-Push Hook Not Running
1. Ensure Husky is installed: `pnpm install`
2. Check that `.husky/pre-push` exists and is executable
3. Verify `prepare` script in `package.json` runs Husky

### Build Failures
1. Clear `node_modules` and reinstall: `rm -rf node_modules && pnpm install`
2. Clear build artifacts: `rm -rf electron-dist dist`
3. Recompile: `pnpm electron:compile:preload && pnpm electron:compile`

### Type Errors
1. Run `pnpm types:check` to see all errors
2. Check `tsconfig.json` and `tsconfig.electron.json` configurations
3. Ensure all dependencies are installed

