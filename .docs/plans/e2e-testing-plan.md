---
name: E2E Testing with Playwright
overview: Set up Playwright for E2E testing of the Electron clipboard manager application, covering core user flows like search, copy, delete, favorites, and pagination.
todos:
  - id: install-playwright
    content: Install @playwright/test as dev dependency
    status: pending
  - id: create-config
    content: Create playwright.config.ts with Electron-specific settings
    status: pending
  - id: create-fixture
    content: Create e2e/fixtures/electron.ts with app launch fixture
    status: pending
  - id: write-clipboard-tests
    content: Write e2e/clipboard.spec.ts for search, copy, delete, favorites
    status: pending
  - id: write-navigation-tests
    content: Write e2e/navigation.spec.ts for keyboard navigation and window toggle
    status: pending
  - id: add-npm-scripts
    content: Add test:e2e and test:e2e:ui scripts to package.json
    status: pending
  - id: update-docs
    content: Update TESTING.md and CURRENT_STATE.md
    status: pending
---

# E2E Testing with Playwright

## Overview

Set up Playwright to test the Electron app end-to-end, simulating real user interactions. Playwright has built-in Electron support via `@playwright/test` with the `_electron` fixture.

## Implementation Steps

### 1. Install Dependencies

```bash
pnpm add -D @playwright/test
```

### 2. Create Playwright Configuration

Create `playwright.config.ts` at project root:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 0,
  use: {
    trace: 'on-first-retry',
  },
});
```

### 3. Create E2E Test Directory Structure

```
e2e/
├── fixtures/
│   └── electron.ts       # Electron app fixture
├── clipboard.spec.ts     # Core clipboard flow tests
└── navigation.spec.ts    # Window/keyboard navigation tests
```

### 4. Create Electron Fixture

Create `e2e/fixtures/electron.ts` to launch the Electron app:

```typescript
import { test as base, _electron as electron } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';

export const test = base.extend<{
  electronApp: ElectronApplication;
  window: Page;
}>({
  electronApp: async ({}, use) => {
    const app = await electron.launch({
      args: ['electron-dist/main.js'],
      env: { ...process.env, NODE_ENV: 'test' },
    });
    await use(app);
    await app.close();
  },
  window: async ({ electronApp }, use) => {
    const window = await electronApp.firstWindow();
    await use(window);
  },
});
```

### 5. Core User Flow Tests

#### Test: Search and filter history (`e2e/clipboard.spec.ts`)

- Type in search bar
- Verify filtered results
- Clear search and verify all items return

#### Test: Copy item to clipboard

- Click on history item
- Verify clipboard contains item content

#### Test: Delete item

- Hover over item, click delete icon
- Verify item removed from list

#### Test: Toggle favorite

- Click star icon on item
- Toggle favorites filter
- Verify only favorites shown

#### Test: Load more items

- Scroll to bottom
- Click "Load More"
- Verify more items loaded

#### Test: Clear all history

- Open settings menu
- Click "Clear All"
- Confirm dialog
- Verify list is empty

### 6. Add npm Scripts

Update `package.json`:

```json
{
  "scripts": {
    "test:e2e": "pnpm electron:compile && playwright test",
    "test:e2e:ui": "pnpm electron:compile && playwright test --ui"
  }
}
```

### 7. Update Documentation

- Add E2E section to `.docs/TESTING.md`
- Mark Phase 7 E2E items as complete in `.docs/CURRENT_STATE.md`

## Considerations

### Test Isolation

Each test should start with a clean database state. Options:
- Use a separate test database file
- Clear the database in `beforeEach`
- Use database transactions that rollback after each test

### CI Integration

E2E tests run slower than unit tests. Consider:
- Running E2E tests separately in CI pipeline
- Only running on main branch or release PRs
- Using parallelization for faster execution

### Electron Compilation

Tests require compiled Electron code (`electron-dist/`). The `test:e2e` script handles this by running `electron:compile` first.

## Files to Create/Modify

| File                       | Action                            |
| -------------------------- | --------------------------------- |
| `playwright.config.ts`     | Create - Playwright configuration |
| `e2e/fixtures/electron.ts` | Create - Electron app fixture     |
| `e2e/clipboard.spec.ts`    | Create - Clipboard flow tests     |
| `e2e/navigation.spec.ts`   | Create - Navigation tests         |
| `package.json`             | Modify - Add E2E test scripts     |
| `.docs/TESTING.md`         | Modify - Add E2E documentation    |
| `.docs/CURRENT_STATE.md`   | Modify - Update Phase 7 status    |
