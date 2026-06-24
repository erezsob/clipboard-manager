# Current Implementation Status

**Last Updated**: 2026-06-24

## At a Glance

| Capability | Status | Detail |
|------------|--------|--------|
| Clipboard history (text + RTF) | ✅ | Transparent capture and restore |
| Search, keyboard nav, jump-to-top | ✅ | |
| Pagination (load more) | ✅ | 100-item batches |
| Favorites | ✅ | Star toggle + filter |
| Item delete / clear all | ✅ | Clear all with confirmation |
| Near-duplicate detection | ✅ | Whitespace normalization |
| Error handling + retry | ✅ | Exponential backoff |
| System tray + global shortcut | ✅ | `Cmd+Shift+V` |
| Settings menu | ✅ | Launch at login, Clear All, Quit |
| Launch at login | ✅ | Default ON, deferred Accessibility prompt |
| Dark mode UI | ✅ | |
| Component/hook architecture | ✅ | `src/components/`, `src/hooks/` |
| TanStack Query | ✅ | Infinite query, mutations, optimistic updates |
| FP refactor (Result types) | ✅ | `src/lib/fp.ts`, `src/lib/errors.ts` |
| Unit/component tests | ✅ | Vitest — see [TESTING.md](./TESTING.md) |
| Pre-push git hook | ✅ | See [WORKFLOW.md](./WORKFLOW.md) |
| CI pipeline | ✅ | `.github/workflows/ci.yml` |
| Snippets | 🔨 | [snippets-plan.md](./plans/snippets-plan.md) |
| E2E tests (Playwright) | 🔨 | [e2e-testing-plan.md](./plans/e2e-testing-plan.md) |
| Release workflow | 🔨 | `release.yml`, artifacts |

**Legend**: ✅ done · 🟡 partial · 🔨 not started

## What's Next

Ordered backlog — pick from here:

1. **E2E testing** — Playwright setup + core user flows
2. **Release workflow** — GitHub Actions build, macOS artifacts, optional badges
3. **Snippets** — persisted user-created text (see plan doc)

## In Progress

_None._

## Implemented (by area)

### Clipboard & storage

- Text + RTF capture and restore (`electron/main.ts`, migration `003_add_rtf.sql`)
- SQLite `history` table with favorites column
- Near-duplicate detection in main process
- Preferences in `preferences.json` (launch at login)

### UI & interaction

- Frameless dark window, starts hidden
- Search bar with favorites filter
- History list with star, copy, delete actions
- Load more pagination, jump-to-top button
- Settings dropdown (`SettingsMenu`) — launch at login, clear all, quit
- System tray icon and menu

### Data layer & architecture

- TanStack Query: `useHistoryQuery`, `useHistoryMutations`, `useClipboardMonitor`
- Query key factory: `src/lib/queryKeys.ts`
- Components: `history/`, `common/` under `src/components/`
- Hooks: `useWindowVisibility`, `useHistorySearch`, `useKeyboardNavigation`, `useHistoryActions`
- FP utilities and domain errors: `src/lib/fp.ts`, `src/lib/errors.ts`

### Tooling & quality

- Vitest unit/component tests — run `pnpm test`
- Pre-push hook: lint, format, types, knip
- CI: lint, format, types, knip, tests on PRs and pushes to main

### Completed plans (archived)

- [FP refactor](./plans/archive/fp-refactor-plan.md)
- [RTF clipboard support](./plans/archive/rtf_clipboard_support.md)
- [Launch at login](./plans/archive/launch-at-login-plan.md)

## Known Issues

_None currently documented. Update this section as issues are discovered._
