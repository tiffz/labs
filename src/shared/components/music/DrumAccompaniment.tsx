import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { TimeSignature } from '../../rhythm/types';
import { parseRhythm } from '../../rhythm/rhythmParser';
import { getRhythmTemplatePresets } from '../../rhythm/presetDatabase';
import { AudioPlayer } from '../../audio/audioPlayer';
import DrumNotationMini, { type NotationStyle } from '../../notation/DrumNotationMini';
import DiceIcon from '../DiceIcon';
import { DRUM_SAMPLE_URLS } from '../../audio/drumSampleUrls';

/** Precise drum scheduling via the playback engine's look-ahead scheduler */
export interface DrumScheduler {
  loadSound(name: string, url: string): Promise<void>;
  playAt(soundName: string, audioTime: number, volume: number): void;
  setCallback(cb: ((scheduledUpTo: number, scheduleEnd: number, startTime: number, tempo: number, audioCtx: AudioContext) => void) | null): void;
}

export interface DrumTemplateButtonProps {
  isActive: boolean;
  onClick: () => void;
  className: string;
  ariaLabel?: string;
  title?: string;
  onMouseEnter?: React.MouseEventHandler<HTMLButtonElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLButtonElement>;
  onFocus?: React.FocusEventHandler<HTMLButtonElement>;
  onBlur?: React.FocusEventHandler<HTMLButtonElement>;
  children: React.ReactNode;
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
  TemplateButtonComponent?: React.ComponentType<DrumTemplateButtonProps>;
  templateButtonClassName?: string;
  randomizeButtonClassName?: string;
}

const DRUM_SOUNDS = { ...DRUM_SAMPLE_URLS } as const;

