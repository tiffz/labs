import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ChordPlaybackSettingsPanel } from './ChordPlaybackSettingsPanel';
import { DEFAULT_CHORD_PLAYBACK_SETTINGS } from '../../music/chordPlaybackSettings';

/**
 * Lazy DrumAccompaniment pulls VexFlow/canvas, which is flaky under jsdom.
 * Stub the menu surface so this panel test covers wiring only.
 */
vi.mock('./DrumAccompaniment', () => ({
  default: function MockDrumAccompaniment(props: {
    notationValue?: string;
    onNotationValueChange?: (value: string) => void;
  }) {
    const [open, setOpen] = useState(false);
    return (
      <div>
        <button type="button" aria-label="Edit drum pattern" onClick={() => setOpen(true)}>
          Edit
        </button>
        {open ? (
          <div role="dialog" aria-label="Drum pattern editor">
            <input
              placeholder="D-T-K-T- or paste Darbuka Trainer URL"
              value={props.notationValue ?? ''}
              onChange={(e) => props.onNotationValueChange?.(e.target.value)}
            />
            <a href="/drums/">Customize in Darbuka trainer</a>
          </div>
        ) : null}
      </div>
    );
  },
}));

async function openDrumPatternEditor() {
  fireEvent.click(await screen.findByRole('button', { name: /Edit drum pattern/i }));
  return screen.getByRole('dialog', { name: /Drum pattern editor/i });
}

describe('ChordPlaybackSettingsPanel', () => {
  it('shows custom drum notation input when drums are enabled', async () => {
    render(
      <ChordPlaybackSettingsPanel
        appearance="encore"
        settings={{ ...DEFAULT_CHORD_PLAYBACK_SETTINGS, drumsEnabled: true }}
        onChange={() => {}}
      />,
    );

    expect(screen.queryByPlaceholderText('D-T-K-T- or paste Darbuka Trainer URL')).not.toBeInTheDocument();
    const dialog = await openDrumPatternEditor();
    expect(
      within(dialog).getByPlaceholderText('D-T-K-T- or paste Darbuka Trainer URL'),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Customize in Darbuka trainer' })).toBeInTheDocument();
  });

  it('persists drum pattern edits via onChange', async () => {
    let drumPattern = DEFAULT_CHORD_PLAYBACK_SETTINGS.drumPattern;
    render(
      <ChordPlaybackSettingsPanel
        appearance="encore"
        settings={{ ...DEFAULT_CHORD_PLAYBACK_SETTINGS, drumsEnabled: true, drumPattern }}
        onChange={(patch) => {
          if (patch.drumPattern != null) drumPattern = patch.drumPattern;
        }}
      />,
    );

    const dialog = await openDrumPatternEditor();
    const input = within(dialog).getByPlaceholderText('D-T-K-T- or paste Darbuka Trainer URL');
    fireEvent.change(input, { target: { value: 'D-T-K-T-' } });
    expect(drumPattern).toBe('D-T-K-T-');
  });
});
