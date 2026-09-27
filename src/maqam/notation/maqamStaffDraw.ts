import { Accidental, Beam, BoundingBox, Formatter, Renderer, Stave, StaveNote, Voice } from 'vexflow';

import { ensureVexFlowFontsLoaded } from '../../shared/vexflow/vexFlowFontExport';
import {
  spellingAriaLabel,
  vexflowKey,
  type MaqamAccidentalCode,
  type MaqamLetter,
} from './maqamAccidentals';

export interface StaffNote {
  letter: MaqamLetter;
  accidental: MaqamAccidentalCode;
  /** Written octave — 4 is the octave starting at middle C. */
  octave: number;
  /** VexFlow duration code. Defaults to a quarter note. */
  duration?: string;
}

export interface DrawStaffOptions {
  width: number;
  height: number;
  /**
   * Uniform scale for the whole drawing, so the notation grows into the space
   * the layout gives it instead of sitting small in a tall box. VexFlow lays
   * out at a fixed stave size, so this is a canvas transform rather than a
   * different layout.
   */
  scale?: number;
  /**
   * Indices into `notes` to draw as lit. Used to show which degree of the scale
   * the key you are holding corresponds to — the link between the keyboard and
   * the page that makes the notation legible.
   */
  highlighted?: ReadonlySet<number>;
  /** Colour for lit noteheads. Defaults to the app's retuned amber. */
  highlightColor?: string;
  /**
   * Ajnas to bracket above the staff, as inclusive index ranges into `notes`.
   *
   * This is the one place the app draws a cell rather than listing it. A maqam
   * is not a scale with a name; it is two or three ajnas joined at a shared
   * degree, and until the brackets were here the reader had a panel saying
   * "Jins Rast on C, Jins Upper Rast on G" beside eight undifferentiated
   * noteheads, with nothing connecting the two.
   */
  brackets?: StaffBracket[];
}

export interface StaffBracket {
  label: string;
  /** Inclusive index into `notes`. */
  from: number;
  /** Inclusive index into `notes`. */
  to: number;
}

/** Breathing room kept above and below the drawn extent, in CSS px. */
const EDGE_PAD = 6;

/*
 * The same ink blue the keyboard paints a sounding key with.
 *
 * It used to be amber, which is the app's "this pitch is bent off equal
 * temperament" colour — so during playback the screen showed an amber notehead
 * and blue keys for one event, and the amber matched the retuned-key mark
 * exactly. One fact, one channel: blue is sounding.
 */
const DEFAULT_HIGHLIGHT = '#1d5b82';
const INK = '#241d16';
const EMPTY_HIGHLIGHT: ReadonlySet<number> = new Set<number>();

/**
 * Draw a single-stave run of notes into `container`, after the Bravura music
 * font has loaded.
 *
 * VexFlow 5 paints noteheads as SVG `<text>` in a SMuFL font that registers
 * asynchronously; drawing before it resolves renders them in a system fallback,
 * offset from anything positioned at the formatter's coordinates. The gate is
 * awaited *here* rather than left to callers so the guarantee travels with the
 * function — `vexFlowMusicFontGateGuardrails.test.ts` enrols this file
 * automatically by finding `new Renderer(`, and a caller that forgot the hook
 * would otherwise still flash fallback glyphs.
 *
 * Callers should *also* use `useVexFlowMusicFontReady()` to avoid rendering an
 * empty box while the font loads; the two are complementary, not redundant.
 */
export async function drawMaqamStaff(
  container: HTMLDivElement,
  notes: StaffNote[],
  options: DrawStaffOptions,
): Promise<number | undefined> {
  await ensureVexFlowFontsLoaded().catch(() => {
    // Draw in the fallback rather than leave the staff blank forever.
  });
  // The await gives React time to unmount the container or start a newer draw.
  if (!container.isConnected) return undefined;
  return drawStaffNow(container, notes, options);
}

