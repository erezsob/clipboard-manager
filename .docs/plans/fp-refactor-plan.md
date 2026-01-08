---
name: Functional Programming Refactor
overview: Introduce custom FP utilities (pipe, Result, Option) and refactor existing code to follow functional programming principles with immutability, pure functions, and declarative patterns.
todos:
  - id: create-fp-utils
    content: Create src/lib/fp.ts with pipe, pipeAsync, flow, Result, and Option types
    status: pending
  - id: create-errors
    content: Create src/lib/errors.ts with domain-specific error types (DbError, ClipboardError)
    status: pending
  - id: refactor-utils
    content: Refactor src/lib/utils.ts - recursive retryOperation returning Result
    status: pending
  - id: refactor-waitfor
    content: Refactor src/utils.ts - recursive waitFor returning Result
    status: pending
  - id: refactor-db
    content: Refactor src/lib/db.ts to return Result types from all operations
    status: pending
  - id: refactor-mutations
    content: Extract pure transformation functions in useHistoryMutations.ts
    status: pending
  - id: refactor-clipboard-monitor
    content: Extract pure change detection in useClipboardMonitor.ts
    status: pending
  - id: refactor-history-actions
    content: Update useHistoryActions.ts to work with Result types
    status: pending
  - id: refactor-electron-main
    content: Encapsulate state and extract pure functions in electron/main.ts
    status: pending
  - id: update-docs
    content: Expand FP guidelines in .docs/CODE_STANDARDS.md
    status: pending
---

# Functional Programming Refactor

## Overview

Introduce custom lightweight FP utilities and refactor the codebase to embrace functional programming principles: pure functions, immutability, function composition, and algebraic data types for error handling.

## 1. Create Custom FP Utilities Library

Create a new file [`src/lib/fp.ts`](src/lib/fp.ts) with:

### Function Composition

- **`pipe`** - Left-to-right function composition for synchronous operations
- **`pipeAsync`** - Left-to-right composition for async operations  
- **`flow`** - Create reusable composed functions
```typescript
// Example usage
const result = pipe(
  input,
  validateInput,
  transformData,
  formatOutput
);
```


### Result Type (Either pattern)

Replace try/catch with explicit success/failure types:

```typescript
type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

// Constructors
const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

// Combinators
const map = <T, U, E>(result: Result<T, E>, fn: (t: T) => U): Result<U, E>;
const flatMap = <T, U, E>(result: Result<T, E>, fn: (t: T) => Result<U, E>): Result<U, E>;
const match = <T, E, U>(result: Result<T, E>, handlers: { ok: (t: T) => U; err: (e: E) => U }): U;
```

### Option Type (Maybe pattern)

Handle nullable values explicitly:

```typescript
type Option<T> = { some: true; value: T } | { some: false };

// Constructors
const some = <T>(value: T): Option<T>;
const none: Option<never>;
const fromNullable = <T>(value: T | null | undefined): Option<T>;

// Combinators
const map = <T, U>(opt: Option<T>, fn: (t: T) => U): Option<U>;
const getOrElse = <T>(opt: Option<T>, defaultValue: T): T;
```

## 2. Refactor Utility Functions

### [`src/lib/utils.ts`](src/lib/utils.ts)

- Convert `retryOperation` to use recursion instead of for-loop with mutation
- Return `Result<T, Error>` instead of throwing
```typescript
// Before: imperative with mutation
for (let attempt = 0; attempt < maxRetries; attempt++) { ... }

// After: recursive and pure
const retryWithBackoff = <T>(
  operation: () => Promise<T>,
  config: { maxRetries: number; baseDelay: number; attempt?: number }
): Promise<Result<T, Error>> => {
  const { maxRetries, baseDelay, attempt = 0 } = config;
  // Recursive implementation
};
```


### [`src/utils.ts`](src/utils.ts)

- Convert `waitFor` from while-loop to recursive implementation
- Return `Result<void, Error>` instead of throwing

## 3. Refactor Database Layer

### [`src/lib/db.ts`](src/lib/db.ts)

- All functions return `Result` types instead of throwing
- Wrap `waitForElectronAPI` in Result pattern
```typescript
// Before
export async function getHistory(options): Promise<HistoryItem[]>

// After
export async function getHistory(options): Promise<Result<HistoryItem[], DbError>>
```


### Create [`src/lib/errors.ts`](src/lib/errors.ts)

