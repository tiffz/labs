import { useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import VexFlow, {
  Annotation,
  AnnotationVerticalJustify,
  Formatter,
  Renderer,
  Stave,
  StaveNote,
  Voice,
} from 'vexflow';
import type { NoteDuration, PianoScore, ScoreNote } from '../../shared/music/scoreTypes';
import { durationToBeats } from '../../shared/music/scoreTypes';
import { pickMelodyPart } from '../../shared/music/melodiaPipeline/partUtils';
import { midiToSolfege } from './MelodiaStaff.utils';

const VEX_DURATIONS: Record<NoteDuration, string> = {
  whole: 'w',
  half: 'h',
  quarter: 'q',
  eighth: '8',
  sixteenth: '16',
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Vex-compatible key/octave glyph for midi (same spelling convention as rendered notes). */
function midiToVexKeyGlyph(midi: number): string {
  const pc = ((midi % 12) + 12) % 12;
  const oct = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[pc]}/${oct}`;
}

function scoreNoteToVexKeys(note: ScoreNote): { keys: string[]; duration: string; isRest: boolean } {
  if (note.rest || note.pitches.length === 0) {
    const d = VEX_DURATIONS[note.duration];
    return {
      keys: ['b/4'],
      duration: note.dotted ? `${d}dr` : `${d}r`,
      isRest: true,
    };
  }
  const keys = note.pitches.map((midi) => midiToVexKeyGlyph(midi));
  const d = VEX_DURATIONS[note.duration];
  return { keys, duration: note.dotted ? `${d}d` : d, isRest: false };
}

export interface MelodiaNoteFrame {
  index: number;
  /** Absolute x in svg coords (note head center). */
  x: number;
  /** Absolute y of the (top key's) head in svg coords. */
  yMid: number;
  midi: number;
  durSec: number;
  tSec: number;
}

export interface MelodiaStaffLayout {
  noteFrames: MelodiaNoteFrame[];
  width: number;
  height: number;
  staveX: number;
  staveWidth: number;
  totalDurSec: number;
  yForMidi: (midi: number) => number;
}

export interface MelodiaStaffProps {
  score: PianoScore;
  width?: number;
  height?: number;
  showSolfege?: boolean;
  solfegeOpacity?: number;
  highlightIndex?: number | null;
  onLayout?: (layout: MelodiaStaffLayout) => void;
  children?: ReactNode;
}

interface DrawResult {
  layout: MelodiaStaffLayout;
}

function drawStaff(
  container: HTMLDivElement,
  score: PianoScore,
  width: number,
  height: number,
  showSolfege: boolean,
): DrawResult {
  container.innerHTML = '';
  const renderer = new Renderer(container, Renderer.Backends.SVG);
  renderer.resize(width, height);
  const ctx = renderer.getContext();
  const part = pickMelodyPart(score);
  const first = part.measures[0]?.notes ?? [];
  const tickables: StaveNote[] = [];
  const annotations: string[] = [];
  for (const n of first) {
    const { keys, duration } = scoreNoteToVexKeys(n);
    const note = new StaveNote({ keys, duration, autoStem: true });
    if (showSolfege && !n.rest && n.pitches.length > 0) {
      const label = midiToSolfege(n.pitches[0]!, score.key);
      if (label) {
        const a = new Annotation(label).setVerticalJustification(
          AnnotationVerticalJustify.BOTTOM,
        );
        note.addModifier(a, 0);
        annotations.push(label);
      } else {
        annotations.push('');
      }
    } else {
      annotations.push('');
    }
    tickables.push(note);
  }
  const staveX = 10;
  const staveWidth = width - 20;
  const stave = new Stave(staveX, 30, staveWidth);
  stave.addClef('treble');
  stave.addTimeSignature(`${score.timeSignature.numerator}/${score.timeSignature.denominator}`);
  stave.addKeySignature(score.key);
  stave.setContext(ctx).draw();
  if (tickables.length > 0) {
    const numBeats =
      score.timeSignature.numerator * (4 / score.timeSignature.denominator);
    const voice = new Voice({ numBeats, beatValue: 4 });
    voice.setStrict(false);
    voice.addTickables(tickables);
    new Formatter().joinVoices([voice]).format([voice], staveWidth - 20);
    voice.draw(ctx, stave);
  }

  const svg = container.querySelector('svg');
  svg?.classList.add('melodia-staff-svg');
  if (svg) {
    svg.setAttribute('aria-hidden', 'true');
  }

  const noteEls = container.querySelectorAll('g.vf-stavenote');
  noteEls.forEach((el, i) => {
    el.setAttribute('data-note-index', String(i));
  });

  const bpm = score.tempo || 72;
  const secPerQuarter = 60 / bpm;
  const noteFrames: MelodiaNoteFrame[] = [];
  let tCursor = 0;
  for (let i = 0; i < tickables.length; i += 1) {
    const tickable = tickables[i]!;
    const sourceNote = first[i]!;
    const beats = durationToBeats(sourceNote.duration, sourceNote.dotted);
    const durSec = beats * secPerQuarter;
    if (!sourceNote.rest && sourceNote.pitches.length > 0) {
      const midi = sourceNote.pitches[0]!;
      const x = tickable.getAbsoluteX();
      const yMid = (tickable.getYs?.()[0] ?? 0) || 0;
      noteFrames.push({ index: i, x, yMid, midi, durSec, tSec: tCursor });
    }
    tCursor += durSec;
  }

  const totalDurSec = tCursor;

  /** Vertical position for sung MIDI aligned with Vex staff geometry (chromatic pitches, ledger lines). */
  const clef = stave.getClef() ?? 'treble';
  const yForMidi = (midi: number): number => {
    try {
      const glyph = midiToVexKeyGlyph(midi);
      const kp = VexFlow.keyProperties(glyph, clef);
      return stave.getYForNote(kp.line);
    } catch {
      if (noteFrames.length === 0) return height / 2;
      const ref = noteFrames[0]!;
      return ref.yMid;
    }
  };

  return {
    layout: {
      noteFrames,
      width,
      height,
      staveX,
      staveWidth,
      totalDurSec,
      yForMidi,
    },
  };
}

/**
 * Treble staff renderer for the first measure of `score`.
 *
 * Notable behaviour:
 * - Tags every rendered note head with `data-note-index="i"` so overlays
 *   (ink trace, heat map, glow) can target it without re-walking VexFlow.
 * - Optionally renders movable-do solfège labels under each note.
 * - Reports a layout `{ noteFrames, yForMidi, ... }` via `onLayout` after every
 *   render so callers can place SVG overlays in the same coordinate system.
 */
export default function MelodiaStaff({
  score,
  width = 480,
  height,
  showSolfege = false,
  solfegeOpacity = 1,
  highlightIndex = null,
  onLayout,
  children,
}: MelodiaStaffProps): ReactElement {
  const hostRef = useRef<HTMLDivElement>(null);
  const onLayoutRef = useRef(onLayout);
  onLayoutRef.current = onLayout;
  const computedHeight = height ?? Math.round(width * 0.36);
  const [layoutTick, setLayoutTick] = useState(0);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    let cancelled = false;
    void (async () => {
      try {
        await VexFlow.loadFonts('Bravura', 'Academico');
        VexFlow.setFonts('Bravura', 'Academico');
      } catch {
        /* Non-fatal: draw may still succeed from embedded font data */
      }
      if (cancelled) return;
      const host = hostRef.current;
      if (!host) return;
      const { layout } = drawStaff(host, score, width, computedHeight, showSolfege);
      onLayoutRef.current?.(layout);
      setLayoutTick((t) => t + 1);
    })();
    return () => {
      cancelled = true;
    };
  }, [score, width, computedHeight, showSolfege]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    el.querySelectorAll('text.vf-Annotation, text.vf-annotation').forEach((node) => {
      (node as SVGTextElement).style.opacity = String(Math.max(0, Math.min(1, solfegeOpacity)));
    });
  }, [solfegeOpacity, layoutTick]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    el.querySelectorAll('g.vf-stavenote.melodia-note-glow').forEach((g) => {
      g.classList.remove('melodia-note-glow');
    });
    if (highlightIndex === null || highlightIndex === undefined) return;
    const target = el.querySelector(`g.vf-stavenote[data-note-index="${String(highlightIndex)}"]`);
    if (target) target.classList.add('melodia-note-glow');
  }, [highlightIndex, layoutTick]);

  const wrapperSx = useMemo(
    () => ({ maxWidth: width, mx: 'auto', width: '100%', position: 'relative' as const }),
    [width],
  );

  return (
    <Box className="melodia-staff-stack" sx={wrapperSx}>
      <Box ref={hostRef} sx={{ width: '100%' }} />
      {children}
    </Box>
  );
}
