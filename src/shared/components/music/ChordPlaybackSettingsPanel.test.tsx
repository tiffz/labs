import { fireEvent, render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChordPlaybackSettingsPanel } from './ChordPlaybackSettingsPanel';
import { DEFAULT_CHORD_PLAYBACK_SETTINGS } from '../../music/chordPlaybackSettings';

function openDrumPatternEditor(view: ReturnType<typeof render>) {
  fireEvent.click(view.getByRole('button', { name: /Edit drum pattern/i }));
  return view.getByRole('dialog', { name: /Drum pattern editor/i });
}

describe('ChordPlaybackSettingsPanel', () => {
  it('shows custom drum notation input when drums are enabled', () => {
    const view = render(
      <ChordPlaybackSettingsPanel
        appearance="encore"
        settings={{ ...DEFAULT_CHORD_PLAYBACK_SETTINGS, drumsEnabled: true }}
        onChange={() => {}}
      />,
    );

    expect(view.queryByPlaceholderText('D-T-K-T- or paste Darbuka Trainer URL')).not.toBeInTheDocument();
    const dialog = openDrumPatternEditor(view);
    expect(
      within(dialog).getByPlaceholderText('D-T-K-T- or paste Darbuka Trainer URL'),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Customize in Darbuka trainer' })).toBeInTheDocument();
  });

  it('persists drum pattern edits via onChange', () => {
    let drumPattern = DEFAULT_CHORD_PLAYBACK_SETTINGS.drumPattern;
    const view = render(
      <ChordPlaybackSettingsPanel
        appearance="encore"
        settings={{ ...DEFAULT_CHORD_PLAYBACK_SETTINGS, drumsEnabled: true, drumPattern }}
        onChange={(patch) => {
          if (patch.drumPattern != null) drumPattern = patch.drumPattern;
        }}
      />,
    );

    const dialog = openDrumPatternEditor(view);
    const input = within(dialog).getByPlaceholderText('D-T-K-T- or paste Darbuka Trainer URL');
    fireEvent.change(input, { target: { value: 'D-T-K-T-' } });
    expect(drumPattern).toBe('D-T-K-T-');
  });
});
