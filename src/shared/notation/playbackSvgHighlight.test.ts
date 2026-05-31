import { describe, expect, it } from 'vitest';
import {
  highlightVexFlowMiniNoteGroup,
  reapplyActiveKeyHighlight,
  setSvgElementColor,
  setVexFlowNoteGroupColor,
  syncKeyedSvgHighlights,
} from './playbackSvgHighlight';

function createNoteGroup(): SVGElement {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('fill', '#000');
  g.appendChild(text);
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('stroke', '#000');
  path.setAttribute('fill', 'none');
  g.appendChild(path);
  return g;
}

describe('setSvgElementColor', () => {
  it('forces fill on note groups', () => {
    const el = createNoteGroup();
    setSvgElementColor(el, '#ef4444', 'force');
    expect(el.getAttribute('fill')).toBe('#ef4444');
  });
});

describe('setVexFlowNoteGroupColor', () => {
  it('updates text and stroked paths', () => {
    const g = createNoteGroup();
    setVexFlowNoteGroupColor(g, '#ef4444');
    expect(g.querySelector('text')?.getAttribute('fill')).toBe('#ef4444');
    expect(g.querySelector('path')?.getAttribute('stroke')).toBe('#ef4444');
  });
});

describe('syncKeyedSvgHighlights', () => {
  it('re-applies active key after map replacement', () => {
    const prevRef = { current: new Set<string>() };
    const first = createNoteGroup();
    const map1 = new Map([['0-0', first]]);

    syncKeyedSvgHighlights({
      elementMap: map1,
      activeKeys: new Set(['0-0']),
      previousKeysRef: prevRef,
      highlightColor: '#ef4444',
      defaultColor: '#000000',
    });
    expect(first.querySelector('text')?.getAttribute('fill')).toBe('#ef4444');

    const redrawn = createNoteGroup();
    const map2 = new Map([['0-0', redrawn]]);
    prevRef.current.clear();
    syncKeyedSvgHighlights({
      elementMap: map2,
      activeKeys: new Set(['0-0']),
      previousKeysRef: prevRef,
      highlightColor: '#ef4444',
      defaultColor: '#000000',
    });
    expect(redrawn.querySelector('text')?.getAttribute('fill')).toBe('#ef4444');
  });
});

describe('highlightVexFlowMiniNoteGroup', () => {
  it('marks note group and paints descendants', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const noteEl = createNoteGroup();
    svg.appendChild(noteEl);

    highlightVexFlowMiniNoteGroup(noteEl, svg, {
      highlightColor: '#9d8ec7',
      noteX: 40,
      isBeamed: false,
    });

    expect(noteEl.getAttribute('data-highlighted')).toBe('true');
    expect(noteEl.querySelector('text')?.getAttribute('fill')).toBe('#9d8ec7');
  });
});

describe('reapplyActiveKeyHighlight', () => {
  it('highlights when key exists in new map', () => {
    const el = createNoteGroup();
    reapplyActiveKeyHighlight(new Map([['a', el]]), 'a', (node) => {
      setVexFlowNoteGroupColor(node, '#ef4444');
    });
    expect(el.querySelector('text')?.getAttribute('fill')).toBe('#ef4444');
  });
});
