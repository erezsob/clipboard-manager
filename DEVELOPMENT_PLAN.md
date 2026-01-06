# Clipboard Manager - Development Plan Document

## Executive Summary
Personal-use macOS clipboard manager with background monitoring, local SQLite storage, and system tray interface. Focus on core functionality first, with enhancements planned for later.

---

## 1. Current State Assessment

### ✅ Already Implemented
- Basic clipboard history tracking (text only)
- SQLite database with `history` table
- Window toggle via `Cmd+Shift+V` keyboard shortcut
- Search functionality
- Keyboard navigation (Arrow keys, Enter, Escape)
- Dark mode UI
- Window starts hidden
- Pre-push git hook (linting, formatting, types, knip checks)

### 🔨 Needs Implementation
- Settings menu (cog icon) in bottom right with Quit and Clear All options
- System tray icon with menu
- Favorites/star feature
- Individual item deletion
- Load more functionality (pagination)
- Clear all history
- Near-duplicate detection (whitespace normalization)
- Error handling with retry logic
- Settings/preferences
- Automated testing suite (unit, integration, component, E2E)

---

## 2. Core Features to Implement

### 2.1 History Management
- **Display**: Show 100 most recent items initially
- **Pagination**: "Load More" button at bottom to fetch next batch
- **Storage**: No automatic cleanup or limits (future feature)
- **Duplicate Detection**:
  - Skip exact duplicates (current behavior)
  - Skip near-duplicates (normalize whitespace: trim, collapse spaces)

### 2.2 System Tray Integration
- **Tray Icon**: Always visible in menu bar
- **Tray Menu**:
  - Open → Open manager window
  - Quit
- **Window Behavior**:
  - Opens when triggered from tray
  - Background monitoring continues when window is hidden

### 2.3 Favorites System
- Star icon on each history item
- Toggle favorite state
- Filter toggle: "Show Favorites Only"
- Database: Add `is_favorite` boolean column

### 2.4 Item Management
- **Delete Individual Items**:
  - Trash icon next to each item on hover
  - Immediate removal on click
  - No confirmation (personal use)
- **Clear All History**:
  - Moved to settings menu dropdown
  - Confirmation dialog (destructive action)

### 2.5 Search & Filtering
- Case-insensitive search (current)
- Favorites filter toggle
- No regex or advanced queries (future)

### 2.6 Error Handling
- Clipboard access errors: Display error message in window
- Retry logic: Automatic retry with exponential backoff
- User feedback: Clear error messages

### 2.7 Persisted Snippets Management
- **Snippets Storage**: Separate table for user-created snippets (distinct from clipboard history)
- **Snippet Creation**: 
  - Create new snippet from text input or selected history item
  - Add title/name and optional tags/categories
  - Store permanently until explicitly deleted
- **Snippet Management**:
  - View all snippets in dedicated section or filtered view
  - Edit snippet content, title, and tags
  - Delete snippets individually
  - Quick copy to clipboard
- **Snippet Organization**:
  - Optional tags/categories for grouping
  - Search snippets by content, title, or tags
  - Sort by name, date created, or last used
- **UI Integration**:
  - Toggle between "History" and "Snippets" views
  - Create snippet button/action
  - Snippet list with edit/delete actions
  - Quick access from main window

### 2.8 Settings Menu
- **Location**: Bottom right corner of window
- **Icon**: Settings cog icon (⚙️)
- **Behavior**: Click to open dropdown menu
- **Menu Items**:
  - Clear All (with confirmation dialog)
  - Quit (closes application)
- **UI Details**:
  - Menu appears as dropdown below/above icon
  - Closes on item selection or click outside
  - Styled to match dark theme
- **Removed**: Clear All button from top bar (moved to settings menu)

---

## 3. UI/UX Specifications

### 3.1 Window Behavior
- **Size**: 450x600 (current)
- **Style**: Frameless, transparent, rounded corners
- **Visibility**: Starts hidden, toggles via shortcut or tray

### 3.2 Visual Design
- **Theme**: Dark mode only
- **Accent Color**: Blue (current)
- **Animations**: None (future feature)

