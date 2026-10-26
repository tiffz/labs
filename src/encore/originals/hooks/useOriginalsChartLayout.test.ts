// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  parseChordProToChartLayout,
  serializeChartLayoutToChordPro,
  tokenizeLyricLine,
} from '../../../shared/music/chordPro/chordChartLayout';
import { ORIGINALS_WRITE_RECONCILE_DEBOUNCE_MS, useOriginalsChartLayout } from './useOriginalsChartLayout';

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

  it('defers chord reconciliation until flush after transient lyric edits', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const initial = serializeChartLayoutToChordPro(
      parseChordProToChartLayout(`[Verse 1]\n[C]Hello pretty world`),
    );
    const { result } = renderHook(() => useOriginalsChartLayout(initial, onChange, 'C'));

    act(() => {
      result.current.onWriteChange('[Verse 1]\nHello world');
    });
    expect(result.current.layout.sections[0]?.lines[0]?.chords).toHaveLength(1);

    act(() => {
      result.current.onWriteChange('[Verse 1]\nHello pretty world');
    });
    expect(result.current.layout.sections[0]?.lines[0]?.chords).toHaveLength(1);

    act(() => {
      result.current.flushWriteReconcile();
    });
    expect(result.current.layout.sections[0]?.lines[0]?.chords[0]?.chordName).toBe('C');
    vi.useRealTimers();
  });

  it('reconciles chords after debounce idle', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const initial = serializeChartLayoutToChordPro(
      parseChordProToChartLayout(`[Verse 1]\n[C]Hello pretty world`),
    );
    const { result } = renderHook(() => useOriginalsChartLayout(initial, onChange, 'C'));

    act(() => {
      result.current.onWriteChange('[Verse 1]\nHello beautiful world');
    });
    act(() => {
      vi.advanceTimersByTime(ORIGINALS_WRITE_RECONCILE_DEBOUNCE_MS + 1);
    });
    expect(result.current.layout.sections[0]?.lines[0]?.chords[0]?.chordName).toBe('C');
    vi.useRealTimers();
  });
});

describe('painting chords onto a line with no words (instrumentals)', () => {
  it('appends the armed chord to a chord-only line instead of replacing the line', () => {
    // Every chord on a chord-only line sits at column 0, so the old upsert replaced the whole
    // line with the new chord: stamping G onto `[Am][F]` left just `[G]`.
    const onChange = vi.fn();
    const { result } = renderHook(() => useOriginalsChartLayout('[Solo]\n[Am][F]', onChange, 'C'));
    const section = result.current.layout.sections[0]!;
    const line = section.lines[0]!;

    act(() => result.current.setArmedChord('C'));
    act(() => result.current.onStamp(section.sectionId, line.lineId, 0));
    act(() => result.current.onStamp(section.sectionId, line.lineId, 0));

    expect(result.current.layout.sections[0]!.lines[0]!.chords.map((c) => c.chordName)).toEqual(['Am', 'F', 'C', 'C']);
  });

  it('starts a chord line on an empty line', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useOriginalsChartLayout('[Intro]\n\n[Verse]\nWords', onChange, 'C'));
    const intro = result.current.layout.sections[0]!;
    const blank = intro.lines[0]!;

    act(() => result.current.setArmedChord('Am'));
    act(() => result.current.onStamp(intro.sectionId, blank.lineId, 0));

    expect(serializeChartLayoutToChordPro(result.current.layout)).toContain('[Intro]\n[Am]');
  });
});
