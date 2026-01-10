# Code Quality Standards

**All code must meet these standards before being considered complete:**

## 1. Constants & Configuration
- Extract all magic numbers and strings to constants files
- Use named constants instead of hardcoded values
- Group related constants logically

## 2. Code Organization
- Extract reusable logic into custom hooks
- Separate utility functions from component logic
- Maintain single responsibility principle
- Keep components focused and under 300 lines when possible
- Prefer named exports over default exports (enables better refactoring and tree-shaking)
- Use inline exports at declaration site (e.g., `export function foo()` not `function foo()` + `export { foo }`)

## 3. Error Handling
- Consistent error handling patterns across the codebase
- User-friendly error messages
- Proper error logging for debugging
- Graceful degradation where appropriate

## 4. Type Safety
- Full TypeScript coverage with proper types
- No `any` types without justification
- Proper interface definitions for data structures
- Type-safe function signatures

## 5. Documentation
- JSDoc comments for all public functions and hooks
- Clear parameter and return type documentation
- Inline JSDoc comments for interface/type properties (not in function JSDoc)
- Inline comments for complex logic
- README updates for significant changes

## 6. Performance
- Memoization where appropriate (useCallback, useMemo)
- Avoid unnecessary re-renders
- Efficient data structures and algorithms
- Lazy loading for large datasets