### 3.3 Layout Structure
```
┌─────────────────────────────────┐
│ [Search Bar] [Favorites Filter] │
├─────────────────────────────────┤
│ [History Item 1] [⭐] [🗑️]     │
│ [History Item 2] [⭐] [🗑️]     │
│ ...                             │
│ [Load More Button]              │
├─────────────────────────────────┤
│                          [⚙️]   │
└─────────────────────────────────┘
     Settings Menu (bottom right)
     ┌─────────────┐
     │ Clear All   │
     │ Quit        │
     └─────────────┘
```

### 3.4 Interaction Patterns
- Click item → Copy to clipboard and hide window
- Click star → Toggle favorite
- Click trash → Delete item immediately
- Click "Load More" → Fetch next 100 items
- Click settings cog → Open dropdown menu
- Click "Clear All" in menu → Show confirmation, then clear all history
- Click "Quit" in menu → Close application
- Keyboard shortcuts remain (Arrow keys, Enter, Escape)

---

## 4. Database Schema Updates

### Current Schema
```sql
CREATE TABLE history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Required Migrations
```sql
-- Migration 002: Add favorites support
ALTER TABLE history ADD COLUMN is_favorite INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_is_favorite ON history(is_favorite);

-- Migration 003: Create snippets table
CREATE TABLE snippets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT, -- JSON array or comma-separated
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_used_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_snippets_title ON snippets(title);
CREATE INDEX IF NOT EXISTS idx_snippets_tags ON snippets(tags);
CREATE INDEX IF NOT EXISTS idx_snippets_last_used ON snippets(last_used_at);
```

---

## 5. Technical Implementation Details

### 5.1 Background Monitoring
- Continue polling clipboard every 1000ms when window is hidden
- Store new items in database
- No UI updates needed when hidden

### 5.2 Near-Duplicate Detection
```typescript
function normalizeWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

