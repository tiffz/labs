import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChordPlaybackSettingsPanel } from './ChordPlaybackSettingsPanel';
import { DEFAULT_CHORD_PLAYBACK_SETTINGS } from '../../music/chordPlaybackSettings';

describe('ChordPlaybackSettingsPanel', () => {
  it('shows custom drum notation input when drums are enabled', () => {
    const view = render(
      <ChordPlaybackSettingsPanel
        appearance="encore"
        settings={{ ...DEFAULT_CHORD_PLAYBACK_SETTINGS, drumsEnabled: true }}
        onChange={() => {}}
      />,
    );

    expect(
      view.getByPlaceholderText('D-T-K-T- or paste Darbuka Trainer URL'),
    ).toBeInTheDocument();
    expect(view.getByRole('link', { name: 'Customize in Darbuka trainer' })).toBeInTheDocument();
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

    const input = view.getByPlaceholderText('D-T-K-T- or paste Darbuka Trainer URL');
    fireEvent.change(input, { target: { value: 'D-T-K-T-' } });
    expect(drumPattern).toBe('D-T-K-T-');
  });
});
