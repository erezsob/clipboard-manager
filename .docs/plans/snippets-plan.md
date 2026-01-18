# Phase 6: Persisted Snippets Management - Implementation Plan

**Created**: 2026-01-11
**Updated**: 2026-01-18
**Status**: Planning
**Estimated Effort**: Medium-Large

## Overview

Add a snippets feature that allows users to save, organize, and quickly access frequently used text and rich text snippets. Unlike clipboard history (ephemeral), snippets are intentionally saved and persist indefinitely. Supports RTF format preservation (matching history items).

## Goals

- Allow users to save clipboard items as snippets (with optional name)
- Provide search functionality across snippet names and content
- Enable CRUD operations (create, read, update, delete)
- Integrate seamlessly with existing History view via tab navigation

## Non-Goals (Out of Scope)

- Snippet import/export (future enhancement)
- Snippet sharing (future enhancement)
- Syntax highlighting (future enhancement)

---

## Implementation Phases

### Phase 6.1: Database Layer

**Files to modify/create:**
- `electron/migrations/004_add_snippets.sql` (new)
- `electron/main.ts` (modify)
- `electron/preload.ts` (modify)
- `src/types/electron.d.ts` (modify)

#### 6.1.1: Database Migration

Create `electron/migrations/004_add_snippets.sql`:

```sql
-- Migration 004: Add snippets table
CREATE TABLE IF NOT EXISTS snippets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,  -- Optional display name
  content TEXT NOT NULL,
  rtf TEXT,  -- RTF format data (nullable, matches history table pattern)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for search operations
CREATE INDEX IF NOT EXISTS idx_snippets_name ON snippets(name);
CREATE INDEX IF NOT EXISTS idx_snippets_created_at ON snippets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_snippets_updated_at ON snippets(updated_at DESC);

-- Full-text search index (optional, SQLite FTS5)
-- For now, use LIKE queries; FTS can be added later if performance is an issue
```

#### 6.1.2: Snippet Type Definition

Add to `electron/main.ts`:

```typescript
type SnippetRow = {
  id: number;
  name: string | null;  // Optional display name
  content: string;
  rtf: string | null;  // RTF format data
  created_at: string;
  updated_at: string;
};

type CreateSnippetInput = {
  name?: string;  // Optional display name
  content: string;
  rtf?: string | null;  // RTF format data
};

type UpdateSnippetInput = {
  id: number;
  name?: string | null;  // Can set to null to clear
  content?: string;
  rtf?: string | null;  // RTF format data
};
```

#### 6.1.3: Database Handlers in Main Process

Add snippet handlers to `createDbHandlers` in `electron/main.ts`:

```typescript
// Add these to createDbHandlers return object:

getSnippets: (
  _event: Electron.IpcMainInvokeEvent,
  options: { query?: string; limit?: number; offset?: number } = {}
) => {
  const db = dbModule.getDb();
  const { query = "", limit = 50, offset = 0 } = options;
  
  let sql = "SELECT * FROM snippets";
  const params: (string | number)[] = [];
  
  if (query.trim()) {
    sql += " WHERE name LIKE ? OR content LIKE ?";
    const searchTerm = `%${query}%`;
    params.push(searchTerm, searchTerm);
  }
  
  sql += " ORDER BY updated_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);
  
  return db.prepare(sql).all(...params) as SnippetRow[];
},

getSnippetById: (
  _event: Electron.IpcMainInvokeEvent,
  id: number
) => {
  if (!isValidId(id)) throw new Error(`Invalid snippet id: ${id}`);
  const db = dbModule.getDb();
  return db.prepare("SELECT * FROM snippets WHERE id = ?").get(id) as SnippetRow | undefined;
},

createSnippet: (
  _event: Electron.IpcMainInvokeEvent,
  input: CreateSnippetInput
) => {
  const db = dbModule.getDb();
  const { name, content, rtf = null } = input;
  
  if (!content.trim()) throw new Error("Snippet content is required");
  
  const result = db.prepare(
    "INSERT INTO snippets (name, content, rtf) VALUES (?, ?, ?)"
  ).run(name?.trim() || null, content, rtf);
  
  return result.lastInsertRowid as number;
},

updateSnippet: (
  _event: Electron.IpcMainInvokeEvent,
  input: UpdateSnippetInput
) => {
  const { id, ...updates } = input;
  if (!isValidId(id)) throw new Error(`Invalid snippet id: ${id}`);
  
  const db = dbModule.getDb();
  
  const setClauses: string[] = ["updated_at = datetime('now')"];
  const params: (string | number | null)[] = [];
  
  if (updates.name !== undefined) {
    setClauses.push("name = ?");
    params.push(updates.name?.trim() || null);
  }
  if (updates.content !== undefined) {
    setClauses.push("content = ?");
    params.push(updates.content);
  }
  if (updates.rtf !== undefined) {
    setClauses.push("rtf = ?");
    params.push(updates.rtf);
  }
  
  params.push(id);
  
  db.prepare(`UPDATE snippets SET ${setClauses.join(", ")} WHERE id = ?`).run(...params);
},

deleteSnippet: (
  _event: Electron.IpcMainInvokeEvent,
  id: number
) => {
  if (!isValidId(id)) throw new Error(`Invalid snippet id: ${id}`);
  const db = dbModule.getDb();
  db.prepare("DELETE FROM snippets WHERE id = ?").run(id);
},
```

