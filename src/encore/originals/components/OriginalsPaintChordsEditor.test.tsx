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
        onArm={onArm}
        onClearSelection={onClearSelection}
        onStamp={vi.fn()}
        onSelectChord={vi.fn()}
        onSelectWord={vi.fn()}
        onDeleteSelected={vi.fn()}
        onApplySectionProgression={vi.fn(() => ({ ok: true, chordCount: 1, lineCount: 1 }))}
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
