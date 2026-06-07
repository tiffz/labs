import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DrumAccompaniment from './DrumAccompaniment';
import {
  getInlineDrumUxProps,
  INLINE_DRUM_PANEL_UX,
} from './inlineDrumUxDefaults';
import { getRhythmTemplatePresets } from '../../rhythm/presetDatabase';

describe('DrumAccompaniment playback highlighting', () => {
  it('advances mini notation highlight as currentBeatTime progresses', async () => {
    const view = render(
      <DrumAccompaniment
        bpm={80}
        timeSignature={{ numerator: 4, denominator: 4 }}
        isPlaying
        currentBeatTime={0}
        currentBeat={0}
        notationValue="D-D-__T-D---T---"
        onNotationValueChange={() => {}}
        hidePatternInput
        audioEnabled={false}
        notationStyle={{ inkColor: '#1a1a1a', highlightColor: '#7c3aed' }}
      />,
    );

    await waitFor(() => {
      expect(view.container.querySelector('svg')).toBeInTheDocument();
    });

    const highlightedAtStart = view.container.querySelector('[data-highlighted="true"]');
    expect(highlightedAtStart).toBeInTheDocument();

    view.rerender(
      <DrumAccompaniment
        bpm={80}
        timeSignature={{ numerator: 4, denominator: 4 }}
        isPlaying
        currentBeatTime={0.5}
        currentBeat={0}
        notationValue="D-D-__T-D---T---"
        onNotationValueChange={() => {}}
        hidePatternInput
        audioEnabled={false}
        notationStyle={{ inkColor: '#1a1a1a', highlightColor: '#7c3aed' }}
      />,
    );

    await waitFor(() => {
      const highlighted = view.container.querySelector('[data-highlighted="true"]');
      expect(highlighted).toBeInTheDocument();
      expect(highlighted).not.toBe(highlightedAtStart);
    });
  });

  it('shows metronome dots in inline drum panel when metronome is enabled', async () => {
    const view = render(
      <DrumAccompaniment
        {...INLINE_DRUM_PANEL_UX}
        bpm={80}
        timeSignature={{ numerator: 4, denominator: 4 }}
        isPlaying
        currentBeatTime={0}
        currentBeat={0}
        metronomeEnabled
        presetLayout="compact"
        notationStyle={{ inkColor: '#1a1a1a', highlightColor: '#7c3aed' }}
      />,
    );

    await waitFor(() => {
      expect(view.container.querySelectorAll('circle').length).toBeGreaterThan(0);
    });
  });

  it('shows pattern input when hidePatternInput is false', () => {
    const view = render(
      <DrumAccompaniment
        {...INLINE_DRUM_PANEL_UX}
        hidePatternInput={false}
        bpm={80}
        timeSignature={{ numerator: 4, denominator: 4 }}
        isPlaying={false}
        currentBeatTime={0}
        currentBeat={0}
        presetLayout="compact"
        audioEnabled={false}
        notationStyle={{ inkColor: '#1a1a1a', highlightColor: '#7c3aed' }}
      />,
    );

    expect(
      view.getByPlaceholderText('D-T-K-T- or paste Darbuka Trainer URL'),
    ).toBeInTheDocument();
  });

  it('compact preset layout opens menu and selects a preset', async () => {
    const presets = getRhythmTemplatePresets({ numerator: 4, denominator: 4 });
    const secondPreset = presets[1]!;

    const view = render(
      <DrumAccompaniment
        bpm={80}
        timeSignature={{ numerator: 4, denominator: 4 }}
        isPlaying={false}
        currentBeatTime={0}
        currentBeat={0}
        presetLayout="compact"
        hidePatternInput
        audioEnabled={false}
        notationStyle={{ inkColor: '#1a1a1a', highlightColor: '#7c3aed' }}
      />,
    );

    const picker = view.getByRole('button', {
      name: new RegExp(`Choose rhythm preset, currently ${presets[0]!.label}`, 'i'),
    });
    fireEvent.click(picker);
    fireEvent.click(view.getByRole('menuitem', { name: secondPreset.label }));

    await waitFor(() => {
      expect(
        view.getByRole('button', {
          name: new RegExp(`Choose rhythm preset, currently ${secondPreset.label}`, 'i'),
        }),
      ).toBeInTheDocument();
    });
  });

  it('shows inline Darbuka link beside pattern input for settings-panel profile', () => {
    const view = render(
      <DrumAccompaniment
        {...getInlineDrumUxProps('settings-panel')}
        bpm={80}
        timeSignature={{ numerator: 4, denominator: 4 }}
        isPlaying={false}
        currentBeatTime={0}
        currentBeat={0}
        presetLayout="compact"
        audioEnabled={false}
        notationStyle={{ inkColor: '#1a1a1a', highlightColor: '#7c3aed' }}
      />,
    );

    const link = view.getByRole('link', { name: 'Customize in Darbuka trainer' });
    expect(link).toHaveAttribute('href', expect.stringContaining('/drums/?'));
    expect(link).toHaveAttribute('target', '_blank');
    expect(view.queryByText('Edit in Darbuka Trainer')).not.toBeInTheDocument();
  });

  it('shows inline Darbuka link above notation when host hides pattern input', async () => {
    const view = render(
      <DrumAccompaniment
        {...getInlineDrumUxProps('settings-panel', { hidePatternInput: true })}
        bpm={80}
        timeSignature={{ numerator: 4, denominator: 4 }}
        isPlaying={false}
        currentBeatTime={0}
        currentBeat={0}
        presetLayout="compact"
        notationStyle={{ inkColor: '#1a1a1a', highlightColor: '#7c3aed' }}
      />,
    );

    await waitFor(() => {
      expect(view.container.querySelector('svg')).toBeInTheDocument();
    });

    const link = view.getByRole('link', { name: 'Customize in Darbuka trainer' });
    expect(link.closest('.drum-notation-mini-header-row, .drum-notation-mini-toolbar-row')).toBeTruthy();
    expect(view.queryByText('Edit in Darbuka Trainer')).not.toBeInTheDocument();
  });
});
