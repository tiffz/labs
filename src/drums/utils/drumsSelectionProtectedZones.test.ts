import { describe, expect, it } from 'vitest';
import { isDrumsSelectionProtectedTarget } from './drumsSelectionProtectedZones';

describe('isDrumsSelectionProtectedTarget', () => {
  it('allows metronome settings popover clicks', () => {
    document.body.innerHTML =
      '<div class="labs-metronome-settings-popover"><button id="target">BPM</button></div>';
    const target = document.getElementById('target');
    expect(isDrumsSelectionProtectedTarget(target)).toBe(true);
  });

  it('allows shared BPM dropdown clicks', () => {
    document.body.innerHTML =
      '<div class="shared-bpm-dropdown"><button id="target">120</button></div>';
    const target = document.getElementById('target');
    expect(isDrumsSelectionProtectedTarget(target)).toBe(true);
  });

  it('does not protect arbitrary page clicks', () => {
    document.body.innerHTML = '<main><button id="target">Elsewhere</button></main>';
    const target = document.getElementById('target');
    expect(isDrumsSelectionProtectedTarget(target)).toBe(false);
  });
});
