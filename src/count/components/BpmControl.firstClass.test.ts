import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guard: Count's tempo surface is a first-class CUJ, not the portable BpmInput
 * toolbar excerpt. See README § Intentional diversions and
 * SHARED_UI_CONVENTIONS § First-class vs portable.
 */
describe('BpmControl first-class tempo surface', () => {
  const source = readFileSync(path.join(__dirname, 'BpmControl.tsx'), 'utf8');

  it('does not import shared BpmInput', () => {
    expect(source).not.toMatch(/from ['"].*BpmInput['"]/);
  });

  it('keeps always-visible common BPM presets and nudge actions', () => {
    expect(source).toMatch(/COMMON_BPMS/);
    expect(source).toMatch(/pulse-bpm-presets/);
    expect(source).toMatch(/÷2/);
    expect(source).toMatch(/×2/);
  });
});
