/**
 * Contract tests: profile props → expected DOM affordances per host.
 * Catches regressions when a host hides pattern input or misplaces the Darbuka link.
 */
import { fireEvent, render, within } from '@testing-library/react';
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
  it('settings-panel defaults to dense menu editing', () => {
    expect(getInlineDrumUxProps('settings-panel').patternEditing).toBe('menu');
  });

  it('Encore / Chords settings-panel: Edit opens dropdown with pattern input + Darbuka link', () => {
    const view = render(
      <DrumAccompaniment {...getInlineDrumUxProps('settings-panel')} {...basePlaybackProps} />,
    );
    expect(view.queryByPlaceholderText('D-T-K-T- or paste Darbuka Trainer URL')).not.toBeInTheDocument();
    fireEvent.click(view.getByRole('button', { name: /Edit drum pattern/i }));
    const dialog = view.getByRole('dialog', { name: /Drum pattern editor/i });
    expect(within(dialog).getByPlaceholderText('D-T-K-T- or paste Darbuka Trainer URL')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Customize in Darbuka trainer' })).toBeInTheDocument();
    expect(dialog.querySelector('.drum-pattern-edit-menu__preview')).toBeTruthy();
    expect(document.querySelector('.MuiPopover-root')).toBeTruthy();
  });

  it('Stanza practice-rail: menu pattern editor, preset chip grid in dropdown', () => {
    const stanzaRailUx = getInlineDrumUxProps('practice-rail');
    expect(stanzaRailUx.presetLayout).toBe('grid');
    expect(stanzaRailUx.audioEnabled).toBe(true);
    expect(stanzaRailUx.hidePatternInput).toBe(false);
    expect(stanzaRailUx.patternEditing).toBe('menu');

    const view = render(
      <DrumAccompaniment {...stanzaRailUx} {...basePlaybackProps} audioEnabled />,
    );
    expect(view.queryByPlaceholderText('D-T-K-T- or paste Darbuka Trainer URL')).not.toBeInTheDocument();
    expect(view.getByRole('button', { name: /Edit drum pattern/i })).toBeInTheDocument();
    expect(view.queryByRole('button', { name: /Use Maqsum drum preset/i })).not.toBeInTheDocument();

    fireEvent.click(view.getByRole('button', { name: /Edit drum pattern/i }));
    const dialog = view.getByRole('dialog', { name: /Drum pattern editor/i });
    expect(within(dialog).getByPlaceholderText('D-T-K-T- or paste Darbuka Trainer URL')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /Use Maqsum drum preset/i })).toBeInTheDocument();
    expect(dialog.querySelector('.drum-pattern-edit-menu__preview .drum-notation-mini')).toBeTruthy();
    // Dice sit in a tight row — not stretched across the 3-column preset grid.
    const randomRow = dialog.querySelector('.drum-presets__random-row');
    expect(randomRow).toBeTruthy();
    expect(randomRow?.querySelectorAll('.preset-btn-icon')).toHaveLength(2);
    // Default Maqsum notation has multiple variations — available inside the edit menu.
    expect(within(dialog).getByRole('button', { name: /Next variation/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /Previous variation/i })).toBeInTheDocument();
    expect(document.querySelector('.MuiPopover-root')).toBeTruthy();
  });

  it('menu editor closes via Done', () => {
    const view = render(
      <DrumAccompaniment {...getInlineDrumUxProps('practice-rail')} {...basePlaybackProps} audioEnabled />,
    );
    fireEvent.click(view.getByRole('button', { name: /Edit drum pattern/i }));
    const dialog = view.getByRole('dialog', { name: /Drum pattern editor/i });
    fireEvent.click(within(dialog).getByRole('button', { name: /^Done$/i }));
    expect(view.queryByRole('dialog', { name: /Drum pattern editor/i })).not.toBeInTheDocument();
    expect(view.getByRole('button', { name: /Edit drum pattern/i })).toBeInTheDocument();
  });

  it('menu editor freezes position and does not put variation controls on the stage toolbar', () => {
    function MenuDrumHarness(): ReactElement {
      const [pattern, setPattern] = useState('D---T---D-D-T---');
      return (
        <DrumAccompaniment
          {...getInlineDrumUxProps('settings-panel')}
          {...basePlaybackProps}
          notationValue={pattern}
          onNotationValueChange={setPattern}
        />
      );
    }
    const view = render(<MenuDrumHarness />);
    fireEvent.click(view.getByRole('button', { name: /Edit drum pattern/i }));
    const dialog = view.getByRole('dialog', { name: /Drum pattern editor/i });

    expect(document.body.classList.contains('labs-drum-pattern-edit-menu-open')).toBe(true);
    expect(document.querySelector('.labs-drum-pattern-edit-menu-root')).toBeTruthy();

    // Stage shows variation controls when the preset has multiple variations.
    const stageToolbar = document.querySelector(
      '.vexflow-mini-container > .stanza-drums-notation-toolbar',
    );
    expect(stageToolbar?.querySelector('.rhythm-template-variation-arrow')).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: /Next variation/i })).toBeInTheDocument();
    // No bare preset-name header in dense mode (variation controls replace it).
    expect(stageToolbar?.querySelector('.drum-pattern-active-summary')).toBeNull();

    // Switching presets must not drop the reserved variations row (layout stability).
    fireEvent.click(within(dialog).getByRole('button', { name: /Use Simple drum preset/i }));
    expect(dialog.querySelector('.drum-pattern-edit-menu__variations')).toBeTruthy();

    fireEvent.click(within(dialog).getByRole('button', { name: /^Done$/i }));
    expect(document.body.classList.contains('labs-drum-pattern-edit-menu-open')).toBe(false);
  });

  it('menu editor survives invalid pattern edits without unmounting anchor', () => {
    function MenuDrumHarness(): ReactElement {
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
    const view = render(<MenuDrumHarness />);
    fireEvent.click(view.getByRole('button', { name: /Edit drum pattern/i }));
    const dialog = view.getByRole('dialog', { name: /Drum pattern editor/i });
    const input = within(dialog).getByPlaceholderText('D-T-K-T- or paste Darbuka Trainer URL');
    fireEvent.change(input, { target: { value: '!!!' } });
    expect(within(dialog).getByText('Enter a valid rhythm pattern')).toBeInTheDocument();
    // Stage keeps the last valid staff so the rail / popover anchor does not collapse.
    expect(document.querySelector('.stanza-drums-notation-trigger .drum-notation-mini')).toBeTruthy();
    expect(
      document.querySelector('.stanza-drums-notation-trigger .drum-display-error'),
    ).not.toBeInTheDocument();
    expect(input).toBeInTheDocument();
  });

  it('readOnly hides Edit and does not show a Rhythm placeholder header', () => {
    const view = render(
      <DrumAccompaniment
        {...getInlineDrumUxProps('settings-panel')}
        {...basePlaybackProps}
        notationValue="D---TKTKD---TKTK"
        readOnly
      />,
    );
    expect(view.queryByRole('button', { name: /Edit drum pattern/i })).not.toBeInTheDocument();
    expect(view.queryByText('Rhythm')).not.toBeInTheDocument();
  });

  it('Words host-input: outer field hidden; Edit menu still has pattern + presets', () => {
    expect(WORDS_HOST_INPUT_DRUM_UX.hidePatternInput).toBe(true);
    expect(WORDS_HOST_INPUT_DRUM_UX.hideDarbukaLink).toBe(true);

    const view = render(
      <DrumAccompaniment {...WORDS_HOST_INPUT_DRUM_UX} {...basePlaybackProps} notationValue="D-T-K-T-" />,
    );
    expect(view.queryByPlaceholderText('D-T-K-T- or paste Darbuka Trainer URL')).not.toBeInTheDocument();
    expect(view.queryByRole('link', { name: 'Customize in Darbuka trainer' })).not.toBeInTheDocument();
    fireEvent.click(view.getByRole('button', { name: /Edit drum pattern/i }));
    const dialog = view.getByRole('dialog', { name: /Drum pattern editor/i });
    expect(within(dialog).getByPlaceholderText('D-T-K-T- or paste Darbuka Trainer URL')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /Use Maqsum drum preset/i })).toBeInTheDocument();
  });
});
