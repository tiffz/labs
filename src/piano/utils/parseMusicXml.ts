import type { PianoScore, ScorePart, ScoreMeasure, ScoreNote, ScoreNavigation, NoteDuration, Key, RepeatBarline, VoltaBracket } from '../types';
import { generateNoteId, durationToBeats } from '../types';

const STEP_TO_SEMITONE: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
};

function pitchToMidi(step: string, octave: number, alter: number): number {
  const semitone = (STEP_TO_SEMITONE[step] ?? 0) + alter;
  return (octave + 1) * 12 + semitone;
}

const MUSICXML_TYPE_TO_DURATION: Record<string, NoteDuration> = {
  whole: 'whole',
  half: 'half',
  quarter: 'quarter',
  eighth: 'eighth',
  '16th': 'sixteenth',
};

function xmlTypeToDuration(typeStr: string | null, divisions: number, xmlDuration: number): { duration: NoteDuration; dotted: boolean } {
  if (typeStr && MUSICXML_TYPE_TO_DURATION[typeStr]) {
    return { duration: MUSICXML_TYPE_TO_DURATION[typeStr], dotted: false };
  }
  const beats = xmlDuration / divisions;
  const DURATION_MAP: [number, NoteDuration, boolean][] = [
    [6, 'whole', true], [4, 'whole', false],
    [3, 'half', true], [2, 'half', false],
    [1.5, 'quarter', true], [1, 'quarter', false],
    [0.75, 'eighth', true], [0.5, 'eighth', false],
    [0.375, 'sixteenth', true], [0.25, 'sixteenth', false],
  ];
  let closest: [NoteDuration, boolean] = ['quarter', false];
  let closestDiff = Infinity;
  for (const [val, dur, dot] of DURATION_MAP) {
    const diff = Math.abs(beats - val);
    if (diff < closestDiff) { closestDiff = diff; closest = [dur, dot]; }
  }
  return { duration: closest[0], dotted: closest[1] };
}

function getText(el: Element, tag: string): string | null {
  const child = el.querySelector(tag);
  return child?.textContent?.trim() ?? null;
}

function getNum(el: Element, tag: string): number | null {
  const t = getText(el, tag);
  return t !== null ? Number(t) : null;
}

const FIFTHS_TO_KEY: Record<string, Key> = {
  '-7': 'Cb' as Key, '-6': 'Gb', '-5': 'Db', '-4': 'Ab', '-3': 'Eb', '-2': 'Bb', '-1': 'F',
  '0': 'C', '1': 'G', '2': 'D', '3': 'A', '4': 'E', '5': 'B', '6': 'F#', '7': 'C#',
};

function fifthsToKey(fifths: number): Key {
  return FIFTHS_TO_KEY[String(fifths)] ?? 'C';
}

const ALTER_DISPLAY: Record<number, string> = { '-1': 'b', '1': '#' };

const KIND_DISPLAY: Record<string, string> = {
  'major': '', 'minor': 'm', 'dominant': '7', 'major-seventh': 'maj7',
  'minor-seventh': 'm7', 'diminished': 'dim', 'augmented': 'aug',
  'diminished-seventh': 'dim7', 'half-diminished': 'm7b5',
  'major-minor': 'mMaj7', 'major-sixth': '6', 'minor-sixth': 'm6',
  'dominant-ninth': '9', 'major-ninth': 'maj9', 'minor-ninth': 'm9',
  'dominant-11th': '11', 'dominant-13th': '13', 'suspended-second': 'sus2',
  'suspended-fourth': 'sus4', 'power': '5',
};

