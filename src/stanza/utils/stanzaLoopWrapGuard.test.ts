import { describe, expect, it } from 'vitest';
import { createStanzaLoopWrapGuard, STANZA_LOOP_WRAP_COALESCE_MS } from './stanzaLoopWrapGuard';

describe('createStanzaLoopWrapGuard', () => {
  it('allows the first wrap and coalesces duplicates within the window', () => {
    const guard = createStanzaLoopWrapGuard(100);
    expect(guard.tryPerform(1000)).toBe(true);
    expect(guard.tryPerform(1050)).toBe(false);
    expect(guard.tryPerform(1099)).toBe(false);
    expect(guard.tryPerform(1100)).toBe(true);
  });

  it('reset clears the in-flight window', () => {
    const guard = createStanzaLoopWrapGuard(STANZA_LOOP_WRAP_COALESCE_MS);
    expect(guard.tryPerform(0)).toBe(true);
    guard.reset();
    expect(guard.tryPerform(10)).toBe(true);
  });
});
