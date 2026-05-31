/**
 * Shared SVG paint helpers for playback highlight sync across VexFlow renderers.
 * See PLAYBACK_RENDERING_AUDIT.md § highlight sync helper.
 */

export type SvgColorFillMode = 'force' | 'auto' | 'none';

/** Apply stroke/fill color to one SVG element (VexFlow note groups, symbols, paths). */
export function setSvgElementColor(
  element: Element,
  color: string,
  fillMode: SvgColorFillMode = 'auto',
): void {
  const svgElement = element as SVGElement;
  const fillAttr = element.getAttribute('fill');
  const strokeAttr = element.getAttribute('stroke');
  const styleFill = svgElement.style.fill;

  element.setAttribute('stroke', color);
  svgElement.style.setProperty('stroke', color, 'important');

  if (fillMode === 'none') return;
  if (
    fillMode === 'force' ||
    (fillMode === 'auto' &&
      ((fillAttr !== null && fillAttr !== 'none') ||
        (styleFill.length > 0 && styleFill !== 'none')))
  ) {
    if (fillAttr !== 'none') {
      element.setAttribute('fill', color);
    }
    svgElement.style.setProperty('fill', color, 'important');
  } else if (strokeAttr === null && fillAttr === null) {
    svgElement.style.setProperty('fill', color, 'important');
  }
}

/** Paint paths/circles under a symbol group (drum symbols: stroke-driven). */
export function paintSvgDescendants(
  root: Element,
  color: string,
  selector: string,
  fillMode: SvgColorFillMode = 'auto',
): void {
  root.querySelectorAll(selector).forEach((part) => {
    setSvgElementColor(part, color, fillMode);
  });
}

/**
 * Toggle fill/stroke on a VexFlow note group.
 * Noteheads are `<text>`; stems/ledger lines are `<path>`.
 */
export function setVexFlowNoteGroupColor(groupEl: SVGElement, color: string): void {
  groupEl.querySelectorAll<SVGElement>('text').forEach((el) => {
    el.setAttribute('fill', color);
  });
  groupEl.querySelectorAll<SVGElement>('path').forEach((el) => {
    const stroke = el.getAttribute('stroke');
    if (stroke && stroke !== 'none' && stroke !== 'transparent') {
      el.setAttribute('stroke', color);
    }
  });
}

export type KeyedHighlightSyncOptions = {
  elementMap: Map<string, SVGElement>;
  activeKeys: Set<string>;
  previousKeysRef: { current: Set<string> };
  highlightColor: string;
  defaultColor: string;
  applyColor?: (el: SVGElement, color: string) => void;
};

/**
 * Diff previous vs active keyed highlights without rebuilding SVG.
 * Used by Chords and similar keyed note-group maps.
 * After replacing `elementMap` (full SVG redraw), clear `previousKeysRef` first so active keys re-paint.
 */
export function syncKeyedSvgHighlights({
  elementMap,
  activeKeys,
  previousKeysRef,
  highlightColor,
  defaultColor,
  applyColor = setVexFlowNoteGroupColor,
}: KeyedHighlightSyncOptions): void {
  const prev = previousKeysRef.current;

  prev.forEach((key) => {
    if (!activeKeys.has(key)) {
      const el = elementMap.get(key);
      if (el) applyColor(el, defaultColor);
    }
  });

  activeKeys.forEach((key) => {
    if (!prev.has(key)) {
      const el = elementMap.get(key);
      if (el) applyColor(el, highlightColor);
    }
  });

  previousKeysRef.current = new Set(activeKeys);
}

/** Re-apply highlight on a single key after element-map replacement (post-redraw). */
export function reapplyActiveKeyHighlight(
  elementMap: Map<string, SVGElement>,
  activeKey: string | null,
  applyHighlight: (el: SVGElement) => void,
): void {
  if (!activeKey) return;
  const el = elementMap.get(activeKey);
  if (el) applyHighlight(el);
}

