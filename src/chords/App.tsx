import React, { useState, useCallback } from 'react';
import type { ChordProgressionState, LockedOptions } from './types';
import { randomChordProgression, randomKey, randomTimeSignature, randomTempo, randomStylingStrategy } from './utils/randomization';
import { progressionToChords } from './utils/chordTheory';
import { generateVoicing } from './utils/chordVoicing';
import { generateStyledChordNotes } from './utils/chordStyling';
import { chordPlayer } from './utils/chordPlayer';
import ChordScoreRenderer from './components/ChordScoreRenderer';
import ManualControls from './components/ManualControls';
import { SOUND_OPTIONS } from './types/soundOptions';

const App: React.FC = () => {
  const [state, setState] = useState<ChordProgressionState>(() => {
    const timeSignature = randomTimeSignature();
    return {
      progression: randomChordProgression(),
      key: randomKey(),
      tempo: randomTempo(),
      timeSignature,
      stylingStrategy: randomStylingStrategy(timeSignature),
      voicingOptions: {
        useInversions: false,
        useOpenVoicings: false,
        randomizeOctaves: false,
      },
      soundType: 'piano',
    };
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentChordIndex, setCurrentChordIndex] = useState<number | null>(null);
  const [lockedOptions, setLockedOptions] = useState<LockedOptions>({});

  const handleRandomize = () => {
    if (isPlaying) {
      chordPlayer.stop();
      setIsPlaying(false);
      setCurrentChordIndex(null);
    }
    
    const updates: Partial<ChordProgressionState> = {};
    
    // Only randomize unlocked options
    if (!lockedOptions.progression) {
      updates.progression = randomChordProgression();
    }
    if (!lockedOptions.key) {
      updates.key = randomKey();
    }
    if (!lockedOptions.tempo) {
      updates.tempo = randomTempo();
    }
    if (!lockedOptions.timeSignature) {
      updates.timeSignature = randomTimeSignature();
    }
    if (!lockedOptions.stylingStrategy) {
      const newTimeSig = updates.timeSignature || state.timeSignature;
      updates.stylingStrategy = randomStylingStrategy(newTimeSig);
    }
    
    // Always keep voicing options and sound type
    setState({
      ...state,
      ...updates,
      voicingOptions: state.voicingOptions,
      soundType: state.soundType,
    });
  };

  const handleStateChange = useCallback((updates: Partial<ChordProgressionState>) => {
    setState(prevState => ({
      ...prevState,
      ...updates,
      voicingOptions: prevState.voicingOptions,
      soundType: prevState.soundType,
    }));
  }, []);

  const handleLockChange = (option: keyof LockedOptions, locked: boolean) => {
    setLockedOptions({ ...lockedOptions, [option]: locked });
  };

  const handlePlay = useCallback(() => {
    if (isPlaying) {
      chordPlayer.stop();
      setIsPlaying(false);
      setCurrentChordIndex(null);
      return;
    }

    // Convert progression to chords and generate voicings
    const chords = progressionToChords(state.progression.progression, state.key);
    const trebleVoicings = chords.map(chord => generateVoicing(chord, state.voicingOptions, 'treble'));
    const bassVoicings = chords.map(chord => generateVoicing(chord, state.voicingOptions, 'bass'));
    
    // Generate styled chord notes (split into bass and treble)
    const styledChords = chords.map((chord, index) => 
      generateStyledChordNotes(chord, trebleVoicings[index], bassVoicings[index], state.stylingStrategy, state.timeSignature)
    );

    setIsPlaying(true);
    setCurrentChordIndex(null);

    chordPlayer.play(
      styledChords,
      state.tempo,
      state.timeSignature,
      (chordIndex) => {
        setCurrentChordIndex(chordIndex);
      },
      () => {
        setIsPlaying(false);
        setCurrentChordIndex(null);
      },
      true, // Loop
      state.soundType
    );
  }, [state, isPlaying]);

  return (
    <div className="chords-app">
      <header className="chords-header">
        <h1>Chord Progression Generator</h1>
      </header>
      
      <main className="chords-main">
        <aside className="chords-sidebar">
          <ManualControls
            state={state}
            lockedOptions={lockedOptions}
            onStateChange={(updates) => {
              handleStateChange(updates);
            }}
            onLockChange={handleLockChange}
            onRandomize={handleRandomize}
          />
        </aside>

        <div className="chords-main-content">
          <div className="chords-playback-controls">
            <button onClick={handlePlay} className="play-button">
              <span className="material-symbols-outlined">
                {isPlaying ? 'stop' : 'play_arrow'}
              </span>
              {isPlaying ? 'Stop' : 'Play'}
            </button>
            <div className="sound-control">
              <label htmlFor="sound-type">Sound:</label>
              <select
                id="sound-type"
                value={state.soundType}
                onChange={(e) => {
                  const newSoundType = e.target.value as ChordProgressionState['soundType'];
                  handleStateChange({ soundType: newSoundType });
                  chordPlayer.setSoundType(newSoundType);
                }}
                className="sound-select"
              >
                {SOUND_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="chords-score">
            <ChordScoreRenderer state={state} currentChordIndex={currentChordIndex} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;

