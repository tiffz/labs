import { Formatter, Renderer, Stave, StaveNote, Voice } from 'vexflow';
import type { NoteDuration, PianoScore, ScoreNote } from './scoreTypes';
import { pickMelodyPart } from './melodiaPipeline/partUtils';

const DUR_VEX: Record<NoteDuration, string> = {
  whole: 'w',
  half: 'h',
  quarter: 'q',
  eighth: '8',
  sixteenth: '16',
};

function scoreNoteToVexKeys(note: ScoreNote): { keys: string[]; duration: string } {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  if (note.rest || note.pitches.length === 0) {
    const d = DUR_VEX[note.duration];
    const dur = note.dotted ? `${d}d` : `${d}r`;
    return { keys: ['b/4'], duration: dur };
  }
  const keys = note.pitches.map((midi) => {
    const pc = ((midi % 12) + 12) % 12;
    const oct = Math.floor(midi / 12) - 1;
    return `${names[pc]}/${oct}`;
  });
  let d = DUR_VEX[note.duration];
  if (note.dotted) d = `${d}d`;
  return { keys, duration: d };
}

/** Renders the first measure of the melody part into `container` (replaces inner HTML). */
export function drawMelodiaFirstMeasurePreview(
  container: HTMLDivElement,
  score: PianoScore,
  width = 520,
  height = 220,
): void {
  container.innerHTML = '';
  const renderer = new Renderer(container, Renderer.Backends.SVG);
  renderer.resize(width, height);
  const ctx = renderer.getContext();
  const part = pickMelodyPart(score);
  const first = part.measures[0]?.notes ?? [];
  const tickables: StaveNote[] = [];
  for (const n of first) {
    const { keys, duration } = scoreNoteToVexKeys(n);
    tickables.push(new StaveNote({ keys, duration, autoStem: true }));
  }
  const stave = new Stave(10, 40, width - 20);
  stave.addClef('treble');
  stave.addTimeSignature(`${score.timeSignature.numerator}/${score.timeSignature.denominator}`);
  stave.addKeySignature(score.key);
  stave.setContext(ctx).draw();
  if (tickables.length === 0) return;
  const numBeats = score.timeSignature.numerator * (4 / score.timeSignature.denominator);
  const voice = new Voice({ numBeats, beatValue: 4 });
  voice.setStrict(false);
  voice.addTickables(tickables);
  new Formatter().joinVoices([voice]).format([voice], width - 40);
  voice.draw(ctx, stave);
}
