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

## 9. Best Practices
- Refrain from using React's useEffect as much as possible
- Prefer handle effects on user interaction rather than relying on local state
- Prioritize semantic HTML and Accessible UI
- When function has more than 2 arguments, prefer passing an object rather than adding more arguments

## Code Review Checklist

- [ ] All constants extracted
- [ ] No code duplication
- [ ] Proper error handling
- [ ] TypeScript types complete
- [ ] JSDoc documentation added
- [ ] Performance considerations addressed
- [ ] Code is maintainable and readable
- [ ] Follows existing patterns and conventions
- [ ] Follow best practices

