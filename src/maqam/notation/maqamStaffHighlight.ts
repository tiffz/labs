import { staffInks } from './maqamStaffInks';

/*
 * Everything below exists so that PLAYING A NOTE DOES NOT REDRAW THE STAVE.
 *
 * Highlighting used to be an argument to the draw, which meant every key press
 * re-ran VexFlow's whole layout. Measured on the real app: ~29ms of render and
 * paint per note, and 8 staff DOM mutations per note. That is the latency a
 * musician feels, because Web MIDI delivers its messages on the main thread —
 * so the next note cannot even enter its handler until the previous note's
 * notation has finished redrawing. Fast passages queue up behind the stave.
 *
 * So the stave is laid out when the MUSIC changes, and lighting a note is a
 * handful of attribute writes on the SVG that is already there.
 */

/** VexFlow wraps each note in this; the order matches the notes we drew. */
const NOTE_GROUP = 'g.vf-stavenote';

/**
 * Tag each drawn note with its index, and remember the colour it was drawn in
 * so the highlight can be taken back off again.
 *
 * The resting colour is read from the DOM rather than recomputed, because
 * VexFlow decides which elements a note is actually made of — head, stem,
 * accidental, ledger lines — and that list is not ours to predict.
 */
export function indexDrawnNotes(container: HTMLElement): void {
  container.querySelectorAll(NOTE_GROUP).forEach((group, index) => {
    group.setAttribute('data-note-index', String(index));
    group.querySelectorAll('path, text, rect').forEach((el) => {
      const fill = el.getAttribute('fill');
      if (fill !== null && fill !== 'none') el.setAttribute('data-rest-fill', fill);
      const stroke = el.getAttribute('stroke');
      if (stroke !== null && stroke !== 'none') el.setAttribute('data-rest-stroke', stroke);
    });
  });
}

/**
 * Light the given notes on a stave that is already drawn.
 *
 * Cheap enough to run on every note-on: it touches only the elements of the
 * notes whose state actually changed, and never asks VexFlow for anything.
 *
 * Returns the number of notes it found, so a caller can tell "nothing is lit"
 * apart from "the stave is not drawn yet" — the second is not a state worth
 * rendering against.
 */
export function applyStaffHighlight(
  container: HTMLElement,
  lit: ReadonlySet<number>,
  highlightColor?: string,
): number {
  const groups = container.querySelectorAll(NOTE_GROUP);
  if (groups.length === 0) return 0;
  const litColor = highlightColor ?? staffInks(container).lit;

  groups.forEach((group) => {
    const index = Number(group.getAttribute('data-note-index'));
    const on = lit.has(index);
    // Idempotent, so re-running with an unchanged set costs one attribute read
    // per note rather than a write per element.
    if ((group.getAttribute('data-lit') === 'true') === on) return;
    group.setAttribute('data-lit', String(on));
    group.querySelectorAll('[data-rest-fill], [data-rest-stroke]').forEach((el) => {
      const restFill = el.getAttribute('data-rest-fill');
      if (restFill !== null) el.setAttribute('fill', on ? litColor : restFill);
      const restStroke = el.getAttribute('data-rest-stroke');
      if (restStroke !== null) el.setAttribute('stroke', on ? litColor : restStroke);
    });
  });
  return groups.length;
}