function parseHarmony(el: Element): string | null {
  const rootStep = getText(el, 'root > root-step');
  if (!rootStep) return null;
  const rootAlter = getNum(el, 'root > root-alter') ?? 0;
  const rootStr = rootStep + (ALTER_DISPLAY[rootAlter] ?? '');

  const kindEl = el.querySelector('kind');
  const kindText = kindEl?.getAttribute('text');
  const kindValue = kindEl?.textContent?.trim() ?? 'major';
  if (kindValue === 'none' && kindText) return kindText;
  const kindStr = kindText !== null && kindText !== undefined ? kindText : (KIND_DISPLAY[kindValue] ?? '');

  const bassStep = getText(el, 'bass > bass-step');
  let bassStr = '';
  if (bassStep) {
    const bassAlter = getNum(el, 'bass > bass-alter') ?? 0;
    bassStr = '/' + bassStep + (ALTER_DISPLAY[bassAlter] ?? '');
  }

  return rootStr + kindStr + bassStr;
}

function parseLyric(noteEl: Element): string | undefined {
  const lyricEl = noteEl.querySelector('lyric');
  if (!lyricEl) return undefined;
  const text = getText(lyricEl, 'text');
  if (!text) return undefined;
  const syllabic = getText(lyricEl, 'syllabic');
  if (syllabic === 'begin' || syllabic === 'middle') return text + '-';
  return text;
}

interface TickNote {
  tick: number;
  midi: number;
  duration: NoteDuration;
  dotted: boolean;
  rest: boolean;
  staff: number;
  voice: number;
  isChord: boolean;
  tieStart: boolean;
  tieStop: boolean;
  grace: boolean;
  tuplet?: { actual: number; normal: number };
  xmlDuration: number;
  chordSymbol?: string;
  lyric?: string;
}

function selectPianoPart(doc: Document): Element | null {
  const parts = doc.querySelectorAll('part');
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];

  const partList = doc.querySelectorAll('part-list > score-part');
  const partIdToStaves = new Map<string, number>();

  for (const part of parts) {
    const id = part.getAttribute('id') ?? '';
    const firstAttrs = part.querySelector('measure > attributes');
    if (firstAttrs) {
      const staves = getNum(firstAttrs, 'staves');
      if (staves !== null) partIdToStaves.set(id, staves);
    }
  }

  for (const sp of partIdToStaves) {
    if (sp[1] >= 2) {
      for (const part of parts) {
        if (part.getAttribute('id') === sp[0]) return part;
      }
    }
  }

  for (const sp of partList) {
    const name = (getText(sp, 'part-name') ?? '').toLowerCase();
    if (name.includes('piano') || name.includes('keyboard')) {
      const id = sp.getAttribute('id');
      for (const part of parts) {
        if (part.getAttribute('id') === id) return part;
      }
    }
  }

  let bestPart = parts[0];
  let bestNoteCount = 0;
  for (const part of parts) {
    const count = part.querySelectorAll('note').length;
    if (count > bestNoteCount) {
      bestNoteCount = count;
      bestPart = part;
    }
  }
  return bestPart;
}

const VOCAL_NAME_PATTERNS = ['voice', 'vocal', 'melody', 'soprano', 'singer', 'lead'];

function selectVocalPart(doc: Document, pianoPartId: string): Element | null {
  const partList = doc.querySelectorAll('part-list > score-part');
  const parts = doc.querySelectorAll('part');

  for (const sp of partList) {
    const id = sp.getAttribute('id') ?? '';
    if (id === pianoPartId) continue;
    const name = (getText(sp, 'part-name') ?? '').toLowerCase();
    if (VOCAL_NAME_PATTERNS.some(p => name.includes(p))) {
      for (const part of parts) {
        if (part.getAttribute('id') === id) return part;
      }
    }
  }
  return null;
}

