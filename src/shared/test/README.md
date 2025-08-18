# Test Cleanup Patterns

This directory contains utilities for consistent test cleanup across the codebase to prevent memory leaks and ensure reliable test execution.

## Quick Start

```typescript
import {
  setupTestCleanup,
  createTestTimeout,
} from '../../shared/test/testUtils';

describe('MyComponent', () => {
  // Set up automatic cleanup for timers, DOM, and mocks
  const cleanup = setupTestCleanup();
  const testTimeout = createTestTimeout(cleanup.timers);

  it('should do something with timers', async () => {
    // Instead of: await new Promise(resolve => setTimeout(resolve, 100));
    await testTimeout(100);

    // Instead of: const element = document.createElement('div'); document.body.appendChild(element);
    const element = cleanup.dom.createElement('div', { id: 'test' });

    // Instead of: const spy = vi.spyOn(console, 'log');
    const spy = cleanup.mocks.spyOn(console, 'log');

    // All cleanup happens automatically in afterEach
  });
});
```

## Why Use These Patterns?

### Memory Leaks Prevention

- **Timers**: Uncleaned `setTimeout`, `setInterval`, and `requestAnimationFrame` can accumulate and consume memory
- **DOM Elements**: Test-created DOM elements can persist between tests
- **Mocks**: Spies and global mocks need restoration to prevent test interference

### Consistent Behavior

- All tests use the same cleanup patterns
- Reduces boilerplate code
- Prevents "works on my machine" issues

## Migration Guide

### Before (Problematic)

```typescript
describe('MyTest', () => {
  beforeEach(() => {
    // Manual DOM setup
    const container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Manual cleanup - easy to forget or get wrong
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('should test something', async () => {
    // Unmanaged timer - potential memory leak
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Unmanaged mock - potential test interference
    const spy = vi.spyOn(console, 'log');

    // Manual cleanup required
    spy.mockRestore();
  });
});
```

### After (Clean)

```typescript
import {
  setupTestCleanup,
  createTestTimeout,
} from '../../shared/test/testUtils';

describe('MyTest', () => {
  const cleanup = setupTestCleanup();
  const testTimeout = createTestTimeout(cleanup.timers);

  it('should test something', async () => {
    // Managed timer - automatic cleanup
    await testTimeout(100);

    // Managed DOM - automatic cleanup
    const container = cleanup.dom.createElement('div', {
      id: 'test-container',
    });

    // Managed mock - automatic cleanup
    const spy = cleanup.mocks.spyOn(console, 'log');

    // No manual cleanup needed!
  });
});
```

## Available Utilities

### `setupTestCleanup()`

Sets up automatic `beforeEach`/`afterEach` hooks for comprehensive cleanup.

### `createTestTimeout(cleanup.timers)`

Creates a promise-based timeout that's automatically cleaned up.

### `cleanup.dom.createElement(tagName, options)`

Creates DOM elements that are automatically removed after each test.

### `cleanup.mocks.spyOn(object, method)`

Creates spies that are automatically restored after each test.

### `mockAnimationFrame(cleanup.mocks)`

Mocks `requestAnimationFrame` and `cancelAnimationFrame` for predictable test behavior.

## Files Already Migrated

✅ **Completed**:

- `src/cats/services/HeartSpawningService.test.ts`
- `src/cats/integration/pouncingHeartIntegration.test.ts`
- `src/cats/integration/HappyJump.test.tsx`
- `src/cats/components/game/Cat.test.tsx`

🔄 **Partially Migrated**:

- `src/cats/App.regression.test.tsx` (imports added, but not fully implemented)

📋 **Still Need Migration**:

- `src/cats/components/game/CatView.movement.test.tsx`
- `src/cats/integration/AppPounceEventLog.test.tsx`
- `src/cats/App.test.tsx`
- `src/cats/components/game/WandToy.test.tsx`
- And many others...

## Performance Impact

**Before Migration**: Vitest processes consuming 4-5GB memory each
**After Migration**: Significantly reduced memory usage due to proper cleanup

## Common Patterns to Look For

When migrating tests, look for these patterns that need cleanup:

```typescript
// ❌ Needs migration
setTimeout(() => {}, 100);
setInterval(() => {}, 100);
requestAnimationFrame(() => {});
new Promise((resolve) => setTimeout(resolve, 100));

// ❌ Needs migration
document.createElement('div');
document.body.appendChild(element);
document.body.innerHTML = '';

// ❌ Needs migration
vi.spyOn(object, 'method');
global.requestAnimationFrame = vi.fn();
Object.defineProperty(window, 'property', { value: 'test' });
```

## Testing the Cleanup

To verify cleanup is working:

1. Run tests with `npm test -- path/to/test.ts`
2. Check that tests pass consistently
3. Monitor memory usage - should be stable across test runs
4. Verify no "leaking" behavior between tests
