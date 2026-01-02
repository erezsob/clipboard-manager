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

### 🔨 Needs Implementation
- System tray icon with menu
- Favorites/star feature
- Individual item deletion
- Load more functionality (pagination)
- Clear all history
- Near-duplicate detection (whitespace normalization)
- Window positioning at cursor
- Error handling with retry logic
- Settings/preferences

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
  - Click icon → Open manager window at cursor position
  - Show recent items (optional submenu with last 5-10 items)
  - Quit
- **Window Behavior**:
  - Opens at cursor position when triggered from tray
  - Background monitoring continues when window is hidden

### 2.3 Favorites System
- Star icon on each history item
- Toggle favorite state
- Filter toggle: "Show Favorites Only"
- Database: Add `is_favorite` boolean column

### 2.4 Item Management
- **Delete Individual Items**:
  - Trash icon next to each item
  - Immediate removal on click
  - No confirmation (personal use)
- **Clear All History**:
  - Button in settings/header
  - Confirmation dialog (destructive action)

### 2.5 Search & Filtering
- Case-insensitive search (current)
- Favorites filter toggle
- No regex or advanced queries (future)

### 2.6 Error Handling
- Clipboard access errors: Display error message in window
- Retry logic: Automatic retry with exponential backoff
- User feedback: Clear error messages

---

## 3. UI/UX Specifications

### 3.1 Window Behavior
- **Position**: Appear at cursor when opened from tray
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
│ [Clear All] [Settings]          │
└─────────────────────────────────┘
```

### 3.4 Interaction Patterns
- Click item → Copy to clipboard and hide window
- Click star → Toggle favorite
- Click trash → Delete item immediately
- Click "Load More" → Fetch next 100 items
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

### Required Migration
```sql
-- Migration 002: Add favorites support
ALTER TABLE history ADD COLUMN is_favorite INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_is_favorite ON history(is_favorite);
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
- Handle click events to show window at cursor

### 5.5 Window Positioning
- Get cursor position via Tauri API
- Calculate window position (center on cursor or offset)
- Apply position before showing window

### 5.6 Error Handling & Retry
- Wrap clipboard operations in try-catch
- Implement exponential backoff retry (3 attempts: 1s, 2s, 4s)
- Display user-friendly error messages

---

## 6. Implementation Phases

### Phase 1: Core Enhancements (Priority: High)
1. ✅ System tray icon and menu
2. ✅ Window positioning at cursor
3. ✅ Individual item deletion (trash icon)
4. ✅ Clear all history functionality
5. ✅ Error handling with retry logic

### Phase 2: Favorites System (Priority: High)
1. ✅ Database migration for `is_favorite` column
2. ✅ Star icon UI component
3. ✅ Toggle favorite functionality
4. ✅ Favorites filter toggle
5. ✅ Update queries to support favorites

### Phase 3: Pagination & Performance (Priority: Medium)
1. ✅ Update `getHistory()` to support pagination
2. ✅ "Load More" button UI
3. ✅ State management for loaded items
4. ✅ Near-duplicate detection (whitespace normalization)

### Phase 4: Polish & Settings (Priority: Medium)
1. ✅ Settings/preferences window
2. ✅ Clear all history confirmation
3. ✅ UI refinements
4. ✅ Error message styling

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
- ✅ System tray icon with click-to-open
- ✅ Window appears at cursor position
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
- Window positioning uses cursor coordinates
- Retry logic uses exponential backoff

---

## Next Steps

1. ✅ Review and approve this plan
2. 🔨 Prioritize Phase 1 tasks
3. 🔨 Begin implementation with system tray integration
4. 🔨 Iterate based on usage and feedback

---

**Document Version**: 1.0  
**Last Updated**: 2024-12-19  
**Status**: Ready for Implementation

