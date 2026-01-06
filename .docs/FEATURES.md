# Feature Specifications & Roadmap

## Core Features to Implement

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

## UI/UX Specifications

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

## Implementation Details

### Near-Duplicate Detection
```typescript
function normalizeWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

function isNearDuplicate(newText: string, recentText: string): boolean {
  return normalizeWhitespace(newText) === normalizeWhitespace(recentText);
}
```
- ✅ Implemented in Phase 3

### Pagination Implementation
- Initial load: `SELECT ... LIMIT 100`
- Load more: `SELECT ... LIMIT 100 OFFSET {currentCount}`
- Track loaded count in component state
- ✅ Implemented in Phase 3

### System Tray (Electron)
- Use Electron's `Tray` API (native macOS support)
- Create tray icon with menu using `Menu.buildFromTemplate()`
- Handle click events to show window
- ✅ Implemented in Phase 1

### Error Handling & Retry
- Wrap clipboard operations in try-catch
- Implement exponential backoff retry (3 attempts: 1s, 2s, 4s)
- Display user-friendly error messages
- ✅ Implemented in Phase 1

### TanStack Query Integration
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

### Snippets Management Implementation
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

### Automated Testing Suite
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

### Settings Menu Implementation
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
- ✅ Implemented in Phase 1

### Code Refactoring & Component Extraction
- **Goal**: Improve code maintainability, readability, and testability by breaking down App.tsx
- **Custom Hooks to Extract**:
  - `useWindowVisibility`: Manages window visibility state, focus handling, and Electron API integration
  - `useHistorySearch`: Handles search query state, favorites filter, and filtered history updates
  - `useKeyboardNavigation`: Manages keyboard shortcuts (Arrow keys, Enter, Escape) and selected index
  - `useHistoryActions`: Encapsulates all history item actions (copy, delete, favorite, clear all)
- **Components to Extract**:
  - `ErrorBanner`: Displays error messages with dismiss functionality
  - `SearchBar`: Search input with clear button and favorites filter toggle
  - `HistoryItem`: Individual history item with content, date, and action buttons (star, copy, delete)
  - `HistoryList`: Container for history items with empty state handling
  - `SettingsMenu`: Dropdown menu with Clear All and Quit options
  - `Footer`: Footer bar with keyboard hints and settings menu
- **Utility Functions**:
  - Move `formatDate` to `src/lib/utils.ts`
  - Move `truncateText` to `src/lib/utils.ts`
  - Move `retryOperation` to `src/lib/retry.ts` or `src/lib/utils.ts`
- **File Structure**:
  ```
  src/
    components/
      history/
        HistoryItem.tsx
        HistoryList.tsx
      common/
        ErrorBanner.tsx
        SearchBar.tsx
        SettingsMenu.tsx
        Footer.tsx
    hooks/
      useWindowVisibility.ts
      useHistorySearch.ts
      useKeyboardNavigation.ts
      useHistoryActions.ts
    lib/
      utils.ts
      retry.ts
  ```
- **Benefits**:
  - Reduced complexity in App.tsx (from ~580 lines to <200 lines)
  - Improved testability (components and hooks can be tested in isolation)
  - Better reusability (components can be used in other contexts)
  - Easier maintenance (changes isolated to specific components/hooks)
  - Better code organization and discoverability

## Future Features Roadmap

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

## Success Criteria

### Must Have (MVP)
- ✅ Settings menu in bottom right (Quit, Clear All)
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

