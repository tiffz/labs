import { describe, expect, it } from 'vitest';
import { WORDS_HOST_INPUT_DRUM_UX } from './wordsInlineDrumUx';
import { getInlineDrumUxProps } from '../../shared/components/music/inlineDrumUxDefaults';

describe('wordsInlineDrumUx', () => {
  it('WORDS_HOST_INPUT_DRUM_UX hides pattern input and Darbuka link for host-owned fields', () => {
    expect(WORDS_HOST_INPUT_DRUM_UX).toEqual(
      getInlineDrumUxProps('settings-panel', {
        hidePatternInput: true,
        hideDarbukaLink: true,
        drumSymbolScale: 0.52,
      }),
    );
  });
});