## 7. Maintainability
- DRY (Don't Repeat Yourself) principle
- Clear naming conventions
- Logical file structure
- Easy to test and modify

## 8. Testing Readiness
- Code structured for easy unit testing
- Pure functions where possible
- Minimal side effects
- Clear separation of concerns

## 9. Programming Paradigm
- **Favor functional programming over procedural or object-oriented** (FP > Procedural > OO)
- **Prefer declarative over imperative code**
- Use pure functions without side effects where possible
- Favor immutability—avoid mutating data, create new copies instead
- Use higher-order functions (`map`, `filter`, `reduce`) over loops
- Prefer function composition over inheritance
- Keep functions small and focused on a single transformation
- **Prefer recursion over imperative loops** for iterative operations

### FP Utilities (`src/lib/fp.ts`)

The codebase includes custom FP utilities for explicit error handling and function composition.

#### Result Type - Explicit Error Handling

Use `Result<T, E>` for operations that can fail instead of try/catch:

```typescript
import { type Result, ok, err, tryCatchAsync } from "../lib/fp";
import { type DbError, queryFailed } from "../lib/errors";

// Return Result instead of throwing
async function getUser(id: number): Promise<Result<User, DbError>> {
  return tryCatchAsync(
    () => db.query("SELECT * FROM users WHERE id = ?", [id]),
    (error) => queryFailed("Failed to get user", error)
  );
}

// Handle Result explicitly
const result = await getUser(1);
if (result.ok) {
  console.log(result.value.name);
} else {
  console.error(result.error.message);
}
```

#### Option Type - Nullable Value Handling

Use `Option<T>` for values that may or may not exist:

```typescript
import { type Option, some, none, fromNullable, matchOption } from "../lib/fp";

// Detect clipboard change - returns Option
const detectClipboardChange = (
  current: string,
  previous: string
): Option<string> =>
  current && current !== previous ? some(current) : none;

// Handle Option explicitly
const change = detectClipboardChange(newText, lastText);
if (change.some) {
  await saveToHistory(change.value);
}
```

#### Function Composition with `pipe`

Use `pipe` for composing data transformations:

```typescript
import { pipe } from "../lib/fp";

// Transform data through a pipeline
const result = pipe(
  rawInput,
  (s) => s.trim(),
  (s) => s.toLowerCase(),
  (s) => s.replace(/\s+/g, "-")
);
```

#### Domain-Specific Errors (`src/lib/errors.ts`)

Define typed errors for better error handling:

```typescript
import { type DbError, dbNotReady, queryFailed } from "../lib/errors";

// Create specific error types
const error: DbError = queryFailed("User not found", originalError);

// Type-safe error handling
if (error.type === "QUERY_FAILED") {
  logError(error.cause);
}
```

#### Extracting Pure Functions

Extract pure transformation functions from hooks for better testability:

```typescript
// ❌ Inline logic in hook
queryClient.setQueriesData(
  { queryKey: historyKeys.all },
  (old) => ({
    ...old,
    pages: old.pages.map((page) => ({
      ...page,
      items: page.items.filter((item) => item.id !== itemId),
    })),
  })
);

// ✅ Extract as pure function
export const removeItemFromPages =
  (itemId: number) =>
  (data: InfiniteHistoryData): InfiniteHistoryData => ({
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.filter((item) => item.id !== itemId),
    })),
  });

// Use in hook
queryClient.setQueriesData(
  { queryKey: historyKeys.all },
  applyTransform(removeItemFromPages(itemId))
);
```

#### When to Use FP Patterns

| Pattern        | Use When                                |
| -------------- | --------------------------------------- |
| `Result<T, E>` | Operation can fail (DB, API, file I/O)  |
| `Option<T>`    | Value may or may not exist              |
| `pipe`         | Chaining 3+ transformations             |
| Pure functions | Logic can be tested in isolation        |
| Recursion      | Iterative operations with backoff/retry |

#### Backward Compatibility

Legacy functions (`retryOperation`, `waitFor`) are kept with `@deprecated` tags. New code should use the Result-returning versions (`retryWithBackoff`, `waitForCondition`).

## 10. Best Practices
- Refrain from using React's useEffect as much as possible
- Prefer handle effects on user interaction rather than relying on local state
- Prioritize semantic HTML and Accessible UI
- When function has more than 2 arguments, prefer passing an object rather than adding more arguments
- Avoid direct DOM manipulation (e.g., `document.getElementById`, `document.querySelector`)
  - Use React refs (`useRef`) instead for DOM access
  - Keep hooks pure by emitting callbacks rather than manipulating DOM directly

## 11. Testing Standards

> "The more your tests resemble the way your software is used, the more confidence they can give you." — Kent C. Dodds

See also: [`.docs/TESTING.md`](./TESTING.md) for testing patterns and examples.

### Core Philosophy: Write tests. Not too many. Mostly integration.

- **Write tests for confidence**, not for coverage metrics
- **Integration tests provide the best ROI** — balance between confidence and speed/cost
- **Don't chase 100% coverage** — diminishing returns beyond ~70-80%
- **Test use cases, not code** — think about what the code does, not how it does it

### The Testing Trophy (Priority Order)

1. **Static Analysis** — TypeScript, ESLint, Biome (catches bugs at compile time)
2. **Unit Tests** — Pure functions, utilities, isolated logic
3. **Integration Tests** — Components with their dependencies, hooks with mocked APIs
4. **E2E Tests** — Critical user flows (highest confidence, highest cost)

### Avoid Testing Implementation Details

Implementation details cause:
- **False negatives**: Tests break when you refactor (even though the app works)
- **False positives**: Tests pass when the app is broken

**What NOT to test directly:**
- Internal component state
- Lifecycle methods / hook internals
- Private methods or functions
- CSS class names or DOM structure

**What TO test:**
- User interactions (clicks, typing, navigation)
- Rendered output visible to users
- Props passed by developers
- Observable side effects (API calls, callbacks)

### Query Priority (React Testing Library)

Use queries in this order of preference:

1. **`getByRole`** — Accessible to everyone, works with screen readers
2. **`getByLabelText`** — Best for form fields
3. **`getByPlaceholderText`** — When label isn't available
4. **`getByText`** — For non-interactive elements
5. **`getByDisplayValue`** — For filled form inputs
6. **`getByAltText`** — For images
7. **`getByTitle`** — Less reliable across browsers
8. **`getByTestId`** — **Last resort only** — users can't see these

```typescript
// ❌ Bad - testing implementation details
screen.getByTestId('submit-button')
container.querySelector('.btn-primary')

// ✅ Good - testing like a user
screen.getByRole('button', { name: /submit/i })
screen.getByLabelText('Username')
```

### Testing Library Best Practices

```typescript
// ✅ Use screen for queries
render(<Component />)
const button = screen.getByRole('button')

// ✅ Use find* for async elements (not waitFor + get*)
const alert = await screen.findByRole('alert')

// ✅ Use query* ONLY for asserting non-existence
expect(screen.queryByRole('alert')).not.toBeInTheDocument()

// ✅ Use jest-dom matchers for better error messages
expect(button).toBeDisabled()
expect(element).toBeInTheDocument()

// ✅ Use fireEvent for simple interactions
fireEvent.click(button)
fireEvent.change(input, { target: { value: 'hello' } })

// ✅ Make assertions explicit
expect(screen.getByRole('alert')).toBeInTheDocument()
```

### What to Avoid

```typescript
// ❌ Don't wrap render/fireEvent in act (they already do it)
act(() => { render(<Component />) })

// ❌ Don't pass empty callbacks to waitFor
await waitFor(() => {})

// ❌ Don't perform side-effects inside waitFor
await waitFor(() => {
  fireEvent.click(button)  // Side effect!
  expect(result).toBe(true)
})

// ❌ Don't put multiple assertions in waitFor
await waitFor(() => {
  expect(a).toBe(1)
  expect(b).toBe(2)
})

// ✅ Do this instead
fireEvent.click(button)
await waitFor(() => expect(result).toBe(true))
```

### How to Know What to Test

1. **Ask: "What would be bad if it broke?"** — Prioritize critical user flows
2. **Consider your two users**: End-users and developers
3. **Write tests for use cases**, not for code paths
4. **Use code coverage to find missing use cases**, not as a goal

### Mocking Guidelines

- **Mock at system boundaries** — External APIs, databases, file system
- **Don't mock too much** — Every mock reduces confidence in integration
- **Mock the electron API** — Use `window.electronAPI` mocks for database/clipboard

## Code Review Checklist

- [ ] All constants extracted
- [ ] No code duplication
- [ ] Proper error handling
- [ ] TypeScript types complete
- [ ] JSDoc documentation added
- [ ] Performance considerations addressed
- [ ] Code is maintainable and readable
- [ ] Follows existing patterns and conventions
- [ ] Functional and declarative approach used
- [ ] Follow best practices
- [ ] No direct DOM manipulation (use refs instead)
- [ ] Named exports used (no default exports)
- [ ] Tests cover use cases, not implementation details
- [ ] Tests use appropriate queries (prefer `*ByRole`)