#### 6.1.4: Register IPC Handlers

Add to `registerIpcHandlers()`:

```typescript
ipcMain.handle("db:getSnippets", dbHandlers.getSnippets);
ipcMain.handle("db:getSnippetById", dbHandlers.getSnippetById);
ipcMain.handle("db:createSnippet", dbHandlers.createSnippet);
ipcMain.handle("db:updateSnippet", dbHandlers.updateSnippet);
ipcMain.handle("db:deleteSnippet", dbHandlers.deleteSnippet);
```

#### 6.1.5: Preload Script Updates

Add to `electron/preload.ts`:

```typescript
// Add snippets namespace to electronAPI
snippets: {
  getAll: (options?: { query?: string; limit?: number; offset?: number }) =>
    ipcRenderer.invoke("db:getSnippets", options ?? {}) as Promise<
      Array<{
        id: number;
        name: string | null;
        content: string;
        rtf: string | null;
        created_at: string;
        updated_at: string;
      }>
    >,
  getById: (id: number) =>
    ipcRenderer.invoke("db:getSnippetById", id) as Promise<{
      id: number;
      name: string | null;
      content: string;
      rtf: string | null;
      created_at: string;
      updated_at: string;
    } | undefined>,
  create: (input: { name?: string; content: string; rtf?: string | null }) =>
    ipcRenderer.invoke("db:createSnippet", input) as Promise<number>,
  update: (input: { id: number; name?: string | null; content?: string; rtf?: string | null }) =>
    ipcRenderer.invoke("db:updateSnippet", input) as Promise<void>,
  delete: (id: number) =>
    ipcRenderer.invoke("db:deleteSnippet", id) as Promise<void>,
},
```

#### 6.1.6: TypeScript Type Definitions

Update `src/types/electron.d.ts` to include snippet types.

---

### Phase 6.2: Frontend Data Layer

**Files to modify/create:**
- `src/lib/db.ts` (modify)
- `src/lib/queryKeys.ts` (modify)
- `src/hooks/queries/useSnippetsQuery.ts` (new)
- `src/hooks/mutations/snippets.ts` (new)

#### 6.2.1: Snippet Types and DB Functions

Add to `src/lib/db.ts`:

```typescript
export interface Snippet {
  id: number;
  name: string | null;  // Optional display name
  content: string;
  rtf: string | null;  // RTF format data
  created_at: string;
  updated_at: string;
}

export interface GetSnippetsOptions {
  query?: string;
  limit?: number;
  offset?: number;
}

export interface CreateSnippetInput {
  name?: string;  // Optional display name
  content: string;
  rtf?: string | null;  // RTF format data
}

export interface UpdateSnippetInput {
  id: number;
  name?: string | null;  // Can set to null to clear
  content?: string;
  rtf?: string | null;  // RTF format data
}

// Result-returning functions
export const getSnippetsResult = (options: GetSnippetsOptions = {}) =>
  withElectronAPI(
    () => window.electronAPI.snippets.getAll(options),
    "Failed to get snippets"
  );

export const getSnippetByIdResult = (id: number) =>
  withElectronAPI(
    () => window.electronAPI.snippets.getById(id),
    "Failed to get snippet"
  );

export const createSnippetResult = (input: CreateSnippetInput) =>
  withElectronAPI(
    () => window.electronAPI.snippets.create(input),
    "Failed to create snippet"
  );

export const updateSnippetResult = (input: UpdateSnippetInput) =>
  withElectronAPI(
    () => window.electronAPI.snippets.update(input),
    "Failed to update snippet"
  );

export const deleteSnippetResult = (id: number) =>
  withElectronAPI(
    () => window.electronAPI.snippets.delete(id),
    "Failed to delete snippet"
  );
```

