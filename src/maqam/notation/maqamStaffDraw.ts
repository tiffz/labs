import { Accidental, Beam, Formatter, Renderer, Stave, StaveNote, Voice } from 'vexflow';

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
}

const DEFAULT_HIGHLIGHT = '#a9661a';
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
): Promise<void> {
  await ensureVexFlowFontsLoaded().catch(() => {
    // Draw in the fallback rather than leave the staff blank forever.
  });
  // The await gives React time to unmount the container or start a newer draw.
  if (!container.isConnected) return;
  drawStaffNow(container, notes, options);
}

function drawStaffNow(
  container: HTMLDivElement,
  notes: StaffNote[],
  options: DrawStaffOptions,
): void {
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
    return;
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
  voice.draw(context, stave);

  // Beams after the voice draws, or the stems they attach to do not exist yet.
  // Without these, a run of eighth notes renders as a row of flagged singletons
  // and reads as unrelated notes rather than as a phrase.
  for (const beam of Beam.generateBeams(staveNotes)) {
    beam.setContext(context).draw();
  }

  applyStaffAccessibility(container, notes);
}

/**
 * VexFlow emits bare SVG with no accessible name, so a screen reader reads the
 * staff as nothing at all. Label the SVG with the notes it draws.
 */
function applyStaffAccessibility(container: HTMLElement, notes: StaffNote[]): void {
  const svg = container.querySelector('svg');
  if (!svg) return;
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', describeStaff(notes));
  svg.setAttribute('focusable', 'false');
}

export function describeStaff(notes: StaffNote[]): string {
  if (notes.length === 0) return 'Empty staff';
  return notes.map((note) => `${spellingAriaLabel(note)} ${note.octave}`).join(', ');
}
