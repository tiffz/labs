import React, { useEffect, useRef } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, StaveConnector, Beam, Dot, Annotation, Accidental, Fraction } from 'vexflow';
import type { PianoScore, PracticeNoteResult, ScoreNote } from '../types';
import { DURATION_VEXFLOW, midiToPitchStringForKey } from '../types';

export interface GhostNote {
  midi: number;
  duration: import('../types').NoteDuration;
}

interface ScoreDisplayProps {
  score: PianoScore;
  currentMeasureIndex: number;
  currentNoteIndices: Map<string, number>;
  activeMidiNotes?: Set<number>;
  practiceResultsByNoteId?: Map<string, PracticeNoteResult>;
  greyedOutHands?: Set<string>;
  ghostNotes?: GhostNote[];
}

// --- Practice result colors ---

const RESULT_COLORS = {
  perfect: '#10b981',
  early: '#3b82f6',
  late: '#ef4444',
  missed: '#94a3b8',
};

function applyNoteStyle(
  staveNote: StaveNote,
  note: ScoreNote,
  opts: {
    isGreyed: boolean;
    isCurrent: boolean;
    activeMidiNotes?: Set<number>;
    practiceResult?: PracticeNoteResult;
  },
) {
  if (opts.isGreyed) {
    staveNote.setStyle({ fillStyle: '#cbd5e1', strokeStyle: '#cbd5e1' });
    return;
  }
  if (opts.isCurrent) {
    staveNote.setStyle({ fillStyle: '#7c3aed', strokeStyle: '#7c3aed' });
    return;
  }
  if (opts.practiceResult && !note.rest) {
    const r = opts.practiceResult;
    const color = r.pitchCorrect ? RESULT_COLORS[r.timing] : RESULT_COLORS.missed;
    staveNote.setStyle({ fillStyle: color, strokeStyle: color });
    return;
  }
  if (opts.activeMidiNotes && opts.activeMidiNotes.size > 0 && !note.rest) {
    if (note.pitches.some(p => opts.activeMidiNotes!.has(p))) {
      staveNote.setStyle({ fillStyle: '#10b981', strokeStyle: '#10b981' });
    }
  }
}

// --- Key / accidental helpers ---

const KEY_NORMALIZE: Record<string, string> = {
  'Db': 'Db', 'Eb': 'Eb', 'Gb': 'Gb', 'Ab': 'Ab', 'Bb': 'Bb',
  'C#': 'Db', 'D#': 'Eb', 'F#': 'F#', 'G#': 'Ab', 'A#': 'Bb',
};

function getVexflowKey(key: string): string {
  const n = KEY_NORMALIZE[key] || key;
  const map: Record<string, string> = {
    'C': 'C', 'Db': 'Db', 'D': 'D', 'Eb': 'Eb', 'E': 'E',
    'F': 'F', 'F#': 'F#', 'Gb': 'Gb', 'G': 'G', 'Ab': 'Ab',
    'A': 'A', 'Bb': 'Bb', 'B': 'B',
  };
  return map[n] || 'C';
}

const KEY_SHARPS: Record<string, number> = {
  'C': 0, 'G': 1, 'D': 2, 'A': 3, 'E': 4, 'B': 5, 'F#': 6,
};
const KEY_FLATS: Record<string, number> = {
  'F': 1, 'Bb': 2, 'Eb': 3, 'Ab': 4, 'Db': 5, 'Gb': 6,
};

function getKeySignatureInfo(key: string): number {
  const n = KEY_NORMALIZE[key] || key;
  return (KEY_SHARPS[n] ?? 0) + (KEY_FLATS[n] ?? 0);
}

const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER  = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

function getKeyAccidentalMap(key: string): Map<string, string> {
  const n = KEY_NORMALIZE[key] || key;
  const map = new Map<string, string>();
  if (KEY_SHARPS[n]) {
    for (let i = 0; i < KEY_SHARPS[n]; i++) map.set(SHARP_ORDER[i], '#');
  } else if (KEY_FLATS[n]) {
    for (let i = 0; i < KEY_FLATS[n]; i++) map.set(FLAT_ORDER[i], 'b');
  }
  return map;
}