function parseSingleStaffPart(
  partEl: Element,
  initialDivisions: number,
  buildMeasureNotes: (notes: TickNote[]) => ScoreNote[],
): ScoreMeasure[] {
  const measures: ScoreMeasure[] = [];
  let divisions = initialDivisions;

  for (const measure of partEl.querySelectorAll('measure')) {
    const tickNotes: TickNote[] = [];
    let currentTick = 0;
    const pendingChords: string[] = [];

    const children = measure.children;
    for (let ci = 0; ci < children.length; ci++) {
      const child = children[ci];
      const tag = child.tagName;

      if (tag === 'attributes') {
        const div = getNum(child, 'divisions');
        if (div !== null && div > 0) divisions = div;
      }

      if (tag === 'harmony') {
        const parsed = parseHarmony(child);
        if (parsed) pendingChords.push(parsed);
      }

      if (tag === 'backup') {
        currentTick -= getNum(child, 'duration') ?? 0;
        if (currentTick < 0) currentTick = 0;
      }
      if (tag === 'forward') {
        currentTick += getNum(child, 'duration') ?? 0;
      }

      if (tag === 'note') {
        const isRest = child.querySelector('rest') !== null;
        const isChord = child.querySelector('chord') !== null;
        const isGrace = child.querySelector('grace') !== null;
        const voiceNum = getNum(child, 'voice') ?? 1;
        const typeStr = getText(child, 'type');
        const xmlDuration = isGrace ? 0 : (getNum(child, 'duration') ?? divisions);
        const hasDot = child.querySelector('dot') !== null;
        const { duration, dotted: inferredDot } = xmlTypeToDuration(typeStr, divisions, xmlDuration || divisions);
        const dotted = hasDot || inferredDot;

        let tieStart = false;
        let tieStop = false;
        for (const t of child.querySelectorAll('tie')) {
          const tt = t.getAttribute('type');
          if (tt === 'start') tieStart = true;
          if (tt === 'stop') tieStop = true;
        }
        for (const t of child.querySelectorAll('notations > tied')) {
          const tt = t.getAttribute('type');
          if (tt === 'start') tieStart = true;
          if (tt === 'stop') tieStop = true;
        }

        let tuplet: { actual: number; normal: number } | undefined;
        const timeMod = child.querySelector('time-modification');
        if (timeMod) {
          const actual = getNum(timeMod, 'actual-notes');
          const normal = getNum(timeMod, 'normal-notes');
          if (actual && normal) tuplet = { actual, normal };
        }

        let midi = 0;
        if (!isRest) {
          const step = getText(child, 'pitch > step');
          const octave = getNum(child, 'pitch > octave');
          if (!step || octave === null) continue;
          const alter = getNum(child, 'pitch > alter') ?? 0;
          midi = pitchToMidi(step, octave, alter);
        }

        const lyric = parseLyric(child);

        let assignedChord: string | undefined;
        if (!isChord && pendingChords.length > 0) {
          assignedChord = pendingChords.shift();
        }

        tickNotes.push({
          tick: Math.max(0, isChord ? (tickNotes.length > 0 ? tickNotes[tickNotes.length - 1].tick : 0) : currentTick),
          midi, duration, dotted, rest: isRest,
          staff: 1, voice: voiceNum, isChord,
          tieStart, tieStop, grace: isGrace,
          tuplet, xmlDuration,
          chordSymbol: assignedChord,
          lyric,
        });

        if (!isChord && !isGrace) currentTick += xmlDuration;
      }
    }

    measures.push({ notes: buildMeasureNotes(tickNotes) });
  }

  return measures;
}

function propagateChordSymbols(sourceMeasures: ScoreMeasure[], targetMeasures: ScoreMeasure[]): void {
  const len = Math.min(sourceMeasures.length, targetMeasures.length);
  for (let mi = 0; mi < len; mi++) {
    const sourceNotes = sourceMeasures[mi].notes;
    const targetNotes = targetMeasures[mi].notes;
    if (targetNotes.length === 0) continue;

    for (const sn of sourceNotes) {
      if (!sn.chordSymbol) continue;

      const srcBeat = beatPositionOfNote(sourceNotes, sn);
      let bestIdx = 0;
      let bestDiff = Infinity;
      let runBeat = 0;
      for (let ti = 0; ti < targetNotes.length; ti++) {
        const diff = Math.abs(runBeat - srcBeat);
        if (diff < bestDiff) { bestDiff = diff; bestIdx = ti; }
        runBeat += durationToBeats(targetNotes[ti].duration, targetNotes[ti].dotted);
      }
      if (!targetNotes[bestIdx].chordSymbol) {
        targetNotes[bestIdx].chordSymbol = sn.chordSymbol;
      }
    }
  }
}

