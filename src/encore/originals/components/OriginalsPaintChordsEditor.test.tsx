// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { parseChordProToChartLayout } from '../../../shared/music/chordPro/chordChartLayout';
import { OriginalsPaintChordsEditor } from './OriginalsPaintChordsEditor';

describe('OriginalsPaintChordsEditor', () => {
  it('does not clear selection on pointerdown when target is lyric Text node', () => {
    const onClearSelection = vi.fn();
    const onArm = vi.fn();
    const layout = parseChordProToChartLayout('[Verse 1]\n[Bb]around here');
    const section = layout.sections[0]!;
    const line = section.lines[0]!;
    const chord = line.chords[0]!;

    render(
      <OriginalsPaintChordsEditor
        layout={layout}
        songKey="F"
        notation="letters"
        armedChord={null}
        selectedChord={{
          sectionId: section.sectionId,
          lineId: line.lineId,
          charIndex: chord.charIndex,
          chordId: chord.id,
        }}
        selectedWord={null}
        activePlaybackStep={null}
        tempo={80}
        timeSignature={{ numerator: 4, denominator: 4 }}
        onArm={onArm}
        onClearSelection={onClearSelection}
        onStamp={vi.fn()}
        onSelectChord={vi.fn()}
        onSelectWord={vi.fn()}
        onDeleteSelected={vi.fn()}
        onApplySectionProgression={vi.fn(() => ({ ok: true as const, chordCount: 1, lineCount: 1 }))}
      />,
    );

    const token = document.querySelector('.encore-originals-lyric-token');
    expect(token).toBeTruthy();
    const textNode = [...token!.childNodes].find((n) => n.nodeType === Node.TEXT_NODE);
    expect(textNode).toBeTruthy();

    fireEvent.pointerDown(textNode!);
    expect(onClearSelection).not.toHaveBeenCalled();
    expect(onArm).not.toHaveBeenCalled();
  });
});

describe('OriginalsPaintChordsEditor on lines with no words', () => {
  function renderEditor(chordPro: string, armedChord: string | null, onStamp = vi.fn()) {
    const layout = parseChordProToChartLayout(chordPro);
    render(
      <OriginalsPaintChordsEditor
        layout={layout}
        songKey="C"
        notation="letters"
        armedChord={armedChord}
        selectedChord={null}
        selectedWord={null}
        activePlaybackStep={null}
        tempo={80}
        timeSignature={{ numerator: 4, denominator: 4 }}
        onArm={vi.fn()}
        onClearSelection={vi.fn()}
        onStamp={onStamp}
        onSelectChord={vi.fn()}
        onSelectWord={vi.fn()}
        onDeleteSelected={vi.fn()}
        onApplySectionProgression={vi.fn(() => ({ ok: true as const, chordCount: 1, lineCount: 1 }))}
      />,
    );
    return { layout, onStamp };
  }

  it('offers a slot on a chord-only line while a chord is armed, and stamps that line', () => {
    const { layout, onStamp } = renderEditor('[Solo]\n[Am][F]', 'G');
    fireEvent.click(document.querySelector('[aria-label="Add G to this line"]')!);
    const section = layout.sections[0]!;
    expect(onStamp).toHaveBeenCalledWith(section.sectionId, section.lines[0]!.lineId, 0);
  });

  it('offers a slot on an empty line too', () => {
    renderEditor('[Intro]\n\n[Verse]\nWords', 'Am');
    expect(document.querySelectorAll('[aria-label="Add Am to this line"]').length).toBeGreaterThan(0);
  });

  it('shows no slot when nothing is armed', () => {
    renderEditor('[Solo]\n[Am][F]', null);
    expect(document.querySelector('.encore-originals-chord-add-slot')).toBeNull();
  });
});

describe('the add-chord slot keeps the chord armed', () => {
  it('does not disarm on pointerdown, so a second chord can be added', () => {
    // Found in the browser: pressing the slot ran the click-outside handler, which disarmed the
    // chord, so only one chord could be added per arm.
    const onArm = vi.fn();
    const onClearSelection = vi.fn();
    const layout = parseChordProToChartLayout('[Solo]\n[Am][F]');
    render(
      <OriginalsPaintChordsEditor
        layout={layout}
        songKey="C"
        notation="letters"
        armedChord="G"
        selectedChord={null}
        selectedWord={null}
        activePlaybackStep={null}
        tempo={80}
        timeSignature={{ numerator: 4, denominator: 4 }}
        onArm={onArm}
        onClearSelection={onClearSelection}
        onStamp={vi.fn()}
        onSelectChord={vi.fn()}
        onSelectWord={vi.fn()}
        onDeleteSelected={vi.fn()}
        onApplySectionProgression={vi.fn(() => ({ ok: true as const, chordCount: 1, lineCount: 1 }))}
      />,
    );
    fireEvent.pointerDown(document.querySelector('.encore-originals-chord-add-slot')!);
    expect(onArm).not.toHaveBeenCalled();
    expect(onClearSelection).not.toHaveBeenCalled();
  });
});