export type HighlightMiniNoteOptions = {
  highlightColor: string;
  noteX: number;
  isBeamed: boolean;
  staveBottomY?: number;
  /** Optional VexFlow stem SVG from `StaveNote.getStem()?.getSVGElement()`. */
  stemSvg?: SVGElement | null;
};

/**
 * Post-draw highlight for read-only mini notation (DrumNotationMini).
 * Marks the note group and paints noteheads, stems, and beamed stem lines.
 */
export function highlightVexFlowMiniNoteGroup(
  noteEl: SVGElement,
  svg: SVGSVGElement,
  options: HighlightMiniNoteOptions,
): void {
  const { highlightColor, noteX, isBeamed, staveBottomY, stemSvg } = options;

  noteEl.setAttribute('data-highlighted', 'true');
  noteEl.querySelectorAll('*').forEach((el) => {
    const svgEl = el as SVGElement;
    const tagName = svgEl.tagName.toLowerCase();
    if (tagName === 'g' || tagName === 'defs') return;
    setSvgElementColor(svgEl, highlightColor, 'auto');
  });

  if (staveBottomY !== undefined) {
    svg.querySelectorAll('path').forEach((pathEl) => {
      const bbox = (pathEl as SVGGraphicsElement).getBBox?.();
      if (!bbox || bbox.width <= 0 || bbox.height <= 0) return;
      const pathX = bbox.x + bbox.width / 2;
      const pathY = bbox.y + bbox.height / 2;
      const fill = pathEl.getAttribute('fill');
      if (
        fill &&
        fill !== 'none' &&
        Math.abs(pathX - noteX) < 12 &&
        Math.abs(pathY - staveBottomY) < 25 &&
        bbox.width < 20 &&
        bbox.height < 20
      ) {
        pathEl.style.setProperty('fill', highlightColor, 'important');
      }
    });
  }

  if (stemSvg) {
    stemSvg.querySelectorAll('*').forEach((el) => {
      setSvgElementColor(el, highlightColor, 'auto');
    });
    setSvgElementColor(stemSvg, highlightColor, 'auto');
  }

  svg.querySelectorAll('.vf-stem, [class*="stem"]').forEach((el) => {
    const bbox = (el as SVGGraphicsElement).getBBox?.();
    if (!bbox) return;
    const elX = bbox.x + bbox.width / 2;
    if (Math.abs(elX - noteX) < 12) {
      setSvgElementColor(el, highlightColor, 'auto');
      el.querySelectorAll('*').forEach((child) => {
        setSvgElementColor(child, highlightColor, 'auto');
      });
    }
  });

  if (!isBeamed) return;

  svg.querySelectorAll('line, rect').forEach((el) => {
    const tagName = el.tagName.toLowerCase();
    if (tagName === 'line') {
      const line = el as SVGLineElement;
      const x1 = parseFloat(line.getAttribute('x1') || '0');
      const x2 = parseFloat(line.getAttribute('x2') || '0');
      const y1 = parseFloat(line.getAttribute('y1') || '0');
      const y2 = parseFloat(line.getAttribute('y2') || '0');
      const isVertical = Math.abs(x2 - x1) < 2;
      const lineHeight = Math.abs(y2 - y1);
      const lineX = (x1 + x2) / 2;
      if (isVertical && lineHeight > 15 && lineHeight < 80 && Math.abs(lineX - noteX) < 10) {
        line.style.setProperty('stroke', highlightColor, 'important');
      }
    } else if (tagName === 'rect') {
      const rect = el as SVGRectElement;
      const bbox = rect.getBBox?.();
      if (!bbox) return;
      const rectX = bbox.x + bbox.width / 2;
      if (bbox.width < 4 && bbox.height > 15 && Math.abs(rectX - noteX) < 10) {
        setSvgElementColor(rect, highlightColor, 'auto');
      }
    }
  });
}
