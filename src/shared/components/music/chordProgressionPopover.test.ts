import { describe, expect, it } from 'vitest';
import {
  CHORD_PROGRESSION_DROPDOWN_CLASS,
  CHORD_PROGRESSION_DROPDOWN_ROOT_CLASS,
  chordProgressionPopoverRootClassName,
  isChordProgressionPopoverTarget,
} from './chordProgressionPopover';

describe('chordProgressionPopover', () => {
  it('detects clicks inside the shared dropdown paper and modal root', () => {
    const root = document.createElement('div');
    root.className = `MuiPopover-root ${CHORD_PROGRESSION_DROPDOWN_ROOT_CLASS}`;
    const paper = document.createElement('div');
    paper.className = CHORD_PROGRESSION_DROPDOWN_CLASS;
    const label = document.createTextNode('I–V–vi–IV');
    const chip = document.createElement('button');
    chip.appendChild(label);
    paper.appendChild(chip);
    root.appendChild(paper);
    document.body.appendChild(root);

    expect(isChordProgressionPopoverTarget(label)).toBe(true);
    expect(isChordProgressionPopoverTarget(chip)).toBe(true);
    expect(isChordProgressionPopoverTarget(root)).toBe(true);
    expect(isChordProgressionPopoverTarget(document.body)).toBe(false);

    root.remove();
  });

  it('merges host root class with the shared root class', () => {
    expect(chordProgressionPopoverRootClassName('words-section-chord-dropdown')).toBe(
      `${CHORD_PROGRESSION_DROPDOWN_ROOT_CLASS} words-section-chord-dropdown-root`,
    );
    expect(chordProgressionPopoverRootClassName()).toBe(CHORD_PROGRESSION_DROPDOWN_ROOT_CLASS);
  });
});