function beatPositionOfNote(notes: ScoreNote[], target: ScoreNote): number {
  let beat = 0;
  for (const n of notes) {
    if (n === target) return beat;
    beat += durationToBeats(n.duration, n.dotted);
  }
  return beat;
}

export interface ParsedSections {
  name: string;
  startMeasure: number;
  endMeasure: number;
}

function extractSections(partEl: Element, totalMeasures: number): ParsedSections[] {
  const markers: { measure: number; label: string }[] = [];
  const measures = partEl.querySelectorAll('measure');

  measures.forEach((measure, idx) => {
    for (const child of measure.children) {
      if (child.tagName === 'direction') {
        const rehearsal = child.querySelector('direction-type > rehearsal');
        if (rehearsal?.textContent) {
          markers.push({ measure: idx, label: rehearsal.textContent.trim() });
        }
      }
      if (child.tagName === 'barline') {
        const barStyle = getText(child, 'bar-style');
        if (barStyle === 'light-light' || barStyle === 'light-heavy') {
          const loc = child.getAttribute('location') ?? 'right';
          if (loc === 'right' && markers.length === 0) {
            markers.push({ measure: idx + 1, label: '' });
          }
        }
      }
    }
  });

  if (markers.length === 0) return [];

  const sections: ParsedSections[] = [];
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].measure;
    const end = (i + 1 < markers.length ? markers[i + 1].measure : totalMeasures) - 1;
    if (start > end || start >= totalMeasures) continue;
    const name = markers[i].label || `Section ${sections.length + 1}`;
    sections.push({ name, startMeasure: start, endMeasure: end });
  }

  if (sections.length > 0 && sections[0].startMeasure > 0) {
    sections.unshift({ name: 'Intro', startMeasure: 0, endMeasure: sections[0].startMeasure - 1 });
  }

  return sections;
}

function extractNavigationFromAllParts(doc: Document): { navigation: ScoreNavigation; repeats: RepeatBarline[]; voltas: VoltaBracket[] } {
  const navigation: ScoreNavigation = {};
  const repeats: RepeatBarline[] = [];
  const voltas: VoltaBracket[] = [];

  const parts = doc.querySelectorAll('part');
  for (const part of parts) {
    const measures = part.querySelectorAll('measure');
    let measureIdx = 0;
    const openEndings = new Map<number, number>();

    for (const measure of measures) {
      for (const child of measure.children) {
        if (child.tagName === 'direction') {
          const soundEl = child.querySelector('sound');
          if (soundEl) {
            if (soundEl.getAttribute('dalsegno') && navigation.dalsegnoMeasure === undefined)
              navigation.dalsegnoMeasure = measureIdx;
            if (soundEl.getAttribute('tocoda') && navigation.tocodaMeasure === undefined)
              navigation.tocodaMeasure = measureIdx;
            if (soundEl.getAttribute('coda') && navigation.codaMeasure === undefined)
              navigation.codaMeasure = measureIdx;
          }
          if (child.querySelector('direction-type > segno') && navigation.segnoMeasure === undefined)
            navigation.segnoMeasure = measureIdx;
          if (child.querySelector('direction-type > coda')) {
            if (navigation.codaMeasure === undefined) navigation.codaMeasure = measureIdx;
          }
        }

        if (child.tagName === 'barline') {
          const repeatEl = child.querySelector('repeat');
          if (repeatEl) {
            const dir = repeatEl.getAttribute('direction');
            if (dir === 'forward' || dir === 'backward') {
              const times = repeatEl.getAttribute('times');
              const existing = repeats.find(r => r.measureIndex === measureIdx && r.direction === dir);
              if (!existing) {
                repeats.push({
                  measureIndex: measureIdx,
                  direction: dir,
                  times: times ? parseInt(times) : undefined,
                });
              }
            }
          }

          const endingEl = child.querySelector('ending');
          if (endingEl) {
            const endingType = endingEl.getAttribute('type');
            const endingNum = parseInt(endingEl.getAttribute('number') ?? '1');
            if (endingType === 'start') {
              openEndings.set(endingNum, measureIdx);
            } else if (endingType === 'stop' || endingType === 'discontinue') {
              const startM = openEndings.get(endingNum);
              if (startM !== undefined) {
                const existing = voltas.find(v => v.startMeasure === startM && v.endingNumber === endingNum);
                if (!existing) {
                  voltas.push({ startMeasure: startM, endMeasure: measureIdx, endingNumber: endingNum });
                }
                openEndings.delete(endingNum);
              }
            }
          }
        }
      }
      measureIdx++;
    }

    // Close any open endings at end of part
    for (const [num, startM] of openEndings) {
      const existing = voltas.find(v => v.startMeasure === startM && v.endingNumber === num);
      if (!existing) {
        voltas.push({ startMeasure: startM, endMeasure: measureIdx - 1, endingNumber: num });
      }
    }

    if (navigation.segnoMeasure !== undefined || navigation.dalsegnoMeasure !== undefined) break;
  }

  return { navigation, repeats, voltas };
}

