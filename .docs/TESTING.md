# Testing Guide

This document describes the testing strategy, patterns, and practices for the clipboard manager application.

## Overview

The project uses **Vitest** as the test runner with **React Testing Library** for component testing. Tests are co-located with source files using the `.test.ts` or `.test.tsx` extension.

## Tech Stack

- **Vitest** - Fast, Vite-native test runner
- **@testing-library/react** - React component testing utilities
- **@testing-library/jest-dom** - Custom DOM matchers
- **jsdom** - DOM environment for Node.js
- **@vitest/coverage-v8** - Code coverage reporting

## Test Categories

### 1. Unit Tests

Pure function tests that run in isolation without React components.

**Location**: Co-located with source files (e.g., `utils.test.ts` next to `utils.ts`)

**Examples**:
- `src/lib/utils.test.ts` - Tests for `formatDate`, `truncateText`, `retryOperation`, `hasMoreItems`
- `src/utils.test.ts` - Tests for `waitFor`
- `src/lib/queryKeys.test.ts` - Tests for query key factory

**Key patterns**:
```typescript
import { describe, expect, it, vi } from "vitest";

describe("functionName", () => {
  it("describes expected behavior", () => {
    const result = functionName(input);
    expect(result).toBe(expectedOutput);
  });
});
```

### 2. Component Tests

Tests for React components using React Testing Library.

**Location**: Co-located with components (e.g., `HistoryItem.test.tsx`)

**Examples**:
- `src/components/history/HistoryItem.test.tsx`
- `src/components/history/HistoryList.test.tsx`
- `src/components/common/SearchBar.test.tsx`
- `src/components/common/ErrorBanner.test.tsx`
- `src/components/common/Footer.test.tsx`

**Key patterns**:
```typescript
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Component } from "./Component";

describe("Component", () => {
  it("renders content", () => {
    render(<Component prop="value" />);
    expect(screen.getByText("expected text")).toBeInTheDocument();
  });

  it("handles user interaction", () => {
    const onClick = vi.fn();
    render(<Component onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalled();
  });
});
```

### 3. Hook Integration Tests

Tests for React hooks, especially TanStack Query hooks.

**Location**: Co-located with hooks (e.g., `useHistoryQuery.test.tsx`)

**Examples**:
- `src/hooks/queries/useHistoryQuery.test.tsx`
- `src/hooks/queries/useHistoryMutations.test.tsx`

**Key patterns**:
```typescript
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createTestQueryClient } from "../../test/utils";

const createWrapper = () => {
  const queryClient = createTestQueryClient();
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

it("returns data after fetch", async () => {
  const { result } = renderHook(() => useHook(), { wrapper: createWrapper() });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
});
```

### 4. Database Layer Tests

Tests for the `db.ts` functions that interface with Electron API.

**Location**: `src/lib/db.test.ts`

**Key patterns**:
```typescript
import { getMockElectronAPI } from "../test/setup";

it("calls correct API method", async () => {
  const mockApi = getMockElectronAPI();
  mockApi.db.getHistory.mockResolvedValue([]);
  
  await getHistory({ query: "test" });
  
  expect(mockApi.db.getHistory).toHaveBeenCalledWith("test", 50, false, 0);
});
```

## Test Infrastructure

### Setup Files

- **`src/test/setup.ts`** - Global test setup, configures jest-dom and electronAPI mocks
- **`src/test/utils.tsx`** - Test utilities like `createTestQueryClient`
- **`src/test/mocks/electronAPI.ts`** - Mock factory for `window.electronAPI`

### Mocking Electron API

The `window.electronAPI` is mocked in `setup.ts` before each test:

```typescript
import { getMockElectronAPI } from "./test/setup";

// In your test
const mockApi = getMockElectronAPI();
mockApi.db.getHistory.mockResolvedValue(mockItems);
```

### Creating Mock Data

Use the mock factory functions:

```typescript
import { createMockHistoryItem, createMockHistoryItems } from "./test/mocks/electronAPI";

// Single item
const item = createMockHistoryItem({ id: 1, content: "test" });

// Multiple items
const items = createMockHistoryItems(5);
```

## Running Tests

```bash
# Run all tests once
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage

# Run tests with Vitest UI (optional)
pnpm test:ui
```

## Coverage

Code coverage is configured with 80% thresholds for:
- Lines
- Functions
- Branches
- Statements

Coverage reports are generated in multiple formats:
- `text` - Terminal output
- `json` - Machine-readable
- `html` - Visual report in `coverage/` directory

## Best Practices

### General

1. **Co-locate tests** - Place test files next to source files
2. **Descriptive names** - Use clear `describe` and `it` block names
3. **Arrange-Act-Assert** - Structure tests clearly
4. **One assertion per concept** - Keep tests focused
5. **Mock at boundaries** - Only mock external dependencies (electronAPI)

### Component Testing

1. **Query by accessibility** - Prefer `getByRole`, `getByLabelText`
2. **Use `fireEvent`** - For simple click/input events
3. **Avoid implementation details** - Test behavior, not internals
4. **Test user interactions** - Click handlers, form inputs, keyboard events

### Async Testing

1. **Use `waitFor`** - For async state updates
2. **Avoid `act` warnings** - Wrap state updates properly
3. **Handle promise rejections** - Catch errors explicitly in tests

### Fake Timers

```typescript
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-08T12:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});
```

**Note**: Avoid using fake timers with complex user interactions. Use `fireEvent` instead of `userEvent` when fake timers are active.

## Future Improvements

1. **E2E Tests** - Add Playwright for end-to-end testing
2. **Visual Regression** - Screenshot testing for UI components
3. **CI Integration** - Add tests to GitHub Actions workflow
4. **Mutation Testing** - Verify test quality with Stryker
