import { injectSvgStyle } from '../../shared/notation/vexFlowFontExport';
import {
  DRUMS_SCORE_EXPORT_STAFF_STROKE,
  DRUMS_SCORE_EXPORT_STAFF_STROKE_WIDTH,
} from './scoreExportLayout';

/**
 * Standalone SVG styles for score export — mirrors `.vexflow-container` rules in
 * `drums.css` so blob rasterization keeps light staff lines and black stems/beams.
 */
export const DRUMS_SCORE_EXPORT_SVG_CSS = `
g[class*='vf-stave'] > path:not([class*='barline']):not([class*='clef']):not([class*='time']):not([class*='key']),
g[class*='vf-stave'] > line:not([class*='barline']),
g[class*='vf-stave'] path.drums-export-staff-line,
g[class*='vf-stave'] line.drums-export-staff-line {
  stroke: ${DRUMS_SCORE_EXPORT_STAFF_STROKE} !important;
  stroke-width: ${DRUMS_SCORE_EXPORT_STAFF_STROKE_WIDTH} !important;
}

g[class*='vf-stave'] path[class*='barline'],
g[class*='vf-stave'] line[class*='barline'] {
  stroke: #333;
  stroke-width: 1.5;
}

path[class*='stem'],
line[class*='stem'],
path[class*='vf-stem'],
line[class*='vf-stem'],
g[class*='vf-stem'] path,
g[class*='vf-stem'] line,
g path[class*='stem'],
g line[class*='stem'],
path[class*='beam'],
line[class*='beam'],
g[class*='beam'] path,
g[class*='beam'] line {
  stroke: #000 !important;
  stroke-width: 1.5 !important;
}

.vf-dot,
circle.vf-dot {
  fill: #000;
  stroke: #000;
}

path[class*='vf-notehead'],
ellipse[class*='vf-notehead'] {
  fill: #000;
  stroke: #000;
}

.drum-symbol path,
.drum-symbol circle {
  stroke: #000;
  fill: #000;
}

.drum-symbol path[fill='none'] {
  fill: none;
}

.tie-curve {
  stroke: #000;
  stroke-width: 2;
  fill: none;
}
`.trim();

export function injectDrumsScoreExportStyles(svg: SVGSVGElement): void {
  injectSvgStyle(svg, DRUMS_SCORE_EXPORT_SVG_CSS);
}

function svgClassIncludes(element: Element, fragment: string): boolean {
  return (element.getAttribute('class') ?? '').includes(fragment);
}

function svgClassIncludesAny(element: Element, fragments: readonly string[]): boolean {
  const cls = element.getAttribute('class') ?? '';
  return fragments.some((fragment) => cls.includes(fragment));
}

function parseHorizontalPathEndpoints(d: string): { y1: number; y2: number } | null {
  const match = d.match(/^M\s*([\d.+-]+)\s+([\d.+-]+)\s*L\s*([\d.+-]+)\s+([\d.+-]+)/i);
  if (!match) return null;
  const y1 = Number.parseFloat(match[2] ?? '0');
  const y2 = Number.parseFloat(match[4] ?? '0');
  if (!Number.isFinite(y1) || !Number.isFinite(y2)) return null;
  return { y1, y2 };
}

function isHorizontalStaffLine(element: Element): boolean {
  if (element.tagName === 'line') {
    const y1 = Number.parseFloat(element.getAttribute('y1') ?? '0');
    const y2 = Number.parseFloat(element.getAttribute('y2') ?? '0');
    return Number.isFinite(y1) && Number.isFinite(y2) && Math.abs(y1 - y2) < 0.5;
  }

  if (element.tagName === 'path') {
    const endpoints = parseHorizontalPathEndpoints(element.getAttribute('d') ?? '');
    if (!endpoints) return false;
    return Math.abs(endpoints.y1 - endpoints.y2) < 0.5;
  }

  return false;
}

function isInsideVfStave(element: Element): boolean {
  return Boolean(element.closest("g[class*='vf-stave']"));
}

function isBarlineElement(element: Element): boolean {
  return svgClassIncludes(element, 'barline');
}

function isNotationStrokeElement(element: Element): boolean {
  return svgClassIncludesAny(element, ['stem', 'beam', 'flag', 'notehead', 'barline']);
}

function isVerticalStrokeLine(element: Element): boolean {
  if (element.tagName !== 'line') return false;
  const x1 = Number.parseFloat(element.getAttribute('x1') ?? '0');
  const x2 = Number.parseFloat(element.getAttribute('x2') ?? '0');
  const y1 = Number.parseFloat(element.getAttribute('y1') ?? '0');
  const y2 = Number.parseFloat(element.getAttribute('y2') ?? '0');
  if (![x1, x2, y1, y2].every(Number.isFinite)) return false;
  return Math.abs(y2 - y1) > Math.abs(x2 - x1);
}

