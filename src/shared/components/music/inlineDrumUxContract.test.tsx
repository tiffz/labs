/**
 * Contract tests: profile props → expected DOM affordances per host.
 * Catches regressions when a host hides pattern input or misplaces the Darbuka link.
 */
import { fireEvent, render } from '@testing-library/react';
import { useState, type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import DrumAccompaniment from './DrumAccompaniment';
import { getInlineDrumUxProps } from './inlineDrumUxDefaults';

const TS = { numerator: 4, denominator: 4 } as const;
const NOTATION_STYLE = { inkColor: '#1a1a1a', highlightColor: '#7c3aed' } as const;

/** Mirrors Words `WORDS_HOST_INPUT_DRUM_UX` without cross-app import. */
const WORDS_HOST_INPUT_DRUM_UX = getInlineDrumUxProps('settings-panel', {
  hidePatternInput: true,
  hideDarbukaLink: true,
  drumSymbolScale: 0.52,
});

const basePlaybackProps = {
  bpm: 80,
  timeSignature: TS,
  isPlaying: false,
  currentBeatTime: 0,
  currentBeat: 0,
  notationValue: 'D---D---D---D---',
  onNotationValueChange: () => {},
  notationStyle: NOTATION_STYLE,
  audioEnabled: false,
};

describe('inline drum UX host contracts (DrumAccompaniment)', () => {
  it('Encore / Chords settings-panel: pattern input + inline Darbuka link', () => {
    const view = render(
      <DrumAccompaniment {...getInlineDrumUxProps('settings-panel')} {...basePlaybackProps} presetLayout="compact" />,
    );
    expect(view.getByPlaceholderText('D-T-K-T- or paste Darbuka Trainer URL')).toBeInTheDocument();
    expect(view.getByRole('link', { name: 'Customize in Darbuka trainer' })).toBeInTheDocument();
    expect(view.queryByText('Edit in Darbuka Trainer')).not.toBeInTheDocument();
  });

  it('Stanza practice-rail: popover pattern editor, preset chip grid, audio enabled in profile', () => {
    const stanzaRailUx = getInlineDrumUxProps('practice-rail');
    expect(stanzaRailUx.presetLayout).toBe('grid');
    expect(stanzaRailUx.audioEnabled).toBe(true);
    expect(stanzaRailUx.hidePatternInput).toBe(false);
    expect(stanzaRailUx.patternEditing).toBe('popover');

    const view = render(
      <DrumAccompaniment {...stanzaRailUx} {...basePlaybackProps} audioEnabled />,
    );
    expect(view.queryByPlaceholderText('D-T-K-T- or paste Darbuka Trainer URL')).not.toBeInTheDocument();
    expect(view.getByRole('button', { name: /Edit drum pattern/i })).toBeInTheDocument();
    expect(view.queryByRole('button', { name: /Use Maqsum drum preset/i })).not.toBeInTheDocument();
  });

  it('Stanza practice-rail: collapsed pattern editor expands inline (no portaled popover)', () => {
    const view = render(
      <DrumAccompaniment {...getInlineDrumUxProps('practice-rail')} {...basePlaybackProps} audioEnabled />,
    );
    fireEvent.click(view.getByRole('button', { name: /Edit drum pattern/i }));
    expect(view.getByPlaceholderText('D-T-K-T- or paste Darbuka Trainer URL')).toBeInTheDocument();
    expect(view.getByRole('button', { name: /Done editing drum pattern/i })).toBeInTheDocument();
    expect(document.querySelector('.stanza-drums-pattern-editor-panel')).toBeTruthy();
    expect(document.querySelector('.MuiPopover-root')).toBeNull();
  });

  it('Stanza practice-rail pattern editor stays open when clicking outside the card', () => {
    const view = render(
      <div>
        <button type="button">Outside control</button>
        <DrumAccompaniment {...getInlineDrumUxProps('practice-rail')} {...basePlaybackProps} audioEnabled />
      </div>,
    );
    fireEvent.click(view.getByRole('button', { name: /Edit drum pattern/i }));
    fireEvent.pointerDown(view.getByRole('button', { name: 'Outside control' }));
    expect(view.getByRole('button', { name: /Done editing drum pattern/i })).toBeInTheDocument();
  });

  it('Stanza practice-rail pattern editor closes via Done', () => {
    const view = render(
      <DrumAccompaniment {...getInlineDrumUxProps('practice-rail')} {...basePlaybackProps} audioEnabled />,
    );
    fireEvent.click(view.getByRole('button', { name: /Edit drum pattern/i }));
    fireEvent.click(view.getByRole('button', { name: /Done editing drum pattern/i }));
    expect(view.queryByPlaceholderText('D-T-K-T- or paste Darbuka Trainer URL')).not.toBeInTheDocument();
    expect(view.getByRole('button', { name: /Edit drum pattern/i })).toBeInTheDocument();
  });

  it('Stanza practice-rail popover survives invalid pattern edits without unmounting anchor', () => {
    function PopoverDrumHarness(): ReactElement {
      const [pattern, setPattern] = useState('D---D---D---D---');
      return (
        <DrumAccompaniment
          {...getInlineDrumUxProps('practice-rail')}
          {...basePlaybackProps}
          notationValue={pattern}
          onNotationValueChange={setPattern}
          audioEnabled
        />
      );
    }
    const view = render(<PopoverDrumHarness />);
    fireEvent.click(view.getByRole('button', { name: /Edit drum pattern/i }));
    const input = view.getByPlaceholderText('D-T-K-T- or paste Darbuka Trainer URL');
    fireEvent.change(input, { target: { value: '!!!' } });
    expect(view.getByText('Enter a valid rhythm pattern')).toBeInTheDocument();
    expect(document.querySelector('.stanza-drums-notation-trigger')).toBeTruthy();
    expect(input).toBeInTheDocument();
  });

  it('Words host-input: no pattern field in DrumAccompaniment; preset row remains', () => {
    expect(WORDS_HOST_INPUT_DRUM_UX.hidePatternInput).toBe(true);
    expect(WORDS_HOST_INPUT_DRUM_UX.hideDarbukaLink).toBe(true);

    const view = render(
      <DrumAccompaniment {...WORDS_HOST_INPUT_DRUM_UX} {...basePlaybackProps} notationValue="D-T-K-T-" />,
    );
    expect(view.queryByPlaceholderText('D-T-K-T- or paste Darbuka Trainer URL')).not.toBeInTheDocument();
    expect(view.queryByRole('link', { name: 'Customize in Darbuka trainer' })).not.toBeInTheDocument();
    expect(view.getByRole('button', { name: /Use Maqsum drum preset/i })).toBeInTheDocument();
  });
});
