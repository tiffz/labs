// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import {
  createVexFlowAnnotation,
  createVexFlowRule,
  vexFlowAnnotationFontFamily,
  vexFlowUserUnitsPerPixel,
} from './vexFlowAnnotation';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * A VexFlow SVG as `SVGContext` actually leaves it: a black 1-unit stroke and
 * Bravura on the root, and a viewBox shrunk against a fixed width to implement
 * the zoom. Every property asserted below is a property of THIS shape — a
 * fixture that left the stroke off would share the bug it is meant to catch.
 */
function vexFlowSvg({ scale = 1 } = {}): SVGSVGElement {
  const host = document.createElement('div');
  host.style.fontFamily = 'Roboto, sans-serif';
  const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
  svg.setAttribute('width', '800');
  svg.setAttribute('height', '200');
  svg.setAttribute('viewBox', `0 0 ${800 / scale} ${200 / scale}`);
  svg.setAttribute('stroke', 'black');
  svg.setAttribute('stroke-width', '1');
  svg.setAttribute('fill', 'black');
  svg.setAttribute('font-family', 'Bravura');
  host.appendChild(svg);
  document.body.appendChild(host);
  return svg;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('createVexFlowAnnotation', () => {
  /**
   * The defect that made every previous annotation look wrong, and the one
   * that was consistently misread as a font problem.
   */
  it('cancels the black stroke VexFlow leaves on the root', () => {
    const svg = vexFlowSvg();
    expect(svg.getAttribute('stroke')).toBe('black');
    const text = createVexFlowAnnotation(svg, { text: 'Jins Rast', x: 10, y: 10, sizePx: 14 });
    expect(text.getAttribute('stroke')).toBe('none');
  });

  it('takes the family from the host, not from the score', () => {
    const svg = vexFlowSvg();
    const text = createVexFlowAnnotation(svg, { text: 'Jins Rast', x: 10, y: 10, sizePx: 14 });
    expect(text.getAttribute('font-family')).toContain('Roboto');
    expect(text.getAttribute('font-family')).not.toContain('Bravura');
  });

  /**
   * The size fault, parametrised over the dimension it lives in. At scale 1 a
   * wrong implementation and a right one agree exactly, which is why a
   * single-scale fixture would pass against the bug.
   */
  it.each([1, 1.5, 2.5])('draws %sx-scaled text at the size asked for, in px', (scale) => {
    const svg = vexFlowSvg({ scale });
    const text = createVexFlowAnnotation(svg, { text: 'Jins Rast', x: 10, y: 10, sizePx: 14 });
    const userUnits = Number(text.getAttribute('font-size'));
    // User units x the canvas scale is what lands on screen.
    expect(userUnits * scale).toBeCloseTo(14, 5);
  });

  it('is hidden from assistive tech, which reads the score by its own label', () => {
    const svg = vexFlowSvg();
    const text = createVexFlowAnnotation(svg, { text: 'Jins Rast', x: 10, y: 10, sizePx: 14 });
    expect(text.getAttribute('aria-hidden')).toBe('true');
  });

  /*
   * A malformed SVG must draw at 1:1 rather than divide by zero and collapse
   * the text to a font-size of nothing, which would look like a missing label
   * rather than like a broken one.
   */
  it('falls back to 1:1 when the SVG has no usable viewBox', () => {
    const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
    document.body.appendChild(svg);
    expect(vexFlowUserUnitsPerPixel(svg)).toBe(1);
    expect(
      Number(createVexFlowAnnotation(svg, { text: 'x', x: 0, y: 0, sizePx: 14 }).getAttribute('font-size')),
    ).toBe(14);
  });

  it('falls back to a real stack when nothing above resolves a family', () => {
    const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
    expect(vexFlowAnnotationFontFamily(svg)).toContain('sans-serif');
  });
});

describe('createVexFlowRule', () => {
  it.each([1, 2])('draws a %sx-scaled rule at the weight asked for, in px', (scale) => {
    const svg = vexFlowSvg({ scale });
    const rule = createVexFlowRule(svg, 'M 0 0 L 10 0', { widthPx: 1.25, color: '#6f4450' });
    expect(Number(rule.getAttribute('stroke-width')) * scale).toBeCloseTo(1.25, 5);
    expect(rule.getAttribute('stroke')).toBe('#6f4450');
    expect(rule.getAttribute('fill')).toBe('none');
  });
});
