import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { shouldSuppressPracticeResourceChipNavigation } from './practiceResourceDragContext';

const REPO_ROOT = join(import.meta.dirname, '../../../..');

describe('shouldSuppressPracticeResourceChipNavigation', () => {
  it('does not suppress during an active drag (stable DOM + pointer release for dnd-kit)', () => {
    expect(shouldSuppressPracticeResourceChipNavigation(true, true)).toBe(false);
    expect(shouldSuppressPracticeResourceChipNavigation(false, true)).toBe(false);
  });

  it('suppresses briefly after drop when block flag is set', () => {
    expect(shouldSuppressPracticeResourceChipNavigation(true, false)).toBe(true);
    expect(shouldSuppressPracticeResourceChipNavigation(false, false)).toBe(false);
  });
});

describe('practiceResourceDnD guardrails', () => {
  it('PracticeResourceDnD does not intercept pointerup during drag (breaks drops)', () => {
    const src = readFileSync(
      join(REPO_ROOT, 'src/encore/components/song/PracticeResourceDnD.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/onPointerUpCapture/);
  });
});