const DefaultTemplateButton: React.FC<DrumTemplateButtonProps> = ({
  isActive,
  onClick,
  className,
  ariaLabel,
  title,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  children,
}) => (
  <button
    onClick={onClick}
    className={`${className}${isActive ? ' active' : ''}`}
    aria-label={ariaLabel}
    title={title}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    onFocus={onFocus}
    onBlur={onBlur}
    type="button"
  >
    {children}
  </button>
);

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
  TemplateButtonComponent,
  templateButtonClassName,
  randomizeButtonClassName,
}) => {
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [customNotation, setCustomNotation] = useState<string | null>(null);
  const [currentNoteIndex, setCurrentNoteIndex] = useState<number | null>(null);
  const [currentMeasureIndex, setCurrentMeasureIndex] = useState(0);
  const [hoverTip, setHoverTip] = useState<{ text: string; x: number; y: number } | null>(
    null
  );
  const presetRhythms = useMemo(() => getRhythmTemplatePresets(timeSignature), [timeSignature]);

  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const lastPlayedNoteRef = useRef<number>(-1);
  const lastMeasureRef = useRef<number>(-1);

  const notation = useMemo(() => {
    if (customNotation !== null) {
      return customNotation;
    }
    return presetRhythms[selectedPreset]?.notation ?? presetRhythms[0]?.notation ?? '';
  }, [customNotation, selectedPreset, presetRhythms]);

  const parsedRhythm = useMemo(() => {
    return parseRhythm(notation, timeSignature);
  }, [notation, timeSignature]);
  const sixteenthsPerMeasure = useMemo(
    () => Math.max(4, Math.round((timeSignature.numerator * 16) / timeSignature.denominator)),
    [timeSignature]
  );
  const TemplateButton = TemplateButtonComponent ?? DefaultTemplateButton;

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
    const matchingPresetIndex = presetRhythms.findIndex((preset) => preset.notation === value);
    if (matchingPresetIndex >= 0) {
      setSelectedPreset(matchingPresetIndex);
      setCustomNotation(null); // Use preset instead
    } else {
      setSelectedPreset(-1);
    }
  }, [presetRhythms]);
  const randomizePresetTemplate = useCallback(() => {
    if (presetRhythms.length === 0) return;
    const nextIndex = Math.floor(Math.random() * presetRhythms.length);
    setSelectedPreset(nextIndex);
    setCustomNotation(null);
  }, [presetRhythms]);
  const randomizeFullTemplate = useCallback(() => {
    const tokens = ['D', 'T', 'K', 'S', '-', '-'];
    let nextNotation = '';
    for (let i = 0; i < sixteenthsPerMeasure; i += 1) {
      nextNotation += tokens[Math.floor(Math.random() * tokens.length)];
    }
    if (!/[DTKS]/.test(nextNotation)) {
      const randomIndex = Math.floor(Math.random() * nextNotation.length);
      nextNotation = `${nextNotation.slice(0, randomIndex)}D${nextNotation.slice(randomIndex + 1)}`;
    }
    setCustomNotation(nextNotation);
    setSelectedPreset(-1);
  }, [sixteenthsPerMeasure]);
  const showTip = useCallback(
    (event: React.MouseEvent<HTMLButtonElement> | React.FocusEvent<HTMLButtonElement>, text: string) => {
      const rect = event.currentTarget.getBoundingClientRect();
      setHoverTip({
        text,
        x: rect.left + rect.width / 2,
        y: rect.bottom + 10,
      });
    },
    []
  );
  const hideTip = useCallback(() => setHoverTip(null), []);

  useEffect(() => {
    if (selectedPreset < 0) return;
    if (selectedPreset >= presetRhythms.length) {
      setSelectedPreset(0);
    }
  }, [selectedPreset, presetRhythms.length]);

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

  return (
    <div className="drum-accompaniment">
      {/* Preset selector */}
      <div className="drum-presets">
        {presetRhythms.map((preset, index) => (
          <TemplateButton
            key={preset.id}
            onClick={() => handlePresetChange(index)}
            isActive={selectedPreset === index}
            className={`preset-btn ${templateButtonClassName ?? ''}`.trim()}
            ariaLabel={`Use ${preset.label} drum preset`}
          >
            {preset.label}
          </TemplateButton>
        ))}
        <TemplateButton
          onClick={randomizePresetTemplate}
          isActive={false}
          className={`preset-btn preset-btn-icon ${randomizeButtonClassName ?? ''}`.trim()}
          ariaLabel="Random preset template"
          onMouseEnter={(event) => showTip(event, 'Random preset template')}
          onMouseLeave={hideTip}
          onFocus={(event) => showTip(event, 'Random preset template')}
          onBlur={hideTip}
        >
          <DiceIcon variant="single" size={15} />
        </TemplateButton>
        <TemplateButton
          onClick={randomizeFullTemplate}
          isActive={false}
          className={`preset-btn preset-btn-icon ${randomizeButtonClassName ?? ''}`.trim()}
          ariaLabel="Fully randomize template"
          onMouseEnter={(event) => showTip(event, 'Fully randomize template')}
          onMouseLeave={hideTip}
          onFocus={(event) => showTip(event, 'Fully randomize template')}
          onBlur={hideTip}
        >
          <DiceIcon variant="multiple" size={15} />
        </TemplateButton>
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
            darbukaLinkOptions={{
              notation,
              bpm,
              timeSignature,
              metronomeEnabled,
              className: 'drum-edit-link',
            }}
          />
        </div>
      ) : (
        <div className="drum-display-error">
          <p>Enter a valid rhythm pattern</p>
          {parsedRhythm.error && <span className="error-detail">{parsedRhythm.error}</span>}
        </div>
      )}
      {hoverTip && typeof document !== 'undefined'
        ? createPortal(
            <div
              style={{
                position: 'fixed',
                left: `${hoverTip.x}px`,
                top: `${hoverTip.y}px`,
                transform: 'translateX(-50%)',
                background: '#374151',
                color: '#f9fafb',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                lineHeight: 1.2,
                padding: '8px 10px',
                zIndex: 420,
                pointerEvents: 'none',
                boxShadow: '0 8px 18px rgba(15, 23, 42, 0.28)',
                whiteSpace: 'nowrap',
              }}
            >
              {hoverTip.text}
            </div>,
            document.body
          )
        : null}

    </div>
  );
};

export default DrumAccompaniment;