function isNearDuplicate(newText: string, recentText: string): boolean {
  return normalizeWhitespace(newText) === normalizeWhitespace(recentText);
}
```

### 5.3 Pagination Implementation
- Initial load: `SELECT ... LIMIT 100`
- Load more: `SELECT ... LIMIT 100 OFFSET {currentCount}`
- Track loaded count in component state

### 5.4 System Tray (Rust)
- Use `tauri-plugin-system-tray` or native macOS APIs
- Create tray icon with menu
- Handle click events to show window

### 5.5 Error Handling & Retry
- Wrap clipboard operations in try-catch
- Implement exponential backoff retry (3 attempts: 1s, 2s, 4s)
- Display user-friendly error messages

### 5.6 TanStack Query Integration
- Replace manual state management with TanStack Query (React Query)
- Benefits:
  - Automatic caching and background refetching
  - Optimistic updates for better UX
  - Built-in loading and error states
  - Query invalidation and refetching
  - Reduced boilerplate code
- Implementation:
  - Wrap app with `QueryClientProvider`
  - Convert `getHistory()`, `searchHistory()` to `useQuery` hooks
  - Convert mutations (`addClip`, `deleteHistoryItem`, etc.) to `useMutation` hooks
  - Implement query keys for proper cache management
  - Add optimistic updates for delete/favorite operations
  - Configure stale time and cache time appropriately

### 5.7 Snippets Management Implementation
- **Database Operations**:
  - `createSnippet(title, content, tags?)`: Insert new snippet
  - `getSnippets(filters?)`: Fetch all or filtered snippets
  - `updateSnippet(id, title?, content?, tags?)`: Update snippet
  - `deleteSnippet(id)`: Remove snippet
  - `searchSnippets(query)`: Search by content, title, or tags
- **UI Components**:
  - Snippet list view with title, preview, and actions
  - Snippet editor/form (create/edit)
  - Tag input component
  - View toggle between History and Snippets
- **Integration**:
  - "Save as Snippet" action on history items
  - Quick copy from snippets list
  - Update `last_used_at` when snippet is copied

### 5.8 Automated Testing Suite
- **Testing Framework**: Vitest (unit/integration) + React Testing Library (components) + Playwright (E2E)
- **Unit Tests**:
  - Database functions (`addClip`, `getHistory`, `searchHistory`, `deleteHistoryItem`, etc.)
  - Utility functions (whitespace normalization, duplicate detection)
  - Data transformation and validation logic
- **Integration Tests**:
  - Database operations with test database
  - Clipboard operations with mocked Electron API
  - TanStack Query hooks and mutations
  - Error handling and retry logic
- **Component Tests**:
  - React components with React Testing Library
  - User interactions (clicks, keyboard navigation)
  - State management and side effects
  - Accessibility checks
- **E2E Tests**:
  - Full application flow (open window, copy item, search, delete)
  - Keyboard shortcuts functionality
  - System tray interactions
  - Window visibility
- **Test Infrastructure**:
  - Test database setup/teardown
  - Mock Electron APIs and clipboard access
  - Test utilities and helpers
  - Coverage reporting (aim for 80%+ coverage)
  - CI/CD integration for automated test runs

### 5.9 Settings Menu Implementation
- **Component**: Settings dropdown menu with cog icon
- **Positioning**: Fixed position in bottom right corner
- **State Management**: 
  - Track menu open/closed state
  - Handle click outside to close
  - Handle menu item clicks
- **Menu Items**:
  - Clear All: Triggers confirmation dialog, then calls `clearAllHistory()`
  - Quit: Calls Electron API to close application (`app.quit()`)
- **Styling**: 
  - Dark theme matching
  - Dropdown animation (optional, future enhancement)
  - Hover states for menu items
- **Accessibility**: 
  - Keyboard navigation support
  - ARIA labels for screen readers

### 5.10 Pre-Push Git Hook Implementation
- **Purpose**: Enforce code quality checks before code is pushed to remote repository
- **Hook Type**: Git pre-push hook (runs before `git push`)
- **Implementation Tool**: Husky (primary method for hook management)
- **Checks to Run**:
  1. **Linting**: Run Biome linter (`biome check` or `biome lint`)
  2. **Formatting**: Verify code is formatted (`biome format --check` or `biome check --write`)
  3. **Type Checking**: Run TypeScript compiler (`tsc --noEmit`)
  4. **Knip Check**: Run Knip to detect unused code (`knip` or `knip --production`)
- **Implementation Steps**:
  1. Install `husky` as a dev dependency
  2. Initialize husky with `pnpm husky init` (creates `.husky` directory)
  3. Create `.husky/pre-push` script that runs all checks in sequence
  4. Configure script to exit with error code if any check fails (prevents push)
  5. Display clear error messages indicating which check failed
  6. Allow bypass with `--no-verify` flag (for emergency cases)
- **Husky Pre-Push Script Structure**:
  ```bash
  #!/usr/bin/env sh
  . "$(dirname -- "$0")/_/husky.sh"
  
  # Run linting
  pnpm biome check || exit 1
  # Run type checking
  pnpm tsc --noEmit || exit 1
  # Run Knip
  pnpm knip || exit 1
  ```
- **Benefits of Using Husky**:
  - Cross-platform support (Windows, macOS, Linux)
  - Easy hook management via `.husky` directory
  - Version-controlled hooks (committed to repository)
  - Simple installation and setup
  - Works seamlessly with pnpm/npm/yarn
- **Additional Benefits**:
  - Prevents broken code from being pushed
  - Ensures consistent code style
  - Catches type errors early
  - Identifies unused code and dependencies
  - Reduces CI/CD failures
- **Configuration**:
  - Ensure all required scripts exist in `package.json`
  - Add `prepare` script to `package.json`: `"prepare": "husky install"` (runs after install)
  - Document hook behavior in README
  - Consider adding `lint-staged` for pre-commit checks (future enhancement)

---

## 6. Implementation Phases

### Phase 1: Core Enhancements (Priority: High)
1. ✅ Settings menu (cog icon) in bottom right with dropdown (Quit, Clear All)
2. ✅ Remove Clear All button from top bar
3. ✅ System tray icon and menu
4. ✅ Individual item deletion (trash icon)
5. ✅ Clear all history functionality
6. ✅ Error handling with retry logic

### Phase 2: Favorites System (Priority: High)
1. ✅ Database migration for `is_favorite` column
2. ✅ Star icon UI component
3. ✅ Toggle favorite functionality
4. ✅ Favorites filter toggle
5. ✅ Update queries to support favorites

### Phase 3: Pagination & Performance (Priority: Medium)
1. 🔨 Update `getHistory()` to support pagination
2. 🔨 "Load More" button UI
3. 🔨 State management for loaded items
4. 🔨 Near-duplicate detection (whitespace normalization)

### Phase 4: Polish & Settings (Priority: Medium)
1. 🔨 Settings/preferences window
2. 🔨 Clear all history confirmation
3. 🔨 UI refinements
4. 🔨 Error message styling

### Phase 5: TanStack Query Integration (Priority: Medium)
1. 🔨 Install and configure `@tanstack/react-query`
2. 🔨 Set up `QueryClientProvider` in app root
3. 🔨 Convert history fetching to `useQuery` hooks
4. 🔨 Convert mutations to `useMutation` hooks (add, delete, favorite, clear)
5. 🔨 Implement query key factory for consistent cache management
6. 🔨 Add optimistic updates for delete and favorite operations
7. 🔨 Configure cache and stale time settings
8. 🔨 Remove manual state management from `useClipboard` hook
9. 🔨 Add automatic refetching on window focus
10. 🔨 Test cache invalidation and refetching behavior

### Phase 6: Persisted Snippets Management (Priority: Medium)
1. 🔨 Database migration: Create `snippets` table with indexes
2. 🔨 Implement database functions: create, read, update, delete, search snippets
3. 🔨 Create snippet data access layer in `src/lib/db.ts`
4. 🔨 Build snippet UI components:
   - Snippet list view
   - Snippet editor/form (create/edit)
   - Tag input component
   - View toggle component
5. 🔨 Integrate TanStack Query for snippet operations
6. 🔨 Add "Save as Snippet" action to history items
7. 🔨 Implement snippet search and filtering
8. 🔨 Add snippet management actions (edit, delete, copy)
9. 🔨 Update UI layout to support History/Snippets toggle
10. 🔨 Test snippet persistence and retrieval

### Phase 7: Automated Testing Suite (Priority: High)
1. 🔨 Install testing dependencies: Vitest, React Testing Library, Playwright, MSW
2. 🔨 Configure Vitest with TypeScript and React support
3. 🔨 Set up test database utilities (create, seed, cleanup)
4. 🔨 Create Electron API mocks for clipboard and database operations
5. 🔨 Write unit tests for database functions (`db.ts`)
6. 🔨 Write unit tests for utility functions (whitespace normalization, duplicate detection)
7. 🔨 Write integration tests for database operations with test database
8. 🔨 Write component tests for React components (history list, search, favorites)
9. 🔨 Write tests for TanStack Query hooks and mutations
10. 🔨 Set up Playwright for E2E testing
11. 🔨 Write E2E tests for core user flows:
    - Open window, view history, copy item
    - Search functionality
    - Delete item, clear all
    - Favorites toggle and filter
    - Keyboard navigation
12. 🔨 Configure test coverage reporting (vitest --coverage)
13. 🔨 Add test scripts to package.json (`test`, `test:watch`, `test:coverage`, `test:e2e`)
14. 🔨 Set up CI/CD pipeline for automated test runs (GitHub Actions)
15. 🔨 Establish test coverage goals (80%+ for critical paths)
16. 🔨 Document testing patterns and best practices

### Phase 8: Pre-Push Git Hook (Priority: Medium)
1. ✅ Install husky as dev dependency (`pnpm add -D husky`)
2. ✅ Initialize husky (`pnpm husky init`) to create `.husky` directory
3. ✅ Add `prepare` script to package.json: `"prepare": "husky"` (auto-installs hooks after npm/pnpm install)
4. ✅ Verify all required scripts exist in package.json:
   - `lint`: Biome linting check
   - `format`: Biome formatting check
   - `types:check`: TypeScript type checking (`tsc --noEmit`)
   - `knip`: Knip unused code detection
5. ✅ Create `.husky/pre-push` script that runs all checks:
   - Biome linting (`biome check`)
   - Biome formatting (`biome format --check`)
   - TypeScript type checking (`tsc --noEmit`)
   - Knip check (`knip` or `knip --production`)
6. ✅ Configure hook to exit with error if any check fails
7. ✅ Make pre-push script executable (`chmod +x .husky/pre-push`)
8. ✅ Test hook behavior (should block push on failures, allow push on success)
9. ✅ Document hook behavior in README
10. ✅ Add note about `--no-verify` bypass option for emergencies

---

## 7. Future Features Roadmap

### High Priority (Future)
- 🔮 Encryption for stored data
- 🔮 Bulk delete functionality
- 🔮 Export history (JSON/CSV)
- 🔮 Customizable keyboard shortcuts
- 🔮 Automatic cleanup/limits
- 🔮 macOS Services menu integration
- 🔮 Spotlight search integration

### Medium Priority (Future)
- 🔮 Image/file clipboard support
- 🔮 Content filtering (ignore passwords/sensitive data)
- 🔮 Advanced duplicate detection (fuzzy matching)
- 🔮 Date range filters
- 🔮 Regex search support
- 🔮 Window animations
- 🔮 Private mode (don't save certain items)
- 🔮 Accessibility improvements
- 🔮 Snippet templates/variables
- 🔮 Snippet folders/categories UI

### Low Priority (Future)
- 🔮 Light mode theme
- 🔮 Sync across devices (if needed)
- 🔮 Automatic backups
- 🔮 Quick Look preview

---

## 8. Technical Stack Confirmation

### Current Stack
- **Frontend**: React + TypeScript + Tailwind CSS v4
- **Backend**: Rust (Tauri v2)
- **Database**: SQLite (via `tauri-plugin-sql`)
- **State Management**: TanStack Query (React Query) - Phase 5
- **Testing**: Vitest + React Testing Library + Playwright - Phase 7
- **Plugins**:
  - `@tauri-apps/plugin-clipboard-manager`
  - `@tauri-apps/plugin-global-shortcut`
  - `@tauri-apps/plugin-sql`
  - `@tauri-apps/plugin-opener`

### Additional Plugins Needed
- **System Tray**: Native Tauri APIs or `tauri-plugin-system-tray` (if available)

---

## 9. Success Criteria

### Must Have (MVP)
- 🔨 Settings menu in bottom right (Quit, Clear All)
- ✅ System tray icon with click-to-open
- ✅ Delete individual items
- ✅ Favorites with filter
- ✅ Load more pagination
- ✅ Clear all history
- ✅ Near-duplicate detection
- ✅ Error handling with retries

### Nice to Have
- 🔮 Smooth animations
- 🔮 Settings window
- 🔮 Enhanced error messages
- 🔮 TanStack Query integration for better data management
- 🔮 Persisted snippets for frequently used text
- 🔮 Comprehensive automated test suite (80%+ coverage)

---

## 10. Notes & Assumptions

### Assumptions
- Personal use only (no multi-user concerns)
- Local storage only (no cloud sync)
- Data loss acceptable (backup not required)
- macOS-specific (not cross-platform)

### Design Decisions
- No animations initially (simpler, faster)
- No encryption initially (complexity)
- Bulk delete deferred (individual delete sufficient)
- No accessibility features initially (personal use)

### Technical Notes
- SQLite sufficient for local storage
- Background monitoring continues when hidden
- Retry logic uses exponential backoff
- TanStack Query provides better data fetching patterns and caching
- Snippets are separate from history for better organization
- Testing strategy: Unit tests for logic, integration tests for database, component tests for UI, E2E tests for critical flows
- Test coverage target: 80%+ for critical paths (database operations, clipboard logic, core UI interactions)

---

## Next Steps

1. ✅ Review and approve this plan
2. 🔨 Prioritize Phase 1 tasks
3. 🔨 Begin implementation with system tray integration
4. 🔨 Iterate based on usage and feedback

---

**Document Version**: 1.5  
**Last Updated**: 2026-01-03  
**Status**: Ready for Implementation  
**Changes**: Added Phase 5 (TanStack Query Integration), Phase 6 (Persisted Snippets Management), Phase 7 (Automated Testing Suite), Phase 8 (Pre-Push Git Hook), and high-priority Settings Menu feature (Phase 1). Phase 8 (Pre-Push Git Hook) completed.

