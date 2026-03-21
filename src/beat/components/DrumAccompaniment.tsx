import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { TimeSignature } from '../../shared/rhythm/types';
import { parseRhythm } from '../../shared/rhythm/rhythmParser';
import { AudioPlayer } from '../../shared/audio/audioPlayer';
import DrumNotationMini, { type NotationStyle } from '../../shared/notation/DrumNotationMini';

// Import drum sounds
import dumSound from '../../drums/assets/sounds/dum.wav';
import takSound from '../../drums/assets/sounds/tak.wav';
import kaSound from '../../drums/assets/sounds/ka.wav';
import slapSound from '../../drums/assets/sounds/slap2.wav';

/** Precise drum scheduling via the playback engine's look-ahead scheduler */
export interface DrumScheduler {
  loadSound(name: string, url: string): Promise<void>;
  playAt(soundName: string, audioTime: number, volume: number): void;
  setCallback(cb: ((scheduledUpTo: number, scheduleEnd: number, startTime: number, tempo: number, audioCtx: AudioContext) => void) | null): void;
}

interface DrumAccompanimentProps {
  bpm: number;
  timeSignature: TimeSignature;
  isPlaying: boolean;
  currentBeatTime: number;
  currentBeat: number;
  metronomeEnabled?: boolean;
  volume?: number;
  notationStyle?: NotationStyle;
  notationWidth?: number;
  scheduler?: DrumScheduler;
}

// Common drum rhythms (correct patterns from rhythm database)
// 2/4 rhythms are stored with original and doubled versions for 4/4 time signatures
const PRESET_RHYTHMS_BASE = [
  { name: 'Rock', notation: 'D---T---D-D-T---', is2_4: false },    // Rock and Roll - best default for pop/rock
  { name: 'Maqsum', notation: 'D-T-__T-D---T---', is2_4: false },  // Standard 4/4 Maqsum
  { name: 'Baladi', notation: 'D-D-__T-D---T---', is2_4: false },  // Starts with two dums
  { name: 'Saidi', notation: 'D-T-__D-D---T---', is2_4: false },   // Has DD in middle
  { name: 'Malfuf', notation: 'D---T-T-', is2_4: true },           // 2/4 feel
  { name: 'Ayoub', notation: 'D--KD-T-', is2_4: true },            // Energetic 2/4
];

// Helper to get rhythm notation adjusted for time signature
const getAdjustedNotation = (preset: typeof PRESET_RHYTHMS_BASE[0], timeSignature: TimeSignature): string => {
  // If it's a 2/4 rhythm and we're in 4/4, double it
  if (preset.is2_4 && timeSignature.numerator === 4 && timeSignature.denominator === 4) {
    return preset.notation + preset.notation; // Repeat to fill the measure
  }
  return preset.notation;
};

// For display purposes, use the base rhythms
const PRESET_RHYTHMS = PRESET_RHYTHMS_BASE;

const DRUM_SOUNDS = { dum: dumSound, tak: takSound, ka: kaSound, slap: slapSound } as const;