#### 6.2.2: Query Keys for Snippets

Add to `src/lib/queryKeys.ts`:

```typescript
export interface SnippetQueryFilters {
  searchQuery: string;
}

export const snippetKeys = {
  all: ["snippets"] as const,
  list: (filters?: SnippetQueryFilters) =>
    filters
      ? ([...snippetKeys.all, "list", filters] as const)
      : ([...snippetKeys.all, "list"] as const),
  detail: (id: number) => [...snippetKeys.all, "detail", id] as const,
} as const;
```

#### 6.2.3: Snippets Query Hook

Create `src/hooks/queries/useSnippetsQuery.ts`:

```typescript
import { useInfiniteQuery } from "@tanstack/react-query";
import { getSnippetsResult, type Snippet } from "../../lib/db";
import { snippetKeys, type SnippetQueryFilters } from "../../lib/queryKeys";
import { hasMoreItems } from "../../lib/utils";

interface SnippetPage {
  items: Snippet[];
  nextOffset: number | undefined;
}

interface UseSnippetsQueryOptions {
  searchQuery: string;
}

export function useSnippetsQuery({ searchQuery }: UseSnippetsQueryOptions) {
  const filters: SnippetQueryFilters = { searchQuery };

  return useInfiniteQuery({
    queryKey: snippetKeys.list(filters),
    queryFn: async ({ pageParam = 0 }) => {
      const limit = pageParam === 0 ? 50 : 50;
      const result = await getSnippetsResult({
        limit,
        offset: pageParam,
        query: searchQuery.trim(),
      });

      if (!result.ok) throw result.error;

      const items = result.value;
      const hasMore = hasMoreItems(items.length, limit);
      const nextOffset = hasMore ? pageParam + limit : undefined;

      return { items, nextOffset } as SnippetPage;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    placeholderData: (previousData) => previousData,
  });
}

export function flattenSnippetPages(pages: SnippetPage[] | undefined): Snippet[] {
  if (!pages) return [];
  return pages.flatMap((page) => page.items);
}
```

#### 6.2.4: Snippets Mutation Hooks

Create `src/hooks/mutations/snippets.ts`:

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createSnippetResult,
  updateSnippetResult,
  deleteSnippetResult,
  type CreateSnippetInput,
  type UpdateSnippetInput,
} from "../../lib/db";
import { snippetKeys } from "../../lib/queryKeys";

export function useCreateSnippetMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSnippetInput) => {
      const result = await createSnippetResult(input);
      if (!result.ok) throw result.error;
      return result.value;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: snippetKeys.all });
    },
  });
}

export function useUpdateSnippetMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateSnippetInput) => {
      const result = await updateSnippetResult(input);
      if (!result.ok) throw result.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: snippetKeys.all });
    },
  });
}

export function useDeleteSnippetMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const result = await deleteSnippetResult(id);
      if (!result.ok) throw result.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: snippetKeys.all });
    },
  });
}
```

---

### Phase 6.3: UI Components

**Files to create:**
- `src/components/common/ViewToggle.tsx` (new)
- `src/components/snippets/SnippetItem.tsx` (new)
- `src/components/snippets/SnippetList.tsx` (new)
- `src/components/snippets/SnippetEditor.tsx` (new)
- `src/components/snippets/index.ts` (new)

**Files to modify:**
- `src/components/history/HistoryItem.tsx` (add "Save as Snippet" action)
- `src/App.tsx` (add view toggle and snippets view)

#### 6.3.1: View Toggle Component

Create `src/components/common/ViewToggle.tsx`:

```typescript
interface ViewToggleProps {
  activeView: "history" | "snippets";
  onViewChange: (view: "history" | "snippets") => void;
}