/** @returns the height the drawing needs, or `undefined` if it cannot be measured. */
function drawStaffNow(
  container: HTMLDivElement,
  notes: StaffNote[],
  options: DrawStaffOptions,
): number | undefined {
  container.replaceChildren();

  const renderer = new Renderer(container, Renderer.Backends.SVG);
  renderer.resize(options.width, options.height);
  const context = renderer.getContext();

  const scale = options.scale && options.scale > 0 ? options.scale : 1;
  if (scale !== 1) context.scale(scale, scale);
  // Everything below lays out in pre-scale units, so the stave must be told the
  // width it actually has after the transform.
  const innerWidth = options.width / scale;

  const stave = new Stave(4, 0, innerWidth - 12);
  stave.addClef('treble');
  stave.setContext(context).draw();

  if (notes.length === 0) {
    applyStaffAccessibility(container, notes);
    return fitToDrawnExtent(container, verticalExtentOf(stave, []));
  }

  const lit = options.highlighted ?? EMPTY_HIGHLIGHT;
  const litColor = options.highlightColor ?? DEFAULT_HIGHLIGHT;

  const staveNotes = notes.map((note, index) => {
    const staveNote = new StaveNote({
      keys: [vexflowKey(note, note.octave)],
      duration: note.duration ?? 'q',
    });
    if (note.accidental !== 'n') {
      staveNote.addModifier(new Accidental(note.accidental), 0);
    }
    if (lit.has(index)) {
      // Colour the whole note — head, stem and accidental — so a lit degree
      // reads at a glance rather than needing a hunt for a tinted notehead.
      staveNote.setStyle({ fillStyle: litColor, strokeStyle: litColor });
      staveNote
        .getModifiers()
        .forEach((modifier) => modifier.setStyle({ fillStyle: litColor, strokeStyle: litColor }));
    } else {
      staveNote.setStyle({ fillStyle: INK, strokeStyle: INK });
    }
    return staveNote;
  });

  // An explicit Voice with strict timing off. A melody here is a phrase, not a
  // metrical bar — the scale is 8 quarter notes and a generated phrase is
  // whatever adds up to 2 bars — and neither should be rejected for not
  // totalling one measure.
  const voice = new Voice({ numBeats: staveNotes.length, beatValue: 4 });
  voice.setStrict(false);
  voice.addTickables(staveNotes);

  new Formatter().joinVoices([voice]).format([voice], Math.max(innerWidth - 80, 40));

  /*
   * Generate the beams BEFORE the voice draws, and draw them after.
   *
   * `Beam.generateBeams` is what clears each note's flag — a beamed eighth note
   * has no flag of its own. Generating after `voice.draw()` left every note
   * already painted with its flag, so the staff showed twelve flagged eighths
   * AND a beam floating across their stems: notation a music student would be
   * marked wrong for writing, on five of the eight patterns in all 9 families.
   * The order is the one in .agents/rules/playback-ui-regressions.md.
   */
  const beams = Beam.generateBeams(staveNotes);
  voice.draw(context, stave);
  for (const beam of beams) {
    beam.setContext(context).draw();
  }

  const extent = verticalExtentOf(stave, [...staveNotes, ...beams]);
  const bracketTop = drawAjnasBrackets(
    container,
    stave,
    staveNotes,
    options.brackets ?? [],
    extent,
  );

  applyStaffAccessibility(container, notes);
  return fitToDrawnExtent(
    container,
    bracketTop === undefined || extent === undefined
      ? extent
      : { top: Math.min(extent.top, bracketTop), bottom: extent.bottom },
  );
}

