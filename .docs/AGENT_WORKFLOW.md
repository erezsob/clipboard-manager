# AI Agent Workflow Guide

This document outlines the recommended workflow for working with AI agents (like Cursor IDE's AI assistant) on this project using the modular documentation structure.

## Overview

The project uses a modular documentation structure in `.docs/` to optimize AI agent context loading and reduce token usage. This guide explains how to effectively interact with AI agents to ensure they have all necessary context.

---

## Quick Reference: Start New Work

**Copy-paste this template:**

```
I want to work on [capability name — e.g. snippets, E2E testing, release workflow].

Please:
1. Review @.docs/CURRENT_STATE.md (At a Glance + What's Next)
2. Check @.docs/FEATURES.md for requirements
3. Review the relevant plan in @.docs/plans/ if one exists
4. Review @.docs/CODE_STANDARDS.md for quality requirements
5. Check @.docs/ARCHITECTURE.md for system patterns
6. Review relevant existing code files

Then create a plan for implementing [specific task].
```

**Even quicker:**

```
@.docs/CURRENT_STATE.md @.docs/FEATURES.md — I want to work on the next item in What's Next
```

**Key reminders:**

- Always reference specific docs (don't assume agent has context)
- Priority order: `CURRENT_STATE` → `FEATURES` → `CODE_STANDARDS` → `ARCHITECTURE`
- Reference existing code patterns: "Follow the pattern in `src/hooks/queries/useHistoryQuery.ts`"
- At the end: "Please update `.docs/CURRENT_STATE.md` to reflect the change"

---

## Quick Start

### Step 1: Identify What to Work On

Check `.docs/CURRENT_STATE.md`:

- **At a Glance** — scan capability status in one table
- **What's Next** — ordered backlog of remaining work
- **In Progress** — anything already started

Current backlog (as of last update): E2E testing → release workflow → snippets.

### Step 2: Initiate Work with the AI Agent

#### Option A: Reference specific documentation

```
I want to work on E2E testing with Playwright.
Please review @.docs/CURRENT_STATE.md and @.docs/plans/e2e-testing-plan.md,
then check @.docs/CODE_STANDARDS.md for quality standards.
```

#### Option B: Use the documentation index

```
I want to implement snippets. Please read @.docs/README.md,
then @.docs/CURRENT_STATE.md and @.docs/plans/snippets-plan.md.
```

#### Option C: Direct file references

```
Let's work on the release workflow. I need you to:
1. Check @.docs/CURRENT_STATE.md for current CI status
2. Review @.docs/WORKFLOW.md for the development process
3. Follow @.docs/CODE_STANDARDS.md for all changes
```

### Step 3: Ensure Context is Loaded

The agent should reference these files in priority order:

1. **`.docs/CURRENT_STATE.md`** — what exists, what's next
2. **`.docs/FEATURES.md`** — feature specifications
3. **`.docs/plans/*.md`** — implementation task breakdown (when applicable)
4. **`.docs/CODE_STANDARDS.md`** — quality requirements
5. **`.docs/ARCHITECTURE.md`** — system patterns
6. **Relevant source files** — actual implementation

## Example Conversation Flow

### Starting work

```
You: I want to work on snippets. Please review @.docs/CURRENT_STATE.md
     and @.docs/plans/snippets-plan.md for requirements.

Agent: [Reads the docs, understands requirements]

You: Let's start with the database layer. Check @.docs/DATABASE.md
     and follow migration patterns in electron/migrations/.
```

### During implementation

```
You: Please verify this follows @.docs/CODE_STANDARDS.md,
     especially the documentation requirements.

Agent: [Checks standards, adds JSDoc comments]
```

### Completing work

```
You: Great work! Please update @.docs/CURRENT_STATE.md:
     - Update the At a Glance table row for [capability]
     - Remove or update What's Next if done
     - Update the "Last Updated" date
```

## Best Practices

### Do

1. **Reference specific docs** — use `@.docs/CURRENT_STATE.md` instead of assuming context
2. **Be specific** — "Implement the snippets database migration per snippets-plan.md"
3. **Reference existing patterns** — "Follow the pattern in `src/hooks/queries/useHistoryMutations.ts`"
4. **Request doc updates** — "After completing this, update `.docs/CURRENT_STATE.md`"
5. **Check standards** — remind the agent to verify against `@.docs/CODE_STANDARDS.md`

### Don't

1. **Assume context** — always reference specific files
2. **Skip the capability name** — say what you're working on
3. **Forget standards** — remind checking `@.docs/CODE_STANDARDS.md`
4. **Skip documentation updates** — keep `.docs/CURRENT_STATE.md` current

## Template for Starting New Work

```
I want to work on [capability name].

Please:
1. Review @.docs/CURRENT_STATE.md (At a Glance + What's Next)
2. Check @.docs/FEATURES.md for [capability] requirements
3. Review @.docs/plans/[plan].md if applicable
4. Review @.docs/CODE_STANDARDS.md for quality requirements
5. Check @.docs/ARCHITECTURE.md for system patterns
6. Review relevant existing code files

Then create a plan for implementing [specific task].
```

## Cursor IDE Quick Reference

### File references

- `@.docs/` — entire docs directory
- `@.docs/CURRENT_STATE.md` — implementation status snapshot
- `@.docs/FEATURES.md` — feature specifications
- `@.docs/plans/` — implementation plans for in-flight work
- `@.docs/CODE_STANDARDS.md` — quality requirements
- `@.docs/ARCHITECTURE.md` — system design
- `@.docs/DATABASE.md` — database schema and migrations
- `@.docs/WORKFLOW.md` — development process
- `@.cursorrules` — Cursor-specific rules

### Common commands

**Starting a new feature:**

```
@.docs/CURRENT_STATE.md @.docs/FEATURES.md — I want to implement [feature name]
```

**Checking code quality:**

```
@.docs/CODE_STANDARDS.md — Please verify this code follows all standards
```

**Updating documentation:**

```
After completing [task], please update @.docs/CURRENT_STATE.md
```

## Workflow Checklist

When starting work on a feature:

- [ ] Check **At a Glance** and **What's Next** in `.docs/CURRENT_STATE.md`
- [ ] Reference `.docs/FEATURES.md` for requirements
- [ ] Check `.docs/plans/` for an implementation plan
- [ ] Review `.docs/CODE_STANDARDS.md`
- [ ] Check `.docs/ARCHITECTURE.md` for integration points
- [ ] Review existing code patterns in similar files
- [ ] Request an implementation plan from the agent
- [ ] Update `.docs/CURRENT_STATE.md` when work is complete

## Capability-Specific Workflows

### Adding a new feature (e.g. snippets)

```
1. Check @.docs/CURRENT_STATE.md — confirm not already done
2. Review @.docs/FEATURES.md for specifications
3. Follow @.docs/plans/snippets-plan.md for task breakdown
4. Check @.docs/DATABASE.md if schema changes are needed
5. Follow @.docs/CODE_STANDARDS.md for all code
6. Update @.docs/CURRENT_STATE.md when complete
```

### Testing (unit or E2E)

```
1. Check @.docs/CURRENT_STATE.md for current test status
2. Review @.docs/TESTING.md for patterns and scripts
3. For E2E: follow @.docs/plans/e2e-testing-plan.md
4. Update @.docs/CURRENT_STATE.md when complete
```

### Tooling (CI, release, hooks)

```
1. Check @.docs/CURRENT_STATE.md for what's already in place
2. Review @.docs/WORKFLOW.md for process details
3. Update @.docs/CURRENT_STATE.md when complete
```

## Troubleshooting

### Agent doesn't have context

```
Please read @.docs/README.md first, then @.docs/CURRENT_STATE.md for current status.
```

### Agent not following standards

```
Please review @.docs/CODE_STANDARDS.md and ensure all code follows the core standards.
```

## Documentation Maintenance

### When to update

1. **After completing a capability** — update `.docs/CURRENT_STATE.md` (table + What's Next)
2. **When specs change** — update `.docs/FEATURES.md`
3. **When architecture changes** — update `.docs/ARCHITECTURE.md`
4. **When database changes** — update `.docs/DATABASE.md`
5. **When a plan is finished** — move plan to `.docs/plans/archive/`, link from CURRENT_STATE

### How to request updates

```
Please update @.docs/CURRENT_STATE.md to:
- Set [capability] to ✅ in At a Glance
- Remove it from What's Next
- Update the "Last Updated" date
```

## Summary

1. **Always reference specific documentation files**
2. **Follow the priority order** — CURRENT_STATE → FEATURES → CODE_STANDARDS → ARCHITECTURE
3. **Use capability names**, not historical phase numbers
4. **Keep CURRENT_STATE short** — detail belongs in plan docs
5. **Verify standards** — check against `.docs/CODE_STANDARDS.md`
