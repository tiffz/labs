import { describe, expect, it } from 'vitest';
import { DRUMS_SCORE_EXPORT_SVG_CSS, applyDrumsExportSvgInlinePresentation } from './drumsScoreExportStyles';
import { DRUMS_SCORE_EXPORT_STAFF_STROKE_WIDTH } from './scoreExportLayout';
import { applyDrumsExportSvgStyles } from './scoreExport';

describe('applyDrumsExportSvgStyles', () => {
  it('embeds CSS that greys staff lines and keeps stems black', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    applyDrumsExportSvgStyles(svg);

    const style = svg.querySelector('defs style');
    expect(style?.textContent).toContain("g[class*='vf-stave'] > path");
    expect(style?.textContent).toContain('#e5e7eb');
    expect(style?.textContent).toContain("path[class*='vf-stem']");
    expect(style?.textContent).toContain('#000 !important');
  });

  it('documents the same stem/staff contrast rules as export CSS', () => {
    expect(DRUMS_SCORE_EXPORT_SVG_CSS).toContain("g[class*='vf-stave'] > path");
    expect(DRUMS_SCORE_EXPORT_SVG_CSS).toContain('#e5e7eb');
    expect(DRUMS_SCORE_EXPORT_SVG_CSS).toContain("path[class*='beam']");
  });

  it('inlines light grey staff strokes for raster export', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const stave = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    stave.setAttribute('class', 'vf-stave');
    const staffLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    staffLine.setAttribute('d', 'M10 40L200 40');
    staffLine.setAttribute('stroke', '#000000');
    const stemLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    stemLine.setAttribute('class', 'vf-stem');
    stemLine.setAttribute('x1', '50');
    stemLine.setAttribute('y1', '40');
    stemLine.setAttribute('x2', '50');
    stemLine.setAttribute('y2', '10');
    stemLine.setAttribute('stroke', '#000000');
    const nestedStemLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    nestedStemLine.setAttribute('x1', '70');
    nestedStemLine.setAttribute('y1', '40');
    nestedStemLine.setAttribute('x2', '70');
    nestedStemLine.setAttribute('y2', '12');
    nestedStemLine.setAttribute('stroke', '#000000');
    const noteGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    noteGroup.setAttribute('class', 'vf-stavenote');
    noteGroup.appendChild(nestedStemLine);
    const barline = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    barline.setAttribute('class', 'barline');
    barline.setAttribute('stroke', '#000000');
    stave.appendChild(staffLine);
    stave.appendChild(stemLine);
    stave.appendChild(noteGroup);
    stave.appendChild(barline);
    svg.appendChild(stave);

    applyDrumsExportSvgInlinePresentation(svg);

    expect(staffLine.getAttribute('stroke')).toBe('#e5e7eb');
    expect(staffLine.classList.contains('drums-export-staff-line')).toBe(true);
    expect(stemLine.getAttribute('stroke')).toBe('#000');
    expect(nestedStemLine.getAttribute('stroke')).toBe('#000');
    expect(nestedStemLine.style.getPropertyValue('stroke')).toBe('#000');
    expect(barline.getAttribute('stroke')).toBe('#333');
  });

  it('recognizes vexflow staff path syntax without spaces before L', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const stave = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    stave.setAttribute('class', 'vf-stave');
    const staffLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    staffLine.setAttribute('d', 'M6 12.5L186 12.5');
    staffLine.setAttribute('stroke', '#000000');
    stave.appendChild(staffLine);
    svg.appendChild(stave);

    applyDrumsExportSvgInlinePresentation(svg);

    expect(staffLine.getAttribute('stroke')).toBe('#e5e7eb');
    expect(staffLine.getAttribute('stroke-width')).toBe(String(DRUMS_SCORE_EXPORT_STAFF_STROKE_WIDTH));
  });
});