export function parseMusicXml(xmlString: string): PianoScore & { sections?: ParsedSections[] } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'application/xml');

  const errorNode = doc.querySelector('parsererror');
  if (errorNode) throw new Error('Invalid MusicXML: ' + errorNode.textContent);

  const rootTag = doc.documentElement.tagName;
  if (rootTag === 'score-timewise') {
    throw new Error('Timewise MusicXML is not yet supported. Please use partwise format.');
  }

  const title = getText(doc.documentElement, 'work > work-title')
    ?? getText(doc.documentElement, 'movement-title')
    ?? 'Imported Score';

  let scoreKey: Key = 'C';
  let scoreTimeSig = { numerator: 4, denominator: 4 };
  let scoreTempo = 120;

  const { navigation, repeats: parsedRepeats, voltas: parsedVoltas } = extractNavigationFromAllParts(doc);

  const part = selectPianoPart(doc);
  if (!part) {
    return {
      id: `imported-${Date.now()}`, title, key: scoreKey,
      timeSignature: scoreTimeSig, tempo: scoreTempo,
      parts: [
        { id: 'rh', name: 'Right Hand', clef: 'treble', hand: 'right', measures: [{ notes: [] }] },
        { id: 'lh', name: 'Left Hand', clef: 'bass', hand: 'left', measures: [{ notes: [] }] },
      ],
    };
  }

  const pianoPartId = part.getAttribute('id') ?? '';

  let divisions = 1;
  let hasMultipleStaves = false;

  const rhMeasures: ScoreMeasure[] = [];
  const lhMeasures: ScoreMeasure[] = [];

  const measures = part.querySelectorAll('measure');

  for (const measure of measures) {
    const tickNotes: TickNote[] = [];
    let currentTick = 0;
    const pendingChords: string[] = [];

    const children = measure.children;
    for (let ci = 0; ci < children.length; ci++) {
      const child = children[ci];
      const tag = child.tagName;

      if (tag === 'attributes') {
        const div = getNum(child, 'divisions');
        if (div !== null && div > 0) divisions = div;

        const fifths = getNum(child, 'key > fifths');
        if (fifths !== null) scoreKey = fifthsToKey(fifths);

        const beats = getNum(child, 'time > beats');
        const beatType = getNum(child, 'time > beat-type');
        if (beats !== null && beatType !== null) {
          scoreTimeSig = { numerator: beats, denominator: beatType };
        }

        const staves = getNum(child, 'staves');
        if (staves !== null && staves > 1) hasMultipleStaves = true;
      }

      if (tag === 'direction') {
        const soundEl = child.querySelector('sound');
        if (soundEl) {
          const tempo = soundEl.getAttribute('tempo');
          if (tempo) scoreTempo = Math.round(parseFloat(tempo));
        }
      }

      if (tag === 'harmony') {
        const parsed = parseHarmony(child);
        if (parsed) pendingChords.push(parsed);
      }

      if (tag === 'backup') {
        const dur = getNum(child, 'duration') ?? 0;
        currentTick -= dur;
        if (currentTick < 0) currentTick = 0;
      }

      if (tag === 'forward') {
        const dur = getNum(child, 'duration') ?? 0;
        currentTick += dur;
      }

      if (tag === 'note') {
        const isRest = child.querySelector('rest') !== null;
        const isChord = child.querySelector('chord') !== null;
        const isGrace = child.querySelector('grace') !== null;
        const staffNum = getNum(child, 'staff') ?? 1;
        const voiceNum = getNum(child, 'voice') ?? 1;

        if (staffNum >= 2) hasMultipleStaves = true;

        const typeStr = getText(child, 'type');
        const xmlDuration = isGrace ? 0 : (getNum(child, 'duration') ?? divisions);
        const hasDot = child.querySelector('dot') !== null;

        const { duration, dotted: inferredDot } = xmlTypeToDuration(typeStr, divisions, xmlDuration || divisions);
        const dotted = hasDot || inferredDot;

        let tieStart = false;
        let tieStop = false;
        const tieEls = child.querySelectorAll('tie');
        for (const t of tieEls) {
          const ttype = t.getAttribute('type');
          if (ttype === 'start') tieStart = true;
          if (ttype === 'stop') tieStop = true;
        }
        const tiedEls = child.querySelectorAll('notations > tied');
        for (const t of tiedEls) {
          const ttype = t.getAttribute('type');
          if (ttype === 'start') tieStart = true;
          if (ttype === 'stop') tieStop = true;
        }

        let tuplet: { actual: number; normal: number } | undefined;
        const timeMod = child.querySelector('time-modification');
        if (timeMod) {
          const actual = getNum(timeMod, 'actual-notes');
          const normal = getNum(timeMod, 'normal-notes');
          if (actual && normal) tuplet = { actual, normal };
        }

        let midi = 0;
        if (!isRest) {
          const step = getText(child, 'pitch > step');
          const octave = getNum(child, 'pitch > octave');
          if (!step || octave === null) continue;
          const alter = getNum(child, 'pitch > alter') ?? 0;
          midi = pitchToMidi(step, octave, alter);
        }

        let assignedChord: string | undefined;
        if (!isChord && pendingChords.length > 0) {
          assignedChord = pendingChords.shift();
        }

        tickNotes.push({
          tick: Math.max(0, isChord ? (tickNotes.length > 0 ? tickNotes[tickNotes.length - 1].tick : 0) : currentTick),
          midi, duration, dotted, rest: isRest,
          staff: staffNum, voice: voiceNum, isChord,
          tieStart, tieStop, grace: isGrace,
          tuplet, xmlDuration,
          chordSymbol: assignedChord,
        });

        if (!isChord && !isGrace) {
          currentTick += xmlDuration;
        }
      }
    }

    const staffNotes = new Map<number, TickNote[]>();
    for (const tn of tickNotes) {
      const arr = staffNotes.get(tn.staff) || [];
      arr.push(tn);
      staffNotes.set(tn.staff, arr);
    }

    if (hasMultipleStaves) {
      rhMeasures.push({ notes: buildMeasureNotes(staffNotes.get(1) || []) });
      lhMeasures.push({ notes: buildMeasureNotes(staffNotes.get(2) || []) });
    } else {
      rhMeasures.push({ notes: buildMeasureNotes(tickNotes) });
    }
  }

  if (!hasMultipleStaves && rhMeasures.length > 0) {
    for (const measure of rhMeasures) {
      const treble: ScoreNote[] = [];
      const bass: ScoreNote[] = [];
      for (const note of measure.notes) {
        if (note.rest) { treble.push(note); continue; }
        const avgPitch = note.pitches.reduce((a, b) => a + b, 0) / note.pitches.length;
        if (avgPitch < 60) bass.push(note);
        else treble.push(note);
      }
      measure.notes = treble;
      lhMeasures.push({ notes: bass });
    }
  }

  if (rhMeasures.length === 0) rhMeasures.push({ notes: [] });
  if (lhMeasures.length === 0) lhMeasures.push({ notes: [] });

  while (lhMeasures.length < rhMeasures.length) lhMeasures.push({ notes: [] });
  while (rhMeasures.length < lhMeasures.length) rhMeasures.push({ notes: [] });

  // Propagate chord symbols from bass (lh) measures to treble (rh) measures
  propagateChordSymbols(lhMeasures, rhMeasures);

  if (parsedRepeats.length > 0) navigation.repeats = parsedRepeats;
  if (parsedVoltas.length > 0) navigation.voltas = parsedVoltas;

  const hasNav = navigation.segnoMeasure !== undefined || navigation.codaMeasure !== undefined
    || navigation.tocodaMeasure !== undefined || navigation.dalsegnoMeasure !== undefined
    || (navigation.repeats && navigation.repeats.length > 0)
    || (navigation.voltas && navigation.voltas.length > 0);

  const scoreParts: ScorePart[] = [
    { id: 'rh', name: 'Right Hand', clef: 'treble', hand: 'right', measures: rhMeasures },
    { id: 'lh', name: 'Left Hand', clef: 'bass', hand: 'left', measures: lhMeasures },
  ];

  // Parse vocal part if present
  const vocalEl = selectVocalPart(doc, pianoPartId);
  if (vocalEl) {
    const vocalMeasures = parseSingleStaffPart(vocalEl, divisions, buildMeasureNotes);
    if (vocalMeasures.some(m => m.notes.length > 0)) {
      while (vocalMeasures.length < rhMeasures.length) vocalMeasures.push({ notes: [] });

      propagateChordSymbols(vocalMeasures, rhMeasures);

      scoreParts.push({
        id: 'voice', name: 'Vocal Melody', clef: 'treble', hand: 'voice', measures: vocalMeasures,
      });
    }
  }

  const totalMeasureCount = Math.max(...scoreParts.map(p => p.measures.length), 0);
  const sections = extractSections(part, totalMeasureCount);

  return {
    id: `imported-${Date.now()}`,
    title,
    key: scoreKey,
    timeSignature: scoreTimeSig,
    tempo: scoreTempo,
    parts: scoreParts,
    navigation: hasNav ? navigation : undefined,
    sections: sections.length > 0 ? sections : undefined,
  };
}

