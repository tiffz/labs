import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { ChordProgressionState, LockedOptions } from './types';
import { randomChordProgression, randomKey, randomTimeSignature, randomTempo, randomStylingStrategy } from './utils/randomization';
import { progressionToChords } from './utils/chordTheory';
import { generateVoicing } from './utils/chordVoicing';
import { generateStyledChordNotes, type StyledChordNotes } from './utils/chordStyling';
import { getPlaybackEngine, disposePlaybackEngine, type ActiveNotes } from './utils/playback';
import ChordScoreRenderer from './components/ChordScoreRenderer';
import ManualControls from './components/ManualControls';
import { SOUND_OPTIONS } from './types/soundOptions';
import { useUrlState } from './hooks/useUrlState';
import { CHORD_STYLING_STRATEGIES } from './data/chordStylingStrategies';

const App: React.FC = () => {
  const { getInitialState, syncToUrl, setupPopStateListener } = useUrlState();
  
  const [state, setState] = useState<ChordProgressionState>(() => {
    // Try to get initial state from URL
    const urlState = getInitialState();
    
    if (urlState) {
      // Use URL state, fill in defaults for missing values
      const timeSignature = urlState.timeSignature || randomTimeSignature();
                return {
                  progression: urlState.progression || randomChordProgression(),
                  key: urlState.key || randomKey(),
                  tempo: urlState.tempo || randomTempo(),
                  timeSignature,
                  stylingStrategy: urlState.stylingStrategy || randomStylingStrategy(timeSignature),
                  voicingOptions: {
                    useInversions: false,
                    useOpenVoicings: false,
                    randomizeOctaves: false,
                  },
                  soundType: 'piano',
                  measuresPerChord: urlState.measuresPerChord || 1,
                };
    }
    
    // No URL state, use random defaults
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
      measuresPerChord: 1,
    };
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentChordIndex, setCurrentChordIndex] = useState<number | null>(null);
  const [activeNoteGroups, setActiveNoteGroups] = useState<Set<string>>(new Set());
  const [lockedOptions, setLockedOptions] = useState<LockedOptions>({});
  const currentLoopIdRef = useRef<number>(0);

  // Helper function to generate styled chords
  const generateExpandedStyledChords = useCallback((currentState: ChordProgressionState): StyledChordNotes[] => {
    const chords = progressionToChords(currentState.progression.progression, currentState.key);
    const trebleVoicings = chords.map(chord => generateVoicing(chord, currentState.voicingOptions, 'treble'));
    const bassVoicings = chords.map(chord => generateVoicing(chord, currentState.voicingOptions, 'bass'));
    
    const styledChords = chords.map((chord, index) => 
      generateStyledChordNotes(chord, trebleVoicings[index], bassVoicings[index], currentState.stylingStrategy, currentState.timeSignature)
    );
    
    // Expand chords across multiple measures based on measuresPerChord
    const measuresPerChord = currentState.measuresPerChord || 1;
    const expandedStyledChords: StyledChordNotes[] = [];
    styledChords.forEach((styledChord) => {
      for (let i = 0; i < measuresPerChord; i++) {
        expandedStyledChords.push(styledChord);
      }
    });
    
    return expandedStyledChords;
  }, []);

  // Create playback update callback
  const createPlaybackCallback = useCallback((timeSignature: { numerator: number }) => {
    return (positionInBeats: number, activeNotes: Map<number, ActiveNotes>, playing: boolean) => {
      if (!playing) {
        setIsPlaying(false);
        setCurrentChordIndex(null);
        setActiveNoteGroups(new Set());
        return;
      }
      
      // Convert activeNotes map to Set<string> format expected by renderer
      const noteGroups = new Set<string>();
      
      activeNotes.forEach((notes, measureIndex) => {
        notes.treble.forEach(groupIndex => {
          noteGroups.add(`${measureIndex}:treble:${groupIndex}`);
        });
        notes.bass.forEach(groupIndex => {
          noteGroups.add(`${measureIndex}:bass:${groupIndex}`);
        });
      });
      
      // Calculate current chord index from current beat
      const beatsPerMeasure = timeSignature.numerator;
      const currentChordIdx = Math.floor(positionInBeats / beatsPerMeasure);
      setCurrentChordIndex(currentChordIdx);
      setActiveNoteGroups(noteGroups);
    };
  }, []);

  const handleRandomize = () => {
    const wasPlaying = isPlaying;
    const progressionChanged = !lockedOptions.progression;
    const playbackEngine = getPlaybackEngine();
    
    if (isPlaying) {
      playbackEngine.stop();
      setIsPlaying(false);
      setCurrentChordIndex(null);
      setActiveNoteGroups(new Set());
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
      // If styling is locked, only randomize compatible time signatures
      if (lockedOptions.stylingStrategy) {
        const strategyConfig = CHORD_STYLING_STRATEGIES[state.stylingStrategy];
        const compatibleTimeSigs = strategyConfig.compatibleTimeSignatures;
        if (compatibleTimeSigs.length > 0) {
          const randomCompatibleTs = compatibleTimeSigs[Math.floor(Math.random() * compatibleTimeSigs.length)];
          updates.timeSignature = randomCompatibleTs;
        }
      } else {
        updates.timeSignature = randomTimeSignature();
      }
    }
    if (!lockedOptions.stylingStrategy) {
      const newTimeSig = updates.timeSignature || state.timeSignature;
      updates.stylingStrategy = randomStylingStrategy(newTimeSig);
    }
    
    // Always keep voicing options and sound type
    const newState = {
      ...state,
      ...updates,
      voicingOptions: state.voicingOptions,
      soundType: state.soundType,
    };
    
    setState(newState);
    // Sync to URL when randomizing
    syncToUrl(newState);
    
    // If playback was active and progression changed, restart immediately
    if (wasPlaying && progressionChanged) {
      // Use setTimeout with a small delay to ensure stop() fully completes
      // This prevents layered sounds from previous playback
      setTimeout(() => {
        const expandedStyledChords = generateExpandedStyledChords(newState);

        setIsPlaying(true);
        setCurrentChordIndex(null);
        setActiveNoteGroups(new Set());
        currentLoopIdRef.current = 0;

        playbackEngine.start(
          {
            styledChords: expandedStyledChords,
            tempo: newState.tempo,
            timeSignature: newState.timeSignature,
            soundType: newState.soundType,
          },
          createPlaybackCallback(newState.timeSignature)
        );
      }, 50);
    }
  };

  const handleStateChange = useCallback((updates: Partial<ChordProgressionState>) => {
    const playbackEngine = getPlaybackEngine();
    
    setState(prevState => {
      const newState = {
        ...prevState,
        ...updates,
        voicingOptions: updates.voicingOptions !== undefined ? updates.voicingOptions : prevState.voicingOptions,
        soundType: updates.soundType !== undefined ? updates.soundType : prevState.soundType,
      };
      
      // If playback is active and settings that affect playback have changed,
      // handle updates dynamically based on the type of change
      if (isPlaying) {
        // Tempo changes should apply immediately
        if (updates.tempo !== undefined && updates.tempo !== prevState.tempo) {
          playbackEngine.setTempo(newState.tempo);
        }
        
        // Sound type changes apply immediately with crossfade
        if (updates.soundType !== undefined && updates.soundType !== prevState.soundType) {
          playbackEngine.setSoundType(updates.soundType);
        }
        
        // Other playback-affecting changes should wait for measure end
        const playbackAffectingKeys: (keyof ChordProgressionState)[] = [
          'progression', 'key', 'timeSignature', 'stylingStrategy', 'voicingOptions', 'measuresPerChord'
        ];
        const hasPlaybackChanges = playbackAffectingKeys.some(key => 
          updates[key] !== undefined && updates[key] !== prevState[key]
        );
        
        if (hasPlaybackChanges) {
          // Regenerate chords with new settings and update content (queued for measure boundary)
          const expandedStyledChords = generateExpandedStyledChords(newState);
          playbackEngine.updateContent(expandedStyledChords);
          
          // Handle time signature changes separately
          if (updates.timeSignature !== undefined && 
              (updates.timeSignature.numerator !== prevState.timeSignature.numerator ||
               updates.timeSignature.denominator !== prevState.timeSignature.denominator)) {
            playbackEngine.setTimeSignature(updates.timeSignature);
          }
        }
      }
      
      // Sync to URL whenever state changes
      syncToUrl(newState);
      return newState;
    });
  }, [syncToUrl, isPlaying, generateExpandedStyledChords]);
  
  // Set up browser navigation listener
  useEffect(() => {
    return setupPopStateListener((urlState) => {
      setState(prevState => ({
        ...prevState,
        ...urlState,
        voicingOptions: prevState.voicingOptions,
        soundType: prevState.soundType,
      }));
    });
  }, [setupPopStateListener]);

  const handleLockChange = (option: keyof LockedOptions, locked: boolean) => {
    setLockedOptions({ ...lockedOptions, [option]: locked });
  };

  const handlePlay = useCallback(() => {
    const playbackEngine = getPlaybackEngine();
    
    if (isPlaying) {
      playbackEngine.stop();
      setIsPlaying(false);
      setCurrentChordIndex(null);
      setActiveNoteGroups(new Set());
      return;
    }

    // Generate styled chords
    const expandedStyledChords = generateExpandedStyledChords(state);

    setIsPlaying(true);
    setCurrentChordIndex(null);
    setActiveNoteGroups(new Set());
    currentLoopIdRef.current = 0;

    // Start playback with new engine
    playbackEngine.start(
      {
        styledChords: expandedStyledChords,
        tempo: state.tempo,
        timeSignature: state.timeSignature,
        soundType: state.soundType,
      },
      createPlaybackCallback(state.timeSignature)
    );
  }, [state, isPlaying, generateExpandedStyledChords, createPlaybackCallback]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disposePlaybackEngine();
    };
  }, []);

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
            <ChordScoreRenderer state={state} currentChordIndex={currentChordIndex} activeNoteGroups={activeNoteGroups} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;