export function ViewToggle({ activeView, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex bg-gray-800 rounded-lg p-1 mx-3 mt-2">
      <button
        type="button"
        onClick={() => onViewChange("history")}
        className={`flex-1 py-1.5 px-3 rounded text-sm font-medium transition-colors ${
          activeView === "history"
            ? "bg-blue-600 text-white"
            : "text-gray-400 hover:text-white"
        }`}
      >
        History
      </button>
      <button
        type="button"
        onClick={() => onViewChange("snippets")}
        className={`flex-1 py-1.5 px-3 rounded text-sm font-medium transition-colors ${
          activeView === "snippets"
            ? "bg-blue-600 text-white"
            : "text-gray-400 hover:text-white"
        }`}
      >
        Snippets
      </button>
    </div>
  );
}
```

#### 6.3.2: Snippet Item Component

Create `src/components/snippets/SnippetItem.tsx`:

Similar to `HistoryItem.tsx` but with:
- Name display if present, otherwise content preview as primary
- Content preview (truncated plain text)
- Optional RTF indicator (icon when `rtf` is present)
- Edit, Copy, Delete actions

#### 6.3.3: Snippet List Component

Create `src/components/snippets/SnippetList.tsx`:

Similar to `HistoryList.tsx` but renders `SnippetItem` components.

#### 6.3.4: Snippet Editor Component

Create `src/components/snippets/SnippetEditor.tsx`:

Modal or slide-in panel with:
- Name input field (optional)
- Content textarea (larger area for editing plain text)
- Save/Cancel buttons
- Used for both Create and Edit operations

**RTF Note**: Editor shows plain text content. RTF is stored transparently:
- When saving from history: RTF preserved from original item
- When manually creating: RTF remains null (plain text only)
- When editing existing: RTF retained unless content is modified (clears RTF)

#### 6.3.5: Add "Save as Snippet" to History Item

Modify `src/components/history/HistoryItem.tsx`:

Add a new action button (bookmark icon from lucide-react):

```typescript
<button
  type="button"
  onClick={(e) => onSaveAsSnippet(e, item)}
  className="..."
  title="Save as snippet"
  aria-label="Save as snippet"
>
  <Bookmark className="w-4 h-4" />
