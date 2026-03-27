import { describe, it, expect } from 'vitest';
import { syncPlaybackHighlightState } from './playbackHighlight';
import type { ParsedRhythm } from '../../drums/types';

function createNoteSvgElement() {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('fill', '#1f2937');
  group.setAttribute('stroke', '#1f2937');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('fill', '#1f2937');
  path.setAttribute('stroke', '#1f2937');
  group.appendChild(path);
  return group as unknown as SVGElement;
}

describe('syncPlaybackHighlightState', () => {
  const rhythm: ParsedRhythm = {
    isValid: true,
    measures: [
      {
        notes: [
          { sound: 'dum', duration: 'quarter', durationInSixteenths: 4, isDotted: false },
          { sound: 'tak', duration: 'quarter', durationInSixteenths: 4, isDotted: false },
        ],
        totalDuration: 8,
      },
    ],
  };

  it('re-applies active note highlight after element map replacement', () => {
    const firstElement = createNoteSvgElement();
    const activeKeyRef = { current: '0-0' as string | null };

    syncPlaybackHighlightState({
      noteElements: new Map([['0-0', firstElement]]),
      symbolElements: new Map(),
      syllableElements: new Map(),
      chordSystemNoteElements: new Map(),
      activeKeyRef,
      currentNote: { measureIndex: 0, noteIndex: 0 },
      currentMetronomeBeat: null,
      rhythm,
    });
    expect(firstElement.getAttribute('fill')).toBe('#ef4444');

    const redrawnElement = createNoteSvgElement();
    syncPlaybackHighlightState({
      noteElements: new Map([['0-0', redrawnElement]]),
      symbolElements: new Map(),
      syllableElements: new Map(),
      chordSystemNoteElements: new Map(),
      activeKeyRef,
      currentNote: { measureIndex: 0, noteIndex: 0 },
      currentMetronomeBeat: null,
      rhythm,
    });

    expect(redrawnElement.getAttribute('fill')).toBe('#ef4444');
    expect(activeKeyRef.current).toBe('0-0');
  });

  it('clears previous note highlight when active note changes', () => {
    const previous = createNoteSvgElement();
    const current = createNoteSvgElement();
    const activeKeyRef = { current: '0-0' as string | null };

    syncPlaybackHighlightState({
      noteElements: new Map([
        ['0-0', previous],
        ['0-1', current],
      ]),
      symbolElements: new Map(),
      syllableElements: new Map(),
      chordSystemNoteElements: new Map(),
      activeKeyRef,
      currentNote: { measureIndex: 0, noteIndex: 1 },
      currentMetronomeBeat: null,
      rhythm,
    });

    expect(previous.getAttribute('fill')).toBe('#1f2937');
    expect(current.getAttribute('fill')).toBe('#ef4444');
    expect(activeKeyRef.current).toBe('0-1');
  });
});
