import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  parseChordProToChartLayout,
  serializeChartLayoutToChordPro,
  tokenizeLyricLine,
} from '../../../shared/music/chordPro/chordChartLayout';
import { useOriginalsChartLayout } from './useOriginalsChartLayout';

function layoutWithTwoChordsOnAround(): string {
  return serializeChartLayoutToChordPro(parseChordProToChartLayout('[Verse 1]\n[Bb][Eb]around here'));
}

describe('useOriginalsChartLayout', () => {
  it('toggles selection by chordId when two chords share a word', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useOriginalsChartLayout(layoutWithTwoChordsOnAround(), onChange, 'Bb'));

    const section = result.current.layout.sections[0]!;
    const line = section.lines[0]!;
    const aroundStart = tokenizeLyricLine(line.text).find((t) => t.token === 'around')!.start;
    const atAround = line.chords.filter((c) => c.charIndex === aroundStart);
    expect(atAround).toHaveLength(2);

    const first = atAround[0]!;
    const second = atAround[1]!;

    act(() => {
      result.current.onSelectChord({
        sectionId: section.sectionId,
        lineId: line.lineId,
        charIndex: first.charIndex,
        chordId: first.id,
      });
    });
    expect(result.current.selectedChord?.chordId).toBe(first.id);

    act(() => {
      result.current.onSelectChord({
        sectionId: section.sectionId,
        lineId: line.lineId,
        charIndex: second.charIndex,
        chordId: second.id,
      });
    });
    expect(result.current.selectedChord?.chordId).toBe(second.id);
    expect(result.current.selectedChord?.chordId).not.toBe(first.id);
  });

  it('moves selected chord to another word using snapped token indices', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useOriginalsChartLayout(layoutWithTwoChordsOnAround(), onChange, 'Bb'));

    const section = result.current.layout.sections[0]!;
    const line = section.lines[0]!;
    const tokens = tokenizeLyricLine(line.text);
    const aroundStart = tokens.find((t) => t.token === 'around')!.start;
    const hereStart = tokens.find((t) => t.token === 'here')!.start;
    const bb = line.chords.find((c) => c.chordName === 'Bb')!;

    act(() => {
      result.current.onSelectChord({
        sectionId: section.sectionId,
        lineId: line.lineId,
        charIndex: bb.charIndex,
        chordId: bb.id,
      });
    });

    act(() => {
      result.current.onStamp(section.sectionId, line.lineId, hereStart);
    });

    const updated = result.current.layout.sections[0]!.lines[0]!;
    const moved = updated.chords.find((c) => c.id === bb.id);
    const eb = updated.chords.find((c) => c.chordName === 'Eb');
    expect(moved?.charIndex).toBe(hereStart);
    expect(eb?.charIndex).toBe(aroundStart);
    expect(onChange).toHaveBeenCalled();
  });
});