function createAccidentalTracker(keyAccMap: Map<string, string>) {
  const overrides = new Map<string, string>();
  return {
    reset() { overrides.clear(); },
    getNeeded(pitchStr: string): string | null {
      const match = pitchStr.match(/^([A-G])(b|#)?\/(\d+)$/);
      if (!match) return null;
      const [, letter, acc] = match;
      const noteAcc = acc || '';
      const keyAcc = keyAccMap.get(letter) || '';
      const memoKey = `${letter}`;
      const prev = overrides.get(memoKey);

      if (prev !== undefined) {
        if (prev === noteAcc) return null;
        overrides.set(memoKey, noteAcc);
        return noteAcc || 'n';
      }
      if (noteAcc === keyAcc) return null;
      overrides.set(memoKey, noteAcc);
      return noteAcc || 'n';
    },
  };
}

// --- Beaming ---
function getBeamGroups(timeSig: { numerator: number; denominator: number }): Fraction[] | undefined {
  const { numerator, denominator } = timeSig;
  // Compound meters (numerator divisible by 3 and > 3): group in 3s
  if (numerator > 3 && numerator % 3 === 0) {
    return [new Fraction(3, denominator)];
  }
  // Simple meters: default VexFlow grouping (1 beat = 1/denominator) works fine
  return undefined;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  score, currentMeasureIndex, currentNoteIndices, activeMidiNotes,
  practiceResultsByNoteId, greyedOutHands, ghostNotes,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateKeyRef = useRef('');

  useEffect(() => {
    if (!containerRef.current) return;

    const stateKey = JSON.stringify({
      id: score.id, key: score.key, ts: score.timeSignature,
      parts: score.parts.map(p => p.measures.map(m => m.notes.length)),
      mi: currentMeasureIndex, ni: Array.from(currentNoteIndices.entries()),
      active: activeMidiNotes ? Array.from(activeMidiNotes).sort() : [],
      pr: practiceResultsByNoteId ? Array.from(practiceResultsByNoteId.entries()).map(([k, v]) => `${k}:${v.timing}:${Math.round(v.timingOffsetMs)}`).sort() : [],
      gh: greyedOutHands ? Array.from(greyedOutHands) : [],
      gn: ghostNotes ? ghostNotes.map(g => `${g.midi}:${g.duration}`) : [],
    });
    if (stateKey === stateKeyRef.current) return;
    stateKeyRef.current = stateKey;

    const mainContent = containerRef.current.closest('.main-content') as HTMLElement | null;
    const savedScrollTop = mainContent?.scrollTop ?? 0;
    if (mainContent) mainContent.style.overflowY = 'hidden';

    containerRef.current.innerHTML = '';

    try {
      const rhPart = score.parts.find(p => p.hand === 'right');
      const lhPart = score.parts.find(p => p.hand === 'left');
      if (!rhPart && !lhPart) {
        if (mainContent) { mainContent.style.overflowY = ''; mainContent.scrollTop = savedScrollTop; }
        return;
      }

      const maxMeasures = Math.max(rhPart?.measures.length ?? 0, lhPart?.measures.length ?? 0);
      if (maxMeasures === 0) {
        if (mainContent) { mainContent.style.overflowY = ''; mainContent.scrollTop = savedScrollTop; }
        return;
      }

      const containerWidth = containerRef.current.clientWidth || 900;

      const maxNotesInMeasure = Math.max(
        ...score.parts.flatMap(p => p.measures.map(m => m.notes.length)),
        1
      );
      const minMeasureWidth = Math.max(200, maxNotesInMeasure * 18 + 80);
      const measuresPerLine = Math.min(4, Math.max(1, Math.floor((containerWidth - 40) / minMeasureWidth)));
      const numLines = Math.ceil(maxMeasures / measuresPerLine);

      const lineHeight = 260;
      const staffSpacing = 80;
      const totalHeight = numLines * lineHeight + 60;
      const keySigCount = getKeySignatureInfo(score.key);
      const vexKey = getVexflowKey(score.key);
      const keyAccMap = getKeyAccidentalMap(score.key);

      const rhGreyed = greyedOutHands?.has('right') ?? false;
      const lhGreyed = greyedOutHands?.has('left') ?? false;

      const noteIdToStaveNote = new Map<string, StaveNote>();

      const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
      renderer.resize(containerWidth, totalHeight);
      const context = renderer.getContext();

      for (let lineIdx = 0; lineIdx < numLines; lineIdx++) {
        const startMeasure = lineIdx * measuresPerLine;
        const endMeasure = Math.min(startMeasure + measuresPerLine, maxMeasures);
        const measuresInLine = endMeasure - startMeasure;
        const trebleY = 30 + lineIdx * lineHeight;
        const bassY = trebleY + staffSpacing;

        // --- Proportional measure widths based on note density ---
        const HEADER_EXTRA = 50 + keySigCount * 12 + 35;
        const BASE_WEIGHT = 2;

        const measureWeights: number[] = [];
        for (let mi = startMeasure; mi < endMeasure; mi++) {
          const rhCount = rhPart?.measures[mi]?.notes.length ?? 0;
          const lhCount = lhPart?.measures[mi]?.notes.length ?? 0;
          const noteCount = Math.max(rhCount, lhCount, 1);
          measureWeights.push(BASE_WEIGHT + Math.max(noteCount, 3));
        }

        const totalWeight = measureWeights.reduce((a, b) => a + b, 0);
        const availableWidth = containerWidth - 40;
        const contentPool = availableWidth - HEADER_EXTRA;

        const rawWidths = measureWeights.map((w, i) => {
          const share = (w / totalWeight) * contentPool;
          return i === 0 ? share + HEADER_EXTRA : share;
        });
        const flooredWidths = rawWidths.map(w => Math.floor(w));
        flooredWidths[measuresInLine - 1] += availableWidth - flooredWidths.reduce((a, b) => a + b, 0);

        // --- Create staves with proportional widths ---
        const trebleStaves: Stave[] = [];
        const bassStaves: Stave[] = [];
        let currentX = 20;

        for (let mi = startMeasure; mi < endMeasure; mi++) {
          const localIdx = mi - startMeasure;
          const w = flooredWidths[localIdx];

          const treble = new Stave(currentX, trebleY, w);
          const bass = new Stave(currentX, bassY, w);

          if (localIdx === 0) {
            treble.addClef('treble');
            bass.addClef('bass');
            if (keySigCount > 0) {
              try { treble.addKeySignature(vexKey); } catch { /* skip */ }
              try { bass.addKeySignature(vexKey); } catch { /* skip */ }
            }
            treble.addTimeSignature(`${score.timeSignature.numerator}/${score.timeSignature.denominator}`);
            bass.addTimeSignature(`${score.timeSignature.numerator}/${score.timeSignature.denominator}`);
          }

          if (rhGreyed) treble.setStyle({ strokeStyle: '#e2e8f0', fillStyle: '#e2e8f0' });
          if (lhGreyed) bass.setStyle({ strokeStyle: '#e2e8f0', fillStyle: '#e2e8f0' });

          trebleStaves.push(treble);
          bassStaves.push(bass);
          currentX += w;
        }

        trebleStaves.forEach(s => s.setContext(context).draw());
        bassStaves.forEach(s => s.setContext(context).draw());

        if (trebleStaves.length > 0 && bassStaves.length > 0) {
          const brace = new StaveConnector(trebleStaves[0], bassStaves[0]);
          brace.setType(StaveConnector.type.BRACE);
          brace.setContext(context).draw();

          const lineConn = new StaveConnector(trebleStaves[0], bassStaves[0]);
          lineConn.setType(StaveConnector.type.SINGLE_LEFT);
          lineConn.setContext(context).draw();
        }

        // --- Render notes into proportional staves ---
        for (let mi = startMeasure; mi < endMeasure; mi++) {
          const localIdx = mi - startMeasure;
          const trebleStave = trebleStaves[localIdx];
          const bassStave = bassStaves[localIdx];
          const isCurrentMeasure = mi === currentMeasureIndex;
          const rhNoteIdx = currentNoteIndices.get('rh') ?? -1;
          const lhNoteIdx = currentNoteIndices.get('lh') ?? -1;

          const accTracker = createAccidentalTracker(keyAccMap);

          const trebleNotes: StaveNote[] = [];
          const trebleScoreNotes: ScoreNote[] = [];
          const rhMeasure = rhPart?.measures[mi];
          if (rhMeasure) {
            rhMeasure.notes.forEach((note, noteIdx) => {
              const vfDur = DURATION_VEXFLOW[note.duration] + (note.dotted ? 'd' : '') + (note.rest ? 'r' : '');
              const keys = note.rest ? ['b/4'] : note.pitches.map(p => midiToPitchStringForKey(p, score.key));
              const staveNote = new StaveNote({ keys, duration: vfDur, clef: 'treble', stemDirection: 1 });
              if (note.dotted) Dot.buildAndAttach([staveNote], { all: true });
              if (!note.rest) {
                keys.forEach((k, pIdx) => {
                  const acc = accTracker.getNeeded(k);
                  if (acc) staveNote.addModifier(new Accidental(acc), pIdx);
                });
              }
              applyNoteStyle(staveNote, note, {
                isGreyed: rhGreyed,
                isCurrent: isCurrentMeasure && noteIdx === rhNoteIdx,
                activeMidiNotes,
                practiceResult: practiceResultsByNoteId?.get(note.id),
              });
              if (note.finger && !note.rest) {
                const ann = new Annotation(String(note.finger));
                ann.setVerticalJustification(Annotation.VerticalJustify.TOP);
                ann.setFont('Roboto', 11, 'normal');
                staveNote.addModifier(ann, 0);
              }
              if (note.id) noteIdToStaveNote.set(note.id, staveNote);
              trebleNotes.push(staveNote);
              trebleScoreNotes.push(note);
            });
          }

          accTracker.reset();
          const bassNotes: StaveNote[] = [];
          const bassScoreNotes: ScoreNote[] = [];
          const lhMeasure = lhPart?.measures[mi];
          if (lhMeasure) {
            lhMeasure.notes.forEach((note, noteIdx) => {
              const vfDur = DURATION_VEXFLOW[note.duration] + (note.dotted ? 'd' : '') + (note.rest ? 'r' : '');
              const keys = note.rest ? ['d/3'] : note.pitches.map(p => midiToPitchStringForKey(p, score.key));
              const staveNote = new StaveNote({ keys, duration: vfDur, clef: 'bass', stemDirection: -1 });
              if (note.dotted) Dot.buildAndAttach([staveNote], { all: true });
              if (!note.rest) {
                keys.forEach((k, pIdx) => {
                  const acc = accTracker.getNeeded(k);
                  if (acc) staveNote.addModifier(new Accidental(acc), pIdx);
                });
              }
              applyNoteStyle(staveNote, note, {
                isGreyed: lhGreyed,
                isCurrent: isCurrentMeasure && noteIdx === lhNoteIdx,
                activeMidiNotes,
                practiceResult: practiceResultsByNoteId?.get(note.id),
              });
              if (note.finger && !note.rest) {
                const ann = new Annotation(String(note.finger));
                ann.setVerticalJustification(Annotation.VerticalJustify.BOTTOM);
                ann.setFont('Roboto', 11, 'normal');
                staveNote.addModifier(ann, 0);
              }
              if (note.id) noteIdToStaveNote.set(note.id, staveNote);
              bassNotes.push(staveNote);
              bassScoreNotes.push(note);
            });
          }

          const isLastMeasure = mi === maxMeasures - 1;
          if (isLastMeasure && ghostNotes && ghostNotes.length > 0) {
            for (const ghost of ghostNotes) {
              const clef = ghost.midi < 60 ? 'bass' : 'treble';
              const key = midiToPitchStringForKey(ghost.midi, score.key);
              const vfDur = DURATION_VEXFLOW[ghost.duration];
              const sn = new StaveNote({ keys: [key], duration: vfDur, clef, stemDirection: clef === 'treble' ? 1 : -1 });
              sn.setStyle({ fillStyle: 'rgba(124, 58, 237, 0.3)', strokeStyle: 'rgba(124, 58, 237, 0.3)' });
              const acc = accTracker.getNeeded(key);
              if (acc) sn.addModifier(new Accidental(acc), 0);
              if (clef === 'treble') {
                trebleNotes.push(sn);
                trebleScoreNotes.push({ id: '', pitches: [ghost.midi], duration: ghost.duration });
              } else {
                bassNotes.push(sn);
                bassScoreNotes.push({ id: '', pitches: [ghost.midi], duration: ghost.duration });
              }
            }
          }

          if (trebleNotes.length === 0) {
            trebleNotes.push(new StaveNote({ keys: ['b/4'], duration: 'wr', clef: 'treble' }));
            trebleScoreNotes.push({ id: '', pitches: [], duration: 'whole', rest: true });
          }
          if (bassNotes.length === 0) {
            bassNotes.push(new StaveNote({ keys: ['d/3'], duration: 'wr', clef: 'bass' }));
            bassScoreNotes.push({ id: '', pitches: [], duration: 'whole', rest: true });
          }

          const trebleVoice = new Voice({
            numBeats: score.timeSignature.numerator,
            beatValue: score.timeSignature.denominator,
          });
          trebleVoice.setStrict(false);
          trebleVoice.addTickables(trebleNotes);

          const bassVoice = new Voice({
            numBeats: score.timeSignature.numerator,
            beatValue: score.timeSignature.denominator,
          });
          bassVoice.setStrict(false);
          bassVoice.addTickables(bassNotes);

          const noteStartX = trebleStave.getNoteStartX();
          const staveEndX = trebleStave.getX() + trebleStave.getWidth();
          const formatWidth = Math.max(50, staveEndX - noteStartX - 20);

          const formatter = new Formatter({ softmaxFactor: 5 });
          formatter.joinVoices([trebleVoice]);
          formatter.joinVoices([bassVoice]);
          formatter.format([trebleVoice, bassVoice], formatWidth);

          const beamGroups = getBeamGroups(score.timeSignature);
          let trebleBeams: Beam[] = [];
          let bassBeams: Beam[] = [];
          try {
            trebleBeams = Beam.generateBeams(trebleNotes, {
              beamRests: false,
              beamMiddleOnly: false,
              stemDirection: 1,
              groups: beamGroups,
            });
          } catch { /* beam generation is non-critical */ }
          try {
            bassBeams = Beam.generateBeams(bassNotes, {
              beamRests: false,
              beamMiddleOnly: false,
              stemDirection: -1,
              groups: beamGroups,
            });
          } catch { /* beam generation is non-critical */ }

          trebleVoice.draw(context, trebleStave);
          bassVoice.draw(context, bassStave);
          trebleBeams.forEach(b => b.setContext(context).draw());
          bassBeams.forEach(b => b.setContext(context).draw());
        }
      }

      if (practiceResultsByNoteId && practiceResultsByNoteId.size > 0) {
        const svgEl = containerRef.current.querySelector('svg');
        if (svgEl) {
          practiceResultsByNoteId.forEach((result) => {
            const vfNote = noteIdToStaveNote.get(result.noteId);
            if (!vfNote) return;
            try {
              const bbox = vfNote.getBoundingBox();
              if (!bbox) return;
              const noteX = vfNote.getAbsoluteX();
              const ys = (vfNote as unknown as { getYs?: () => number[] }).getYs?.();
              const headY = ys && ys.length > 0 ? ys[0] : bbox.getY() + bbox.getH() / 2;

              if ((result.timing === 'early' || result.timing === 'late') && result.pitchCorrect) {
                const MAX_SHIFT = 18;
                const clampedMs = Math.max(-200, Math.min(200, result.timingOffsetMs));
                const shiftX = (clampedMs / 200) * MAX_SHIFT;
                const color = result.timing === 'early' ? RESULT_COLORS.early : RESULT_COLORS.late;
                const ghost = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
                ghost.setAttribute('cx', String(noteX + shiftX));
                ghost.setAttribute('cy', String(headY));
                ghost.setAttribute('rx', '6');
                ghost.setAttribute('ry', '4.5');
                ghost.setAttribute('fill', color);
                ghost.setAttribute('opacity', '0.45');
                ghost.setAttribute('transform', `rotate(-20 ${noteX + shiftX} ${headY})`);
                svgEl.appendChild(ghost);
              }

              const bx = bbox.getX();
              const by = bbox.getY();
              const bw = Math.max(bbox.getW(), 16);
              const bh = Math.max(bbox.getH(), 16);
              const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              rect.setAttribute('x', String(bx - 4));
              rect.setAttribute('y', String(by - 4));
              rect.setAttribute('width', String(bw + 8));
              rect.setAttribute('height', String(bh + 8));
              rect.setAttribute('fill', 'transparent');
              rect.setAttribute('stroke', 'none');
              let tip: string;
              if (result.timing === 'missed') {
                tip = 'Missed';
              } else if (result.timing === 'perfect') {
                tip = `Perfect (${Math.abs(Math.round(result.timingOffsetMs))}ms)`;
              } else {
                const ms = Math.abs(Math.round(result.timingOffsetMs));
                tip = result.timing === 'early' ? `Early by ${ms}ms` : `Late by ${ms}ms`;
              }
              const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
              title.textContent = tip;
              rect.appendChild(title);
              svgEl.appendChild(rect);
            } catch { /* position lookup can fail for some notes */ }
          });
        }
      }
      if (mainContent) { mainContent.style.overflowY = ''; mainContent.scrollTop = savedScrollTop; }
    } catch (error) {
      console.error('Error rendering score:', error);
      if (containerRef.current) {
        containerRef.current.innerHTML = `<p style="color: red; padding: 1rem;">Error rendering score. Please try again.</p>`;
      }
      if (mainContent) { mainContent.style.overflowY = ''; mainContent.scrollTop = savedScrollTop; }
    }
  }, [score, currentMeasureIndex, currentNoteIndices, activeMidiNotes, practiceResultsByNoteId, greyedOutHands, ghostNotes]);

  return <div className="score-display" ref={containerRef} />;
};

export default ScoreDisplay;
