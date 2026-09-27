/**
 * Text drawn ON a VexFlow score that is not notation — bracket labels, degree
 * numbers, section markers, anything an app adds on top of the music.
 *
 * Every app that has added such text has got the same three things wrong,
 * because a VexFlow SVG is a hostile place to put a word:
 *
 * 1. **The stroke — the one that actually makes it look broken.** VexFlow sets
 *    `stroke="black"` and `stroke-width="1"` on the `<svg>` ROOT, and SVG text
 *    inherits both. So every annotation is painted with a black outline one
 *    user unit thick, which the canvas scale then multiplies: at maqam's 1.77x
 *    that is a 1.77px rim around 8px glyphs, and the word renders as a heavy
 *    black blob whatever `fill` and `font-family` say. This is the fault that
 *    has been misdiagnosed as "the font looks weird" every time it has come
 *    up, and the usual response — reach for a different family, go bolder —
 *    makes it worse. `stroke: none` is the fix, and nothing else is.
 *
 * 2. **The font.** VexFlow sets `font-family: Bravura` on the `<svg>` root, so
 *    a bare `<text>` inherits a music font with no lowercase worth reading.
 *    Authors notice and hardcode a stack — and hardcode the WRONG one, because
 *    each app themes its own family. Maqam Playground shipped labels in Inter
 *    600 on a page set entirely in Roboto; it looked like a foreign object,
 *    which is exactly what it was. The fix is to take the family from the host
 *    element, so the answer is whatever the app is actually using.
 *
 * 3. **The size.** `SVGContext.scale` implements zoom by shrinking the viewBox
 *    against fixed width/height attributes, so everything inside is in
 *    PRE-SCALE user units. An author writing `font-size: 11` gets 11 × the live
 *    scale on screen — 19.5px in maqam's case — and then tunes the number until
 *    it looks right at one window width, where it silently breaks at every
 *    other. `sizePx` here means CSS pixels on screen, at any scale.
 *
 * None of the three is visible in review: the code reads as if it sets a colour,
 * a font and a size, and it does — they are just not the ones that reach the
 * screen.
 */

/** A font stack to fall back to when the host has not resolved one yet. */
const FALLBACK_STACK =
  'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

/**
 * A family VexFlow itself set, which is never what an annotation wants.
 * Bravura and Academico ship with VexFlow; Petaluma and Leland are the other
 * SMuFL faces it supports.
 */
const MUSIC_FONT = /bravura|academico|petaluma|leland|gonville/i;

export interface VexFlowAnnotationOptions {
  /** The text to draw. */
  text: string;
  /** Horizontal centre, in VexFlow user units. */
  x: number;
  /** Baseline, in VexFlow user units. */
  y: number;
  /** Size in CSS pixels ON SCREEN. Converted to user units here. */
  sizePx: number;
  /** CSS font-weight. Defaults to 500, M3's label weight. */
  weight?: number | string;
  /** Fill colour. Defaults to `currentColor`, so the host's ink wins. */
  color?: string;
  /** `text-anchor`. Defaults to `middle`, since x is described as the centre. */
  anchor?: 'start' | 'middle' | 'end';
}

/**
 * The scale `SVGContext` is currently drawing at: user units per CSS pixel.
 *
 * Read from the SVG rather than passed in, because the caller's `scale` option
 * and the scale VexFlow actually applied have come apart before — the staff
 * clip bug was exactly that. The element on the page is the only honest source.
 *
 * Returns 1 when the SVG has no usable viewBox, which draws at 1:1 rather than
 * dividing by zero and collapsing the text to nothing.
 */
export function vexFlowUserUnitsPerPixel(svg: SVGSVGElement): number {
  const view = svg.viewBox.baseVal;
  const width = Number(svg.getAttribute('width'));
  if (!view || view.width <= 0 || !Number.isFinite(width) || width <= 0) return 1;
  return view.width / width;
}

/**
 * The font family the host page is set in.
 *
 * Walks up from the SVG until it finds an element whose computed family is not
 * one of VexFlow's music faces — the SVG's own family is always Bravura, and
 * its parent is the app.
 */
export function vexFlowAnnotationFontFamily(svg: SVGSVGElement): string {
  if (typeof getComputedStyle !== 'function') return FALLBACK_STACK;
  let node: Element | null = svg.parentElement;
  for (let depth = 0; node && depth < 8; depth += 1) {
    const family = getComputedStyle(node).fontFamily;
    if (family && !MUSIC_FONT.test(family)) return family;
    node = node.parentElement;
  }
  return FALLBACK_STACK;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * A `<text>` node in the host app's own typeface, sized in real pixels.
 *
 * Not appended anywhere — the caller decides which group it belongs to and in
 * what order, which matters because VexFlow redraws by replacing children.
 */
export function createVexFlowAnnotation(
  svg: SVGSVGElement,
  options: VexFlowAnnotationOptions,
): SVGTextElement {
  const node = document.createElementNS(SVG_NS, 'text');
  node.setAttribute('x', String(options.x));
  node.setAttribute('y', String(options.y));
  node.setAttribute('text-anchor', options.anchor ?? 'middle');
  node.setAttribute('fill', options.color ?? 'currentColor');
  /* The important line. Without it the glyphs inherit the root's black
     1-unit stroke and render as an outlined blob — see the module comment. */
  node.setAttribute('stroke', 'none');
  node.setAttribute('font-family', vexFlowAnnotationFontFamily(svg));
  node.setAttribute(
    'font-size',
    String(options.sizePx * vexFlowUserUnitsPerPixel(svg)),
  );
  node.setAttribute('font-weight', String(options.weight ?? 500));
  /* Annotations are decoration over an SVG the host already labels; a screen
     reader reaching them would read the music twice, once as notation and once
     as a pile of loose words. */
  node.setAttribute('aria-hidden', 'true');
  node.textContent = options.text;
  return node;
}

/** A `<path>` in the same coordinate space, with a stroke width in real pixels. */
export function createVexFlowRule(
  svg: SVGSVGElement,
  d: string,
  options: { widthPx: number; color: string },
): SVGPathElement {
  const node = document.createElementNS(SVG_NS, 'path');
  node.setAttribute('d', d);
  node.setAttribute('fill', 'none');
  node.setAttribute('stroke', options.color);
  node.setAttribute(
    'stroke-width',
    String(options.widthPx * vexFlowUserUnitsPerPixel(svg)),
  );
  node.setAttribute('stroke-linecap', 'square');
  return node;
}
