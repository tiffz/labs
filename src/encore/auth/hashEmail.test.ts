import { describe, expect, it } from 'vitest';
import { isEmailHashAllowed, normalizeEmailForHash, parseAllowedEmailHashesFromEnv, sha256HexOfEmail } from './hashEmail';

describe('normalizeEmailForHash', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmailForHash('  Test@Example.COM ')).toBe('test@example.com');
  });
});

describe('sha256HexOfEmail', () => {
  it('matches known vector for test@example.com', async () => {
    const hex = await sha256HexOfEmail('test@example.com');
    expect(hex).toHaveLength(64);
    expect(hex).toMatch(/^[0-9a-f]+$/);
    const again = await sha256HexOfEmail('  TEST@EXAMPLE.COM  ');
    expect(again).toBe(hex);
  });
});

describe('parseAllowedEmailHashesFromEnv', () => {
  it('parses comma list', () => {
    const set = parseAllowedEmailHashesFromEnv('aa, BB ,cc');
    expect(set.size).toBe(3);
    expect(isEmailHashAllowed('aa', set)).toBe(true);
    expect(isEmailHashAllowed('bb', set)).toBe(true);
  });

  it('empty when unset', () => {
    expect(parseAllowedEmailHashesFromEnv(undefined).size).toBe(0);
  });
});