/**
 * Square brackets over the staff, one per jins, the way maqamworld draws them.
 *
 * Geometry is in staff spaces rather than pixels, so it survives the canvas
 * scale the layout applies: rule 0.18 spaces thick, end ticks 0.55 spaces
 * deep, label one space above the rule. Those are measured off maqamworld's
 * own jins diagrams.
 *
 * Two cells that share exactly one degree — the ghammaz, which is how nearly
 * every maqam here is put together — both terminate ON that notehead, because
 * that shared note IS the fact. Cells that overlap by two or more get their
 * own row, so the overlap reads as an overlap instead of as one long rule.
 *
 * The labels are plain text, not links. The same jins name is a link to
 * maqamworld in the panel three inches to the right; a second copy of one link
 * inside an `aria-hidden` image would be a duplicate the screen reader could
 * not reach anyway.
 *
 * @returns the topmost y the brackets occupy, so the SVG viewport can grow to
 * hold them — or `undefined` when nothing was drawn.
 */
function drawAjnasBrackets(
  container: HTMLDivElement,
  stave: Stave,
  staveNotes: StaveNote[],
  brackets: StaffBracket[],
  extent: VerticalExtent | undefined,
): number | undefined {
  const svg = container.querySelector('svg');
  if (!svg || brackets.length === 0 || extent === undefined) return undefined;

  const space = stave.getSpacingBetweenLines();
  const rows = assignBracketRows(brackets);
  const rowHeight = space * 2.6;
  // Clear of the highest ink on the staff, whichever bracket sits lowest.
  const baseY = Math.min(extent.top, stave.getYForLine(0)) - space * 1.4;

  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('class', 'maqam-staff__ajnas');
  let topmost = baseY;

  brackets.forEach((bracket, index) => {
    const first = staveNotes[bracket.from];
    const last = staveNotes[bracket.to];
    if (!first || !last) return;

    const x1 = noteCentreX(first);
    const x2 = noteCentreX(last);
    if (!Number.isFinite(x1) || !Number.isFinite(x2) || x2 <= x1) return;

    const y = baseY - rows[index] * rowHeight;
    const tick = space * 0.55;

    group.appendChild(
      svgNode('path', {
        d: `M ${x1} ${y + tick} L ${x1} ${y} L ${x2} ${y} L ${x2} ${y + tick}`,
        fill: 'none',
        stroke: BRACKET_INK,
        'stroke-width': String(space * 0.18),
        'stroke-linecap': 'square',
      }),
    );

    const label = svgNode('text', {
      x: String((x1 + x2) / 2),
      y: String(y - space * 0.55),
      'text-anchor': 'middle',
      fill: BRACKET_INK,
      'font-size': String(space * 1.1),
      /*
       * Named, not inherited. VexFlow sets a serif music family on the <svg>
       * root, so `inherit` drew the jins names in Bravura's text face —
       * cramped, and reading as part of the notation rather than as a label
       * on it.
       */
      'font-family': BRACKET_FONT,
      'font-weight': '600',
      'letter-spacing': String(space * 0.02),
    });
    label.textContent = bracket.label;
    group.appendChild(label);

    topmost = Math.min(topmost, y - space * 1.9);
  });

  if (group.childNodes.length === 0) return undefined;
  svg.appendChild(group);
  return topmost;
}

/**
 * Which row each bracket draws on.
 *
 * Sharing one degree is the normal case and stays on a single row — the two
 * rules meet at the ghammaz and the seam is visible. Sharing two or more
 * degrees means the cells genuinely overlap, and drawing that on one row would
 * render two different facts as one continuous rule.
 */
function assignBracketRows(brackets: StaffBracket[]): number[] {
  const rows: number[] = [];
  brackets.forEach((bracket, index) => {
    let row = 0;
    for (let other = 0; other < index; other += 1) {
      const overlap =
        Math.min(bracket.to, brackets[other].to) - Math.max(bracket.from, brackets[other].from) + 1;
      if (overlap >= 2 && rows[other] === row) row += 1;
    }
    rows.push(row);
  });
  return rows;
}