const DrumAccompaniment: React.FC<DrumAccompanimentProps> = ({
  bpm,
  timeSignature,
  isPlaying,
  currentBeatTime,
  currentBeat,
  metronomeEnabled = false,
  volume = 70,
  notationStyle,
  notationWidth,
  scheduler,
}) => {
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [customNotation, setCustomNotation] = useState<string | null>(null);
  const [currentNoteIndex, setCurrentNoteIndex] = useState<number | null>(null);
  const [currentMeasureIndex, setCurrentMeasureIndex] = useState(0);

  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const lastPlayedNoteRef = useRef<number>(-1);
  const lastMeasureRef = useRef<number>(-1);

  const notation = useMemo(() => {
    if (customNotation !== null) {
      return customNotation;
    }
    return getAdjustedNotation(PRESET_RHYTHMS_BASE[selectedPreset], timeSignature);
  }, [customNotation, selectedPreset, timeSignature]);

  const parsedRhythm = useMemo(() => {
    return parseRhythm(notation, timeSignature);
  }, [notation, timeSignature]);

  // Fallback: initialize own AudioPlayer when no engine scheduler is provided
  useEffect(() => {
    if (scheduler) return;
    const player = new AudioPlayer({
      soundUrls: DRUM_SOUNDS,
      enableReverb: false,
    });
    player.initialize().then(() => { audioPlayerRef.current = player; });
    return () => { player.destroy(); };
  }, [scheduler]);

  // Load drum sounds into the engine's AudioContext when scheduler is provided
  useEffect(() => {
    if (!scheduler) return;
    for (const [name, url] of Object.entries(DRUM_SOUNDS)) {
      scheduler.loadSound(name, url);
    }
  }, [scheduler]);

  // Precise scheduling via the engine's look-ahead scheduler
  const parsedRhythmRef = useRef(parsedRhythm);
  parsedRhythmRef.current = parsedRhythm;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const timeSignatureRef = useRef(timeSignature);
  timeSignatureRef.current = timeSignature;

  useEffect(() => {
    if (!scheduler || !isPlaying) {
      scheduler?.setCallback(null);
      return;
    }

    scheduler.setCallback((scheduledUpTo, scheduleEnd, startTime, tempo) => {
      const rhythm = parsedRhythmRef.current;
      if (!rhythm.isValid || rhythm.measures.length === 0) return;

      const ts = timeSignatureRef.current;
      const secPerBeat = 60 / tempo;
      const sixteenthsPerMeasure =
        ts.denominator === 8 ? ts.numerator * 2 : ts.numerator * 4;
      const measureCount = rhythm.measures.length;
      const sixteenthsPerPattern = sixteenthsPerMeasure * measureCount;

      // scheduledUpTo and scheduleEnd are in beats; 4 sixteenths per beat
      const startSixteenth = Math.max(0, scheduledUpTo * 4);
      const endSixteenth = scheduleEnd * 4;

      for (let s = Math.ceil(startSixteenth); s <= endSixteenth; s++) {
        const posInPattern = ((s % sixteenthsPerPattern) + sixteenthsPerPattern) % sixteenthsPerPattern;
        const measureIdx = Math.floor(posInPattern / sixteenthsPerMeasure);
        const posInMeasure = posInPattern % sixteenthsPerMeasure;
        const measure = rhythm.measures[measureIdx];
        if (!measure) continue;

        let cumPos = 0;
        for (const note of measure.notes) {
          if (cumPos === posInMeasure && note.sound !== 'rest') {
            const beatPos = s / 4;
            const audioTime = startTime + beatPos * secPerBeat;
            scheduler.playAt(note.sound, audioTime, volumeRef.current / 100);
          }
          cumPos += note.durationInSixteenths;
          if (cumPos > posInMeasure) break;
        }
      }
    });

    return () => { scheduler.setCallback(null); };
  }, [scheduler, isPlaying]);

  // Visual highlighting only (reactive is fine for visuals)
  useEffect(() => {
    if (!isPlaying || !parsedRhythm.isValid || parsedRhythm.measures.length === 0) {
      setCurrentNoteIndex(null);
      setCurrentMeasureIndex(0);
      lastPlayedNoteRef.current = -1;
      lastMeasureRef.current = -1;
      return;
    }

    if (currentBeatTime < 0) {
      setCurrentNoteIndex(null);
      lastPlayedNoteRef.current = -1;
      lastMeasureRef.current = -1;
      return;
    }

    const msPerSixteenth = 60000 / bpm / 4;
    const sixteenthsPerMeasure =
      timeSignature.denominator === 8 ? timeSignature.numerator * 2 : timeSignature.numerator * 4;
    const measureCount = parsedRhythm.measures.length;
    const sixteenthsPerPattern = sixteenthsPerMeasure * measureCount;
    const totalSixteenths = (currentBeatTime * 1000) / msPerSixteenth;
    const positionInPattern = ((totalSixteenths % sixteenthsPerPattern) + sixteenthsPerPattern) % sixteenthsPerPattern;
    const measureIndex = Math.floor(positionInPattern / sixteenthsPerMeasure);
    const positionInMeasure = positionInPattern % sixteenthsPerMeasure;
    setCurrentMeasureIndex(measureIndex);

    const measure = parsedRhythm.measures[measureIndex];
    let cumulativePosition = 0;
    let noteIndex = 0;
    for (let i = 0; i < measure.notes.length; i++) {
      const noteEnd = cumulativePosition + measure.notes[i].durationInSixteenths;
      if (positionInMeasure >= cumulativePosition && positionInMeasure < noteEnd) {
        noteIndex = i;
        break;
      }
      cumulativePosition = noteEnd;
    }
    setCurrentNoteIndex(noteIndex);

    // Fallback: play sound reactively when no scheduler is available
    if (!scheduler) {
      const noteKey = measureIndex * 1000 + noteIndex;
      const lastNoteKey = lastMeasureRef.current * 1000 + lastPlayedNoteRef.current;
      if (noteKey !== lastNoteKey && audioPlayerRef.current) {
        const note = measure.notes[noteIndex];
        if (note.sound !== 'rest') {
          audioPlayerRef.current.play(note.sound, volume / 100);
        }
        lastPlayedNoteRef.current = noteIndex;
        lastMeasureRef.current = measureIndex;
      }
    }
  }, [isPlaying, currentBeatTime, bpm, timeSignature, parsedRhythm, volume, scheduler]);

  const handlePresetChange = useCallback((index: number) => {
    setSelectedPreset(index);
    setCustomNotation(null); // Clear custom notation to use preset
  }, []);

  const handleNotationChange = useCallback((value: string) => {
    setCustomNotation(value);
    // Check if it matches a preset (comparing base notation)
    const matchingPresetIndex = PRESET_RHYTHMS_BASE.findIndex(p => 
      p.notation === value || 
      (p.is2_4 && p.notation + p.notation === value) // Match doubled 2/4 rhythms too
    );
    if (matchingPresetIndex >= 0) {
      setSelectedPreset(matchingPresetIndex);
      setCustomNotation(null); // Use preset instead
    } else {
      setSelectedPreset(-1);
    }
  }, []);

  /**
   * Parse a Darbuka Trainer URL and extract the rhythm notation
   * Returns the rhythm notation if found, or null if not a valid URL
   */
  const parseRhythmFromUrl = useCallback((text: string): string | null => {
    try {
      // Check if it looks like a URL (absolute or relative path to drums)
      const trimmed = text.trim();
      
      // Handle both absolute URLs and relative paths
      let url: URL;
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        url = new URL(trimmed);
      } else if (trimmed.startsWith('/drums') || trimmed.includes('/drums?')) {
        // Relative URL - construct with dummy base
        url = new URL(trimmed, 'http://localhost');
      } else {
        return null;
      }

      // Check if it's a drums app URL
      if (!url.pathname.includes('/drums')) {
        return null;
      }

      // Extract rhythm parameter
      const rhythm = url.searchParams.get('rhythm');
      if (!rhythm) {
        return null;
      }

      return rhythm;
    } catch {
      // Not a valid URL
      return null;
    }
  }, []);

  /**
   * Handle paste events - detect Darbuka app URLs and extract rhythm
   */
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    const extractedRhythm = parseRhythmFromUrl(pastedText);

    if (extractedRhythm) {
      // Prevent default paste and use extracted rhythm instead
      e.preventDefault();
      handleNotationChange(extractedRhythm);
    }
    // If not a URL, allow normal paste behavior
  }, [parseRhythmFromUrl, handleNotationChange]);

  const handleOpenEditor = useCallback(() => {
    const params = new URLSearchParams();
    params.set('rhythm', notation);
    params.set('bpm', String(Math.round(bpm)));
    params.set('time', `${timeSignature.numerator}/${timeSignature.denominator}`);
    const url = `/drums/?${params.toString()}`;
    window.open(url, '_blank');
  }, [notation, timeSignature, bpm]);

  return (
    <div className="drum-accompaniment">
      {/* Preset selector */}
      <div className="drum-presets">
        {PRESET_RHYTHMS.map((preset, index) => (
          <button
            key={preset.name}
            onClick={() => handlePresetChange(index)}
            className={`preset-btn ${selectedPreset === index ? 'active' : ''}`}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Always visible notation input */}
      <div className="drum-pattern-input">
        <input
          type="text"
          placeholder="D-T-K-T- or paste Darbuka Trainer URL"
          value={notation}
          onChange={e => handleNotationChange(e.target.value)}
          onPaste={handlePaste}
        />
      </div>

      {/* Rhythm display */}
      {parsedRhythm.isValid && parsedRhythm.measures.length > 0 ? (
        <div className="vexflow-mini-container">
          {/* Multi-measure indicator */}
          {parsedRhythm.measures.length > 1 && (
            <div className="measure-indicator">
              {parsedRhythm.measures.map((_, idx) => (
                <span
                  key={idx}
                  className={`measure-dot ${idx === currentMeasureIndex ? 'active' : ''}`}
                  title={`Measure ${idx + 1}`}
                />
              ))}
            </div>
          )}
          <DrumNotationMini
            rhythm={{
              ...parsedRhythm,
              // Show only the current measure
              measures: [parsedRhythm.measures[currentMeasureIndex]],
            }}
            currentNoteIndex={currentNoteIndex}
            width={notationWidth ?? 320}
            height={metronomeEnabled ? 120 : 100}
            style={notationStyle ?? {
              staffColor: '#c8c4d8',
              noteColor: '#c8c4d8',
              textColor: '#c8c4d8',
              highlightColor: '#22c55e',
            } as NotationStyle}
            showDrumSymbols={true}
            drumSymbolScale={0.6}
            showMetronomeDots={metronomeEnabled}
            currentBeat={currentBeat}
            isPlaying={isPlaying}
          />
        </div>
      ) : (
        <div className="drum-display-error">
          <p>Enter a valid rhythm pattern</p>
          {parsedRhythm.error && <span className="error-detail">{parsedRhythm.error}</span>}
        </div>
      )}

      {/* Edit link */}
      <button onClick={handleOpenEditor} className="drum-edit-link">
        <span className="material-symbols-outlined">open_in_new</span>
        Edit in Darbuka Trainer
      </button>
    </div>
  );
};

export default DrumAccompaniment;