function applyBlackStrokePresentation(element: SVGElement): void {
  element.setAttribute('stroke', '#000');
  element.setAttribute('stroke-width', '1.5');
  element.style.setProperty('stroke', '#000', 'important');
  element.style.setProperty('stroke-width', '1.5px', 'important');
}

function applyBlackStemPresentation(svg: SVGSVGElement): void {
  const blackStrokeSelectors = [
    "path[class*='stem']",
    "line[class*='stem']",
    "path[class*='vf-stem']",
    "line[class*='vf-stem']",
    "g[class*='vf-stem'] path",
    "g[class*='vf-stem'] line",
    "path[class*='beam']",
    "line[class*='beam']",
    "g[class*='beam'] path",
    "g[class*='beam'] line",
    "g[class*='vf-stavenote'] line",
    "g[class*='vf-stavenote'] path",
  ];
  for (const selector of blackStrokeSelectors) {
    svg.querySelectorAll(selector).forEach((element) => {
      if (shouldPreserveStaffStroke(element)) return;
      applyBlackStrokePresentation(element as SVGElement);
    });
  }

  svg.querySelectorAll('line').forEach((element) => {
    if (shouldPreserveStaffStroke(element)) return;
    if (isBarlineElement(element) || isHorizontalStaffLine(element) || isNotationStrokeElement(element)) {
      return;
    }
    if (!isVerticalStrokeLine(element)) return;
    const parentCls = element.parentElement?.getAttribute('class') ?? '';
    if (parentCls.includes('vf-stave') || parentCls.includes('barline')) {
      return;
    }
    applyBlackStrokePresentation(element as SVGElement);
  });
}

function applyStaffLinePresentationPass(svg: SVGSVGElement): void {
  svg.querySelectorAll("g[class*='vf-stave']").forEach((staveGroup) => {
    staveGroup.querySelectorAll('path, line').forEach((element) => {
      const el = element as SVGElement;
      if (isBarlineElement(el)) {
        el.setAttribute('stroke', '#333');
        el.setAttribute('stroke-width', '1.5');
        return;
      }
      if (isStaffLineCandidate(el)) {
        applyStaffLinePresentation(el);
      }
    });
  });
}

function applyStaffLinePresentation(element: SVGElement): void {
  element.classList.add('drums-export-staff-line');
  element.setAttribute('stroke', DRUMS_SCORE_EXPORT_STAFF_STROKE);
  element.setAttribute('stroke-width', String(DRUMS_SCORE_EXPORT_STAFF_STROKE_WIDTH));
  element.setAttribute('fill', 'none');
  element.style.setProperty('stroke', DRUMS_SCORE_EXPORT_STAFF_STROKE, 'important');
  element.style.setProperty('stroke-width', `${DRUMS_SCORE_EXPORT_STAFF_STROKE_WIDTH}px`, 'important');
}

function isStaffLineCandidate(element: Element): boolean {
  if (element.tagName !== 'path' && element.tagName !== 'line') {
    return false;
  }
  if (isBarlineElement(element) || svgClassIncludesAny(element, ['clef', 'time', 'key', 'stem', 'beam', 'flag', 'notehead'])) {
    return false;
  }
  return isHorizontalStaffLine(element);
}

function shouldPreserveStaffStroke(element: Element): boolean {
  return isInsideVfStave(element) && isStaffLineCandidate(element);
}

/** Inline presentation attrs so blob/canvas rasterization keeps export colors (CSS alone is not enough). */
export function applyDrumsExportSvgInlinePresentation(svg: SVGSVGElement): void {
  applyStaffLinePresentationPass(svg);
  applyBlackStemPresentation(svg);

  svg.querySelectorAll("path[class*='vf-notehead'], ellipse[class*='vf-notehead']").forEach((element) => {
    const el = element as SVGElement;
    el.setAttribute('fill', '#000');
    el.setAttribute('stroke', '#000');
  });

  svg.querySelectorAll('.vf-dot, circle.vf-dot').forEach((element) => {
    const el = element as SVGElement;
    el.setAttribute('fill', '#000');
    el.setAttribute('stroke', '#000');
  });

  svg.querySelectorAll('.drum-symbol path, .drum-symbol circle').forEach((element) => {
    const el = element as SVGElement;
    if (el.getAttribute('fill') === 'none') {
      el.setAttribute('stroke', '#000');
      return;
    }
    el.setAttribute('fill', '#000');
    el.setAttribute('stroke', '#000');
  });

  svg.querySelectorAll('.tie-curve').forEach((element) => {
    const el = element as SVGElement;
    el.setAttribute('stroke', '#000');
    el.setAttribute('stroke-width', '2');
    el.setAttribute('fill', 'none');
  });

  // Re-assert staff grey after stem pass in case any selector overlapped.
  applyStaffLinePresentationPass(svg);
}