/** Centre of a notehead, ignoring the accidental hanging off its left. */
function noteCentreX(note: StaveNote): number {
  return (note.getNoteHeadBeginX() + note.getNoteHeadEndX()) / 2;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const BRACKET_INK = '#7a4250';
const BRACKET_FONT =
  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

function svgNode(tag: string, attributes: Record<string, string>): SVGElement {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  return node;
}

/**
 * Size the SVG to what VexFlow actually drew, rather than to a guess.
 *
 * The height was a constant times the scale, chosen to look right for the
 * ascending scale. A high ledger line, a beam over the top degree, or a
 * three-quarter-flat hanging under the stave all draw outside it, and the SVG
 * viewport clipped them flat — the app silently showed the wrong notation.
 *
 * The extent comes from VexFlow's own layout objects, NOT from `svg.getBBox()`.
 * SMuFL fonts declare an enormous em box — Bravura's spans far more than the
 * glyph's ink — so every notehead `<text>` reports the same 161-unit height
 * whatever note it draws. Measuring that way made the box half again taller
 * than the music and filled the difference with white.
 *
 * The viewBox is VexFlow's: `SVGContext.scale` implements the zoom by shrinking
 * the viewBox against fixed width and height attributes, so its numbers are
 * pre-scale user units and the ratio between the two is the live scale factor.
 * Only `y` and `height` are touched. Rewriting `width` silently undoes the
 * scale and redraws the whole staff smaller, which is what the first version of
 * this function did: it satisfied "nothing is clipped" by shrinking the
 * notation until it fitted.
 */
interface VerticalExtent {
  top: number;
  bottom: number;
}

/**
 * Vertical span of the music: the five staff lines, plus whatever the notes and
 * beams put above or below them.
 *
 * The stave is measured by its LINES rather than by its bounding box, because
 * that box reserves four line-spaces of empty margin above and below — room for
 * ledger lines that may not exist. Including it left the staff sitting in a
 * pool of white that scaled up with the notation.
 */
function verticalExtentOf(
  stave: Stave,
  elements: { getBoundingBox(): BoundingBox | undefined }[],
): VerticalExtent | undefined {
  let top = stave.getYForLine(0);
  let bottom = stave.getYForLine(4);
  if (!Number.isFinite(top) || !Number.isFinite(bottom)) return undefined;

  for (const element of elements) {
    const box = element.getBoundingBox();
    if (!box) continue;
    top = Math.min(top, box.getY());
    bottom = Math.max(bottom, box.getY() + box.getH());
  }

  if (bottom <= top) return undefined;
  return { top, bottom };
}

function fitToDrawnExtent(container: HTMLElement, extent: VerticalExtent | undefined): number | undefined {
  const svg = container.querySelector('svg');
  if (!svg || !extent) return undefined;

  const view = svg.viewBox.baseVal;
  const widthAttr = Number(svg.getAttribute('width'));
  if (!view || view.width <= 0 || !Number.isFinite(widthAttr) || widthAttr <= 0) {
    return undefined;
  }

  // User units in, device pixels out.
  const scale = widthAttr / view.width;
  const top = Math.floor(extent.top - EDGE_PAD);
  const innerHeight = Math.ceil(extent.bottom - extent.top + EDGE_PAD * 2);
  const height = Math.round(innerHeight * scale);

  svg.setAttribute('viewBox', `${view.x} ${top} ${view.width} ${innerHeight}`);
  svg.setAttribute('height', String(height));
  svg.style.height = `${height}px`;
  return height;
}

/**
 * VexFlow emits bare SVG with no accessible name, so a screen reader reads the
 * staff as nothing at all.
 *
 * The name goes on the CONTAINER, not the SVG. The SVG only exists once the
 * music font has resolved, and labelling both meant a screen reader announced
 * the whole note list twice — once for the container's own text, once for the
 * image. One name, on the element that is always there.
 */
function applyStaffAccessibility(container: HTMLElement, notes: StaffNote[]): void {
  container.setAttribute('role', 'img');
  container.setAttribute('aria-label', describeStaff(notes));
  const svg = container.querySelector('svg');
  if (!svg) return;
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
}

export function describeStaff(notes: StaffNote[]): string {
  if (notes.length === 0) return 'Empty staff';
  return notes.map((note) => `${spellingAriaLabel(note)} ${note.octave}`).join(', ');
}
