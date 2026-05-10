import { describe, expect, it } from 'vitest';
import { resolveLabsDriveTesterHashSets } from './labsDriveTesterGate';

describe('resolveLabsDriveTesterHashSets', () => {
  it('uses Drive-specific hashes when present', () => {
    const a = 'aa'.repeat(32);
    const b = 'bb'.repeat(32);
    const s = resolveLabsDriveTesterHashSets(`${a},${b}`, 'cc'.repeat(32));
    expect(s.size).toBe(2);
    expect(s.has(a)).toBe(true);
    expect(s.has(b)).toBe(true);
  });

  it('falls back to Encore allowlist when Drive list is empty', () => {
    const h = 'deadbeef'.repeat(8);
    const s = resolveLabsDriveTesterHashSets(undefined, h);
    expect(s.size).toBe(1);
    expect(s.has(h)).toBe(true);
  });

  it('returns empty when both are unset', () => {
    expect(resolveLabsDriveTesterHashSets(undefined, undefined).size).toBe(0);
    expect(resolveLabsDriveTesterHashSets('', '  ').size).toBe(0);
  });
});