</button>
```

**RTF Handling**: The `onSaveAsSnippet` callback receives the full `HistoryItem` including `rtf` field. When creating snippet, pass both `content` and `rtf`:

```typescript
// In App.tsx or useSnippetActions
const handleSaveAsSnippet = (item: HistoryItem) => {
  setEditingSnippet({
    content: item.content,
    rtf: item.rtf,  // Preserve RTF from history item
  });
  setIsSnippetEditorOpen(true);
};
```

---

### Phase 6.4: App Integration

**Files to modify:**
- `src/App.tsx`
- `src/hooks/useHistorySearch.ts` (rename or generalize)

#### 6.4.1: App State Management

Add view state to `App.tsx`:

```typescript
const [activeView, setActiveView] = useState<"history" | "snippets">("history");
const [isSnippetEditorOpen, setIsSnippetEditorOpen] = useState(false);
const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
```

#### 6.4.2: Conditional Rendering

Update App.tsx layout:

```typescript
return (
  <div className="flex flex-col h-screen bg-gray-900 text-white overflow-hidden">
    {error && <ErrorBanner message={error} onDismiss={clearError} />}

    {/* View Toggle */}
    <ViewToggle activeView={activeView} onViewChange={setActiveView} />

    {/* Search Bar - works for both views */}
    <SearchBar
      inputRef={searchInputRef}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      favoritesOnly={activeView === "history" ? favoritesOnly : false}
      onFavoritesToggle={activeView === "history" ? () => setFavoritesOnly(!favoritesOnly) : undefined}
      showFavoritesToggle={activeView === "history"}
    />

    {/* Conditional View */}
    {activeView === "history" ? (
      <HistoryList ... />
    ) : (
      <SnippetList ... />
    )}

    {/* Footer */}
    <Footer ... />

    {/* Snippet Editor Modal */}
    {isSnippetEditorOpen && (
      <SnippetEditor
        snippet={editingSnippet}
        onSave={handleSaveSnippet}
        onCancel={() => setIsSnippetEditorOpen(false)}
      />
    )}
  </div>
);
```

#### 6.4.3: Snippet Actions Hook

Create `src/hooks/useSnippetActions.ts`:

```typescript
export function useSnippetActions({
  onHideWindow,
}: {
  onHideWindow: () => Promise<void>;
}) {
  const createMutation = useCreateSnippetMutation();
  const updateMutation = useUpdateSnippetMutation();
  const deleteMutation = useDeleteSnippetMutation();

  const handleCopySnippet = async (snippet: Snippet) => {
    // Write both text and RTF if available (matches history item behavior)
    await window.electronAPI.clipboard.write({
      text: snippet.content,
      rtf: snippet.rtf ?? undefined,
    });
    await onHideWindow();
  };

  const handleCreateSnippet = async (input: CreateSnippetInput) => {
    await createMutation.mutateAsync(input);
  };

  const handleUpdateSnippet = async (input: UpdateSnippetInput) => {
    await updateMutation.mutateAsync(input);
  };

  const handleDeleteSnippet = async (id: number) => {
    await deleteMutation.mutateAsync(id);
  };

  return {
    handleCopySnippet,
    handleCreateSnippet,
    handleUpdateSnippet,
    handleDeleteSnippet,
  };
}
```

---

### Phase 6.5: Testing

**Files to create:**
- `src/lib/db.test.ts` (add snippet tests)
- `src/components/snippets/SnippetItem.test.tsx`
- `src/components/snippets/SnippetList.test.tsx`
- `src/components/snippets/SnippetEditor.test.tsx`
- `src/hooks/mutations/snippets.test.tsx`
- `src/hooks/queries/useSnippetsQuery.test.tsx`

#### 6.5.1: Mock Updates

Update `src/test/mocks/electronAPI.ts` to include snippet methods.

#### 6.5.2: Unit Tests

Test all snippet database functions and query hooks.

#### 6.5.3: Component Tests

Test SnippetItem, SnippetList, and SnippetEditor components.

---

## File Summary

### New Files

| File                                        | Purpose                      |
| ------------------------------------------- | ---------------------------- |
| `electron/migrations/004_add_snippets.sql`  | Database schema for snippets |
| `src/components/common/ViewToggle.tsx`      | History/Snippets tab toggle  |
| `src/components/snippets/SnippetItem.tsx`   | Individual snippet display   |
| `src/components/snippets/SnippetList.tsx`   | Snippet list container       |
| `src/components/snippets/SnippetEditor.tsx` | Create/Edit snippet modal    |
| `src/components/snippets/index.ts`          | Barrel export                |
| `src/hooks/queries/useSnippetsQuery.ts`     | Snippet data fetching        |
| `src/hooks/mutations/snippets.ts`           | Snippet CRUD mutations       |
| `src/hooks/useSnippetActions.ts`            | Snippet action handlers      |
| `src/test/mocks/snippets.ts`                | Test mock data               |

### Modified Files

| File                                     | Changes                       |
| ---------------------------------------- | ----------------------------- |
| `electron/main.ts`                       | Add snippet DB handlers       |
| `electron/preload.ts`                    | Expose snippet IPC methods    |
| `src/types/electron.d.ts`                | Add snippet type definitions  |
| `src/lib/db.ts`                          | Add snippet data functions    |
| `src/lib/queryKeys.ts`                   | Add snippet query keys        |
| `src/components/common/SearchBar.tsx`    | Optional favorites toggle     |
| `src/components/common/index.ts`         | Export ViewToggle             |
| `src/components/history/HistoryItem.tsx` | Add "Save as Snippet" action  |
| `src/App.tsx`                            | View toggle and snippets view |
| `src/test/mocks/electronAPI.ts`          | Add snippet mocks             |

---

## Implementation Order

Recommended sequence for implementation:

1. **Database Layer** (Phase 6.1)
   - Migration file
   - Main process handlers
   - Preload script
   - Type definitions

2. **Frontend Data Layer** (Phase 6.2)
   - DB functions
   - Query keys
   - Query hook
   - Mutation hooks

3. **Core UI Components** (Phase 6.3)
   - ViewToggle
   - SnippetItem
   - SnippetList

4. **App Integration** (Phase 6.4)
   - View state management
   - Conditional rendering
   - Keyboard navigation for snippets

5. **Snippet Editor** (Phase 6.3 continued)
   - SnippetEditor modal
   - Save as Snippet from History

6. **Testing** (Phase 6.5)
   - Update mocks
   - Unit tests
   - Component tests

---

## Acceptance Criteria

- [ ] Can create new snippets with content (name optional)
- [ ] Can view list of all snippets
- [ ] Can search snippets by name or content
- [ ] Can edit existing snippets
- [ ] Can delete snippets
- [ ] Can copy snippet content to clipboard (with RTF if available)
- [ ] Can save history item as snippet (preserves RTF)
- [ ] RTF formatting restored when pasting snippet
- [ ] Can toggle between History and Snippets views
- [ ] Keyboard navigation works in Snippets view
- [ ] All existing history functionality still works
- [ ] Tests pass with >80% coverage on new code
- [ ] No TypeScript errors
- [ ] No linting errors

---

## Future Enhancements (Not in Scope)

- Tags support (organize snippets with searchable tags)
- Snippet folders/categories
- Snippet templates with placeholders
- Import/export snippets (JSON)
- Snippet keyboard shortcuts (quick paste)
- Snippet usage statistics
- Syntax highlighting for code snippets
- RTF editor (currently RTF stored/restored but not editable)
