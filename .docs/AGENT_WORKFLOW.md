# AI Agent Workflow Guide

This document outlines the recommended workflow for working with AI agents (like Cursor IDE's AI assistant) on this project using the modular documentation structure.

## Overview

The project uses a modular documentation structure in `.docs/` to optimize AI agent context loading and reduce token usage. This guide explains how to effectively interact with AI agents to ensure they have all necessary context.

---

## 🚀 Quick Reference: Continue to Next Phase

**Copy-paste this template to continue development:**

```
I want to work on [Phase X: Name]. 

Please:
1. Review @.docs/CURRENT_STATE.md to understand current status
2. Check @.docs/FEATURES.md for [Phase X] requirements
3. Review @.docs/CODE_STANDARDS.md for quality requirements
4. Check @.docs/ARCHITECTURE.md for system patterns
5. Review relevant existing code files

Then create a plan for implementing [specific task from phase].
```

**Even quicker:**
```
@.docs/CURRENT_STATE.md @.docs/FEATURES.md - Continue with the next phase of development
```

**Key reminders:**
- Always reference specific docs (don't assume agent has context)
- Priority order: `CURRENT_STATE` → `FEATURES` → `CODE_STANDARDS` → `ARCHITECTURE`
- Reference existing code patterns: "Follow the pattern in `src/hooks/useClipboard.ts`"
- At the end: "Please update `.docs/CURRENT_STATE.md` to mark this complete"

---

## Quick Start: Starting a New Phase

### Step 1: Identify the Next Phase

Check `.docs/CURRENT_STATE.md` to see what phases are completed and what's next:
- Phase 4: Polish & Settings (partial)
- Phase 4.5: Code Refactoring & Component Extraction (recommended next)
- Phase 5: TanStack Query Integration
- Phase 7: Automated Testing Suite (High Priority)

### Step 2: Initiate Work with the AI Agent

Use one of these approaches to ensure the agent has proper context:

#### Option A: Reference Specific Documentation Files
```
I want to work on Phase 4.5: Code Refactoring & Component Extraction. 
Please review @.docs/CURRENT_STATE.md and @.docs/FEATURES.md to understand 
the requirements, then check @.docs/CODE_STANDARDS.md for quality standards.
Let's start by extracting the useWindowVisibility hook from App.tsx.
```

#### Option B: Use the Documentation Index
```
I want to start Phase 4.5. Please read @.docs/README.md to understand 
the documentation structure, then review the relevant sections for 
code refactoring requirements.
```

#### Option C: Direct File References
```
Let's work on Phase 4.5. I need you to:
1. Check @.docs/CURRENT_STATE.md for what's already done
2. Review @.docs/FEATURES.md section on Code Refactoring
3. Follow @.docs/CODE_STANDARDS.md for all changes
4. Reference @.docs/ARCHITECTURE.md for system patterns
```

### Step 3: Ensure Context is Loaded

The agent should reference these files in priority order:

1. **`.docs/CURRENT_STATE.md`** - Understand what already exists
2. **`.docs/FEATURES.md`** - Get feature specifications and requirements
3. **`.docs/CODE_STANDARDS.md`** - Follow quality requirements
4. **`.docs/ARCHITECTURE.md`** - Understand system patterns
5. **Relevant source files** - See actual implementation (e.g., `src/App.tsx`)

## Example Conversation Flow

### Starting a Phase
```
You: I want to work on Phase 4.5: Code Refactoring. Please review 
     @.docs/CURRENT_STATE.md to see what needs to be done, then check 
     @.docs/FEATURES.md for the detailed requirements.

Agent: [Reads the docs, understands requirements]

You: Let's start by extracting the useWindowVisibility hook. Check 
     @src/App.tsx to see the current implementation and follow the 
     patterns in @src/hooks/useClipboard.ts.

Agent: [Reviews code, creates hook following patterns]

You: Good! Now let's extract the ErrorBanner component. Make sure it 
     follows @.docs/CODE_STANDARDS.md and matches the existing UI patterns.
```

### During Implementation
```
You: The hook looks good, but please verify it follows all the standards 
     in @.docs/CODE_STANDARDS.md, especially the documentation requirements.

Agent: [Checks standards, adds JSDoc comments]

You: Perfect! Now let's test it. Check @.docs/ARCHITECTURE.md to understand 
     how this integrates with the Electron window management.
```

### Completing Work
```
You: Great work! Now please update @.docs/CURRENT_STATE.md to mark 
     the useWindowVisibility hook extraction as complete, and update 
     the "Last Updated" date.
```

## Best Practices

### ✅ Do

1. **Reference Specific Docs**: Always use `@.docs/FEATURES.md` or `@.docs/CURRENT_STATE.md` instead of assuming the agent knows
2. **Be Specific**: "Extract the useWindowVisibility hook as described in Phase 4.5"
3. **Reference Existing Patterns**: "Follow the pattern in `src/hooks/useClipboard.ts`"
4. **Request Doc Updates**: "After completing this, update `.docs/CURRENT_STATE.md`"
5. **Check Standards**: Remind the agent to verify against `@.docs/CODE_STANDARDS.md`
6. **Verify Architecture**: Reference `@.docs/ARCHITECTURE.md` for system patterns

### ❌ Don't

1. **Assume Context**: Don't assume the agent has read everything - always reference specific files
2. **Skip Context**: Don't skip mentioning which phase/feature you're working on
3. **Forget Standards**: Don't forget to remind checking `@.docs/CODE_STANDARDS.md`
4. **Ignore Patterns**: Don't skip referencing existing code patterns
5. **Skip Documentation Updates**: Don't forget to update `.docs/CURRENT_STATE.md` when work is complete

## Template for Starting a New Phase

Use this template when beginning work on a new phase:

```
I want to work on [Phase X: Name]. 

Please:
1. Review @.docs/CURRENT_STATE.md to understand current status
2. Check @.docs/FEATURES.md for [Phase X] requirements
3. Review @.docs/CODE_STANDARDS.md for quality requirements
4. Check @.docs/ARCHITECTURE.md for system patterns
5. Review relevant existing code files

Then create a plan for implementing [specific task from phase].
```

## Cursor IDE Quick Reference

### File References
- `@.docs/` - References entire docs directory
- `@.docs/CURRENT_STATE.md` - Current implementation status
- `@.docs/FEATURES.md` - Feature specifications
- `@.docs/CODE_STANDARDS.md` - Quality requirements
- `@.docs/ARCHITECTURE.md` - System design
- `@.docs/DATABASE.md` - Database schema and migrations
- `@.docs/WORKFLOW.md` - Development process
- `@.cursorrules` - Cursor-specific rules

### Common Commands

**Starting a new feature:**
```
@.docs/CURRENT_STATE.md @.docs/FEATURES.md - I want to implement [feature name]
```

**Checking code quality:**
```
@.docs/CODE_STANDARDS.md - Please verify this code follows all standards
```

**Understanding architecture:**
```
@.docs/ARCHITECTURE.md - How does [component] fit into the system?
```

**Updating documentation:**
```
After completing [task], please update @.docs/CURRENT_STATE.md
```

## Workflow Checklist

When starting work on a new phase or feature:

- [ ] Identify the phase/feature from `.docs/CURRENT_STATE.md`
- [ ] Reference `.docs/FEATURES.md` for detailed requirements
- [ ] Review `.docs/CODE_STANDARDS.md` for quality requirements
- [ ] Check `.docs/ARCHITECTURE.md` for system patterns
- [ ] Review existing code patterns in similar files
- [ ] Request the agent create an implementation plan
- [ ] Verify implementation follows all standards
- [ ] Update `.docs/CURRENT_STATE.md` when work is complete

## Phase-Specific Workflows

### Code Refactoring (Phase 4.5)
```
1. Reference @.docs/FEATURES.md for extraction requirements
2. Review existing hooks in @src/hooks/ for patterns
3. Check @.docs/CODE_STANDARDS.md for component/hook standards
4. Extract one piece at a time
5. Test after each extraction
6. Update @.docs/CURRENT_STATE.md as you complete each item
```

### Adding New Features (Phase 5, 6)
```
1. Check @.docs/CURRENT_STATE.md for what's implemented
2. Review @.docs/FEATURES.md for feature specifications
3. Check @.docs/DATABASE.md if database changes are needed
4. Review @.docs/ARCHITECTURE.md for integration points
5. Follow @.docs/CODE_STANDARDS.md for all code
6. Update @.docs/CURRENT_STATE.md when complete
```

### Testing (Phase 7)
```
1. Review @.docs/FEATURES.md for testing requirements
2. Check @.docs/WORKFLOW.md for testing workflow
3. Reference @.docs/ARCHITECTURE.md for system understanding
4. Follow @.docs/CODE_STANDARDS.md for test code quality
5. Update @.docs/CURRENT_STATE.md as tests are added
```

## Troubleshooting

### Agent Doesn't Have Context
**Problem**: Agent seems unaware of project structure or requirements

**Solution**: Explicitly reference documentation files:
```
Please read @.docs/README.md first to understand the documentation structure, 
then review @.docs/CURRENT_STATE.md for current status.
```

### Agent Not Following Standards
**Problem**: Code doesn't meet quality requirements

**Solution**: Explicitly reference standards:
```
Please review @.docs/CODE_STANDARDS.md and ensure all code follows 
the 9 core standards, especially [specific standard].
```

### Agent Missing Architecture Context
**Problem**: Code doesn't fit system architecture

**Solution**: Reference architecture documentation:
```
Before implementing, please review @.docs/ARCHITECTURE.md to understand 
how [component] should integrate with the existing system.
```

## Documentation Maintenance

### When to Update Documentation

1. **After completing a phase item**: Update `.docs/CURRENT_STATE.md`
2. **When adding new features**: Update `.docs/FEATURES.md` if specs change
3. **When architecture changes**: Update `.docs/ARCHITECTURE.md`
4. **When standards evolve**: Update `.docs/CODE_STANDARDS.md`
5. **When database changes**: Update `.docs/DATABASE.md`

### How to Request Documentation Updates

```
Please update @.docs/CURRENT_STATE.md to:
- Mark [item] as completed in Phase [X]
- Update the "Last Updated" date to [today's date]
- Add any new known issues if discovered
```

## Summary

The key to effective AI agent interaction is:

1. **Always reference specific documentation files** - Don't assume context
2. **Follow the priority order** - CURRENT_STATE → FEATURES → CODE_STANDARDS → ARCHITECTURE
3. **Reference existing patterns** - Show the agent similar code
4. **Update documentation** - Keep `.docs/CURRENT_STATE.md` current
5. **Verify standards** - Always check against `.docs/CODE_STANDARDS.md`

By following this workflow, you ensure the AI agent has all necessary context and produces code that meets your project's standards and architecture.