Define domain-specific error types:

```typescript
type DbError = { type: 'DB_NOT_READY' } | { type: 'QUERY_FAILED'; message: string };
type ClipboardError = { type: 'READ_FAILED' } | { type: 'WRITE_FAILED' };
```

## 4. Refactor React Hooks

### [`src/hooks/useHistoryActions.ts`](src/hooks/useHistoryActions.ts)

- Use `Result` types for action outcomes
- Extract pure transformations from side effects

### [`src/hooks/queries/useClipboardMonitor.ts`](src/hooks/queries/useClipboardMonitor.ts)

- Extract clipboard change detection into a pure function
- Separate pure logic from effectful polling
```typescript
// Pure function for change detection
const detectClipboardChange = (
  current: string,
  previous: string
): Option<string> =>
  current && current !== previous ? some(current) : none;
```


### [`src/hooks/useHistorySearch.ts`](src/hooks/useHistorySearch.ts)

- Use `pipe` for data transformation chains

## 5. Refactor Electron Main Process

### [`electron/main.ts`](electron/main.ts)

Key improvements:

- Encapsulate mutable state in closures rather than global `let` variables
- Extract IPC handlers into pure function factories
- Use `Result` for database operations
```typescript
// Before: global mutable state
let db: Database.Database | null = null;

// After: encapsulated in module pattern
const createDbModule = () => {
  let db: Database.Database | null = null;
  
  const init = (path: string): Result<void, DbError> => { ... };
  const query = <T>(sql: string, params: unknown[]): Result<T, DbError> => { ... };
  
  return { init, query };
};
```

- Extract `normalizeWhitespace` and duplicate detection into pure functions
- Create composable IPC handler factories

## 6. Update Mutation Handlers

### [`src/hooks/queries/useHistoryMutations.ts`](src/hooks/queries/useHistoryMutations.ts)

- Extract optimistic update transformations into pure functions
- Make cache transformations composable via `pipe`
```typescript
// Extract as pure function
const removeItemFromPages = (itemId: number) => 
  (data: InfiniteHistoryData): InfiniteHistoryData => ({
    ...data,
    pages: data.pages.map(page => ({
      ...page,
      items: page.items.filter(item => item.id !== itemId)
    }))
  });

// Usage in mutation
queryClient.setQueriesData<InfiniteHistoryData>(
  { queryKey: historyKeys.all },
  (old) => old ? removeItemFromPages(itemId)(old) : old
);
```


## 7. Update Documentation

### [`docs/CODE_STANDARDS.md`](.docs/CODE_STANDARDS.md)

Expand Section 9 (Programming Paradigm) with:

- Specific examples of using `Result` and `Option` types
- When to use `pipe` vs direct function calls
- Guidelines for handling async operations functionally
- Examples of extracting pure functions from hooks

## Files to Create/Modify

| File                                       | Action                                    |

| ------------------------------------------ | ----------------------------------------- |

| `src/lib/fp.ts`                            | Create - FP utilities                     |

| `src/lib/errors.ts`                        | Create - Domain error types               |

| `src/lib/utils.ts`                         | Modify - Use recursion, return Results    |

| `src/utils.ts`                             | Modify - Recursive waitFor                |

| `src/lib/db.ts`                            | Modify - Return Result types              |

| `src/hooks/useHistoryActions.ts`           | Modify - Use Result types                 |

| `src/hooks/queries/useHistoryMutations.ts` | Modify - Extract pure transformers        |

| `src/hooks/queries/useClipboardMonitor.ts` | Modify - Extract pure functions           |

| `src/hooks/useHistorySearch.ts`            | Modify - Use pipe for transforms          |

| `electron/main.ts`                         | Modify - Encapsulate state, pure handlers |

| `.docs/CODE_STANDARDS.md`                  | Modify - Expand FP guidelines             |

## Implementation Order

1. Create FP utilities (`fp.ts`, `errors.ts`) - foundation
2. Refactor utility functions (`utils.ts`, `src/utils.ts`) - low risk
3. Update database layer (`db.ts`) - requires updating consumers
4. Update hooks that consume db - cascade changes
5. Refactor electron main process - isolated from React
6. Update documentation - capture patterns

## Testing Strategy

- Each refactored function should maintain the same external behavior
- Run `pnpm types:check` and `pnpm lint` after each major change
- Test clipboard operations manually after mutations refactor