function buildMeasureNotes(notes: TickNote[]): ScoreNote[] {
  if (!notes || notes.length === 0) return [];
  notes.sort((a, b) => a.tick - b.tick || a.voice - b.voice);

  const result: ScoreNote[] = [];
  let lastNote: ScoreNote | null = null;
  let lastTick = -1;
  let lastWasGrace = false;

  for (const tn of notes) {
    if (tn.isChord && lastNote && !lastNote.rest && tn.tick === lastTick && !tn.grace && !lastWasGrace) {
      if (!tn.rest && tn.midi > 0) {
        lastNote.pitches.push(tn.midi);
      }
      continue;
    }

    if (!tn.grace && !lastWasGrace && tn.tick === lastTick && lastNote && !lastNote.rest && !tn.rest && tn.midi > 0) {
      lastNote.pitches.push(tn.midi);
      if (tn.tieStart) lastNote.tieStart = true;
      if (tn.tieStop) lastNote.tieStop = true;
      continue;
    }

    const note: ScoreNote = {
      id: generateNoteId(),
      pitches: tn.rest ? [] : [tn.midi],
      duration: tn.duration,
      dotted: tn.dotted || undefined,
      rest: tn.rest || undefined,
      tieStart: tn.tieStart || undefined,
      tieStop: tn.tieStop || undefined,
      grace: tn.grace || undefined,
      tuplet: tn.tuplet,
      chordSymbol: tn.chordSymbol,
      lyric: tn.lyric,
    };

    result.push(note);
    lastNote = note;
    lastTick = tn.tick;
    lastWasGrace = tn.grace;
  }

  return result;
}
