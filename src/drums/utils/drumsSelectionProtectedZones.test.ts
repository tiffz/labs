// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { isDrumsSelectionProtectedTarget, shouldClearDrumsSelectionOnOutsideClick } from './drumsSelectionProtectedZones';

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

/**
 * Reported while practising: "when I select an area to loop, sometimes while I'm looping, the
 * selection UI disappears making it hard to tell what section I'm looping. The loop still works
 * properly, but the state of the UI doesn't reflect what's happening."
 *
 * The click-away handler cleared the selection, while the transport kept looping the range it had
 * already captured — so the audio and the screen disagreed. `.playback-controls-bar` was already
 * protected for this reason; the gap was every neutral click elsewhere on the page.
 */
describe('shouldClearDrumsSelectionOnOutsideClick', () => {
  const base = {
    hasSelection: true,
    isPlaying: false,
    targetProtected: false,
    insideNoteDisplay: false,
  };

  it('clears on a neutral outside click while stopped — ordinary editing behaviour', () => {
    expect(shouldClearDrumsSelectionOnOutsideClick(base)).toBe(true);
  });

  it('keeps the selection while it is driving a running loop — the bug', () => {
    expect(shouldClearDrumsSelectionOnOutsideClick({ ...base, isPlaying: true })).toBe(false);
  });

  it('restores click-away once playback stops', () => {
    expect(shouldClearDrumsSelectionOnOutsideClick({ ...base, isPlaying: false })).toBe(true);
  });

  it('still respects protected zones and the note display', () => {
    expect(shouldClearDrumsSelectionOnOutsideClick({ ...base, targetProtected: true })).toBe(false);
    expect(shouldClearDrumsSelectionOnOutsideClick({ ...base, insideNoteDisplay: true })).toBe(false);
  });

  it('does nothing when there is no selection to clear', () => {
    expect(shouldClearDrumsSelectionOnOutsideClick({ ...base, hasSelection: false })).toBe(false);
  });
});
