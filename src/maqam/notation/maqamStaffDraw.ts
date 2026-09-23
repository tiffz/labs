import { Accidental, Formatter, Renderer, Stave, StaveNote, Voice } from 'vexflow';

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
}

export interface DrawStaffOptions {
  width: number;
  height: number;
}

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

  const stave = new Stave(4, 0, options.width - 12);
  stave.addClef('treble');
  stave.setContext(context).draw();

  if (notes.length === 0) {
    applyStaffAccessibility(container, notes);
    return;
  }

  const staveNotes = notes.map((note) => {
    const staveNote = new StaveNote({
      keys: [vexflowKey(note, note.octave)],
      duration: 'q',
    });
    if (note.accidental !== 'n') {
      staveNote.addModifier(new Accidental(note.accidental), 0);
    }
    return staveNote;
  });

  // An explicit Voice with strict timing off: the reference scale is eight
  // quarter notes — two bars' worth — and the live ribbon is however many notes
  // have been played. Neither is a metrical bar, and neither should be rejected
  // for not adding up to one.
  const voice = new Voice({ numBeats: staveNotes.length, beatValue: 4 });
  voice.setStrict(false);
  voice.addTickables(staveNotes);

  new Formatter().joinVoices([voice]).format([voice], Math.max(options.width - 80, 40));
  voice.draw(context, stave);

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
