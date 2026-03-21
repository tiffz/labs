import React, { useEffect, useMemo, useState } from 'react';
import { usePlayback } from '../drums/hooks/usePlayback';
import { parseRhythm } from '../drums/utils/rhythmParser';
import { DEFAULT_SETTINGS } from '../drums/types/settings';
import type { TimeSignature } from '../drums/types';
import { generateWordRhythm, type SyllableHit, type WordRhythmResult } from '../drums/wordRhythm/prosodyEngine';
import VexLyricScore from './components/VexLyricScore';

const DEFAULT_LYRICS = `Sunrise on the shoreline
Ocean wind through palm trees`;

const DEFAULT_TIME_SIGNATURE: TimeSignature = {
  numerator: 4,
  denominator: 4,
};

const TIME_SIGNATURE_OPTIONS: Array<Pick<TimeSignature, 'numerator' | 'denominator'>> = [
  { numerator: 4, denominator: 4 },
  { numerator: 6, denominator: 8 },
  { numerator: 7, denominator: 8 },
];

const App: React.FC = () => {
  const [lyrics, setLyrics] = useState<string>(DEFAULT_LYRICS);
  const [rhythmVariationSeed, setRhythmVariationSeed] = useState<number>(0);
  const [soundVariationSeed, setSoundVariationSeed] = useState<number>(0);
  const [generated, setGenerated] = useState<WordRhythmResult>(() =>
    generateWordRhythm(DEFAULT_LYRICS, {
      strictDictionaryMode: false,
      timeSignature: DEFAULT_TIME_SIGNATURE,
      rhythmVariationSeed: 0,
      soundVariationSeed: 0,
    })
  );

  const [notation, setNotation] = useState<string>(generated.notation);
  const [timeSignature, setTimeSignature] = useState<TimeSignature>(DEFAULT_TIME_SIGNATURE);
  const [bpm, setBpm] = useState<number>(100);
  const [debouncedBpm, setDebouncedBpm] = useState<number>(100);
  const [metronomeEnabled, setMetronomeEnabled] = useState<boolean>(false);

  const parsedRhythm = useMemo(() => parseRhythm(notation, timeSignature), [notation, timeSignature]);
  const hitMap = useMemo(() => {
    const map = new Map<string, SyllableHit>();
    let hitIndex = 0;
    parsedRhythm.measures.forEach((measure, measureIndex) => {
      measure.notes.forEach((note, noteIndex) => {
        if (note.sound === 'rest' || note.sound === 'simile') return;
        const hit = generated.hits[hitIndex];
        if (hit) {
          map.set(`${measureIndex}-${noteIndex}`, hit);
        }
        hitIndex += 1;
      });
    });
    return map;
  }, [generated.hits, parsedRhythm]);
  const darbukaEditUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set('rhythm', notation);
    params.set('time', `${timeSignature.numerator}/${timeSignature.denominator}`);
    params.set('bpm', String(bpm));
    if (metronomeEnabled) params.set('metronome', 'true');
    return `/drums/?${params.toString()}`;
  }, [notation, timeSignature, bpm, metronomeEnabled]);

  const { isPlaying, currentNote, handlePlay, handleStop, handleMetronomeToggle } =
    usePlayback({
      parsedRhythm,
      bpm,
      debouncedBpm,
      metronomeEnabled,
      playbackSettings: DEFAULT_SETTINGS,
    });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedBpm(bpm), 350);
    return () => window.clearTimeout(timeoutId);
  }, [bpm]);

  useEffect(() => {
    if (isPlaying) handleStop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notation, timeSignature]);

  useEffect(() => {
    const next = generateWordRhythm(lyrics, {
      strictDictionaryMode: false,
      timeSignature,
      rhythmVariationSeed,
      soundVariationSeed,
    });
    setGenerated(next);
    setNotation(next.notation);
  }, [timeSignature, rhythmVariationSeed, soundVariationSeed, lyrics]);

  const regenerateRhythm = (seedDelta = 1) => {
    setRhythmVariationSeed((previous) => previous + Math.max(1, seedDelta));
  };

  const regenerateSounds = (seedDelta = 1) => {
    setSoundVariationSeed((previous) => previous + Math.max(1, seedDelta));
  };

  const regenerateBoth = (seedDelta = 1) => {
    const delta = Math.max(1, seedDelta);
    setRhythmVariationSeed((previous) => previous + delta);
    setSoundVariationSeed((previous) => previous + delta);
  };

  return (
    <div className="words-page">
      <header className="words-header">
        <h1>Words in Rhythm</h1>
      </header>

      <section className="words-sticky-controls">
        <div className="words-regenerate-row">
          <span className="words-controls-label">Regenerate</span>
          <button className="words-button words-button-primary" type="button" onClick={() => regenerateRhythm(1)}>
            rhythm
          </button>
          <button className="words-button" type="button" onClick={() => regenerateSounds(1)}>
            drum sounds
          </button>
          <button className="words-button" type="button" onClick={() => regenerateBoth(1)}>
            both
          </button>
        </div>
        <div className="words-playback-row">
          <button
            className="words-button words-button-primary"
            type="button"
            onClick={isPlaying ? handleStop : handlePlay}
          >
            {isPlaying ? 'stop' : 'play'}
          </button>
          <label className="words-inline-control">
            bpm
            <input
              type="number"
              min={40}
              max={220}
              value={bpm}
              onChange={(event) => setBpm(Math.min(220, Math.max(40, Number(event.target.value) || 100)))}
            />
          </label>
          <label className="words-inline-control">
            meter
            <select
              value={`${timeSignature.numerator}/${timeSignature.denominator}`}
              onChange={(event) => {
                const [numerator, denominator] = event.target.value.split('/').map(Number);
                setTimeSignature({ numerator, denominator });
              }}
            >
              {TIME_SIGNATURE_OPTIONS.map((option) => (
                <option key={`${option.numerator}/${option.denominator}`} value={`${option.numerator}/${option.denominator}`}>
                  {option.numerator}/{option.denominator}
                </option>
              ))}
            </select>
          </label>
          <label className="word-rhythm-toggle">
            <input
              type="checkbox"
              checked={metronomeEnabled}
              onChange={(event) => {
                setMetronomeEnabled(event.target.checked);
                handleMetronomeToggle(event.target.checked);
              }}
            />
            metronome
          </label>
        </div>
      </section>

      <section className="words-main-grid">
        <article className="words-editor-card">
          <label className="words-label" htmlFor="lyrics-input">
            Words / Lyrics
          </label>
          <textarea
            id="lyrics-input"
            className="words-textarea"
            rows={9}
            value={lyrics}
            onChange={(event) => setLyrics(event.target.value)}
            placeholder="Type words or lyrics..."
          />
        </article>

        <article className="words-rhythm-card">
          <VexLyricScore
            rhythm={parsedRhythm}
            timeSignature={timeSignature}
            currentNote={currentNote}
            hitMap={hitMap}
          />

          <div className="word-rhythm-output">
            <strong>Notation:</strong> <code>{notation || '(empty)'}</code>{' '}
            <a className="words-edit-link" href={darbukaEditUrl} target="_blank" rel="noreferrer noopener">
              Edit in Darbuka Trainer
            </a>
          </div>
        </article>
      </section>

    </div>
  );
};

export default App;
