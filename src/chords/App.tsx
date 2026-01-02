import React, { useState, useCallback, useEffect } from 'react';
import type { ChordProgressionState, LockedOptions } from './types';
import { randomChordProgression, randomKey, randomTimeSignature, randomTempo, randomStylingStrategy } from './utils/randomization';
import { progressionToChords } from './utils/chordTheory';
import { generateVoicing } from './utils/chordVoicing';
import { generateStyledChordNotes } from './utils/chordStyling';
import { chordPlayer } from './utils/chordPlayer';
import ChordScoreRenderer from './components/ChordScoreRenderer';
import ManualControls from './components/ManualControls';
import { SOUND_OPTIONS } from './types/soundOptions';
import { useUrlState } from './hooks/useUrlState';

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
    };
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentChordIndex, setCurrentChordIndex] = useState<number | null>(null);
  const [activeNoteGroups, setActiveNoteGroups] = useState<Set<string>>(new Set()); // Store as "measureIndex:trebleIndex" or "measureIndex:bassIndex"
  const [lockedOptions, setLockedOptions] = useState<LockedOptions>({});
  const currentLoopIdRef = React.useRef<number>(0); // Track current loop ID to filter out old highlights
  const activeNoteGroupsRef = React.useRef<Set<string>>(new Set()); // Keep a ref in sync for immediate updates

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
    setState(prevState => {
      const newState = {
        ...prevState,
        ...updates,
        voicingOptions: prevState.voicingOptions,
        soundType: prevState.soundType,
      };
      
      // If playback is active and settings that affect playback have changed,
      // update playback gracefully (will finish current measure first)
      if (isPlaying) {
        const playbackAffectingKeys: (keyof ChordProgressionState)[] = [
          'progression', 'key', 'tempo', 'timeSignature', 'stylingStrategy', 'voicingOptions'
        ];
        const hasPlaybackChanges = playbackAffectingKeys.some(key => 
          updates[key] !== undefined && updates[key] !== prevState[key]
        );
        
        if (hasPlaybackChanges) {
          // Regenerate chords with new settings
          const chords = progressionToChords(newState.progression.progression, newState.key);
          const trebleVoicings = chords.map(chord => generateVoicing(chord, newState.voicingOptions, 'treble'));
          const bassVoicings = chords.map(chord => generateVoicing(chord, newState.voicingOptions, 'bass'));
          
          const styledChords = chords.map((chord, index) => 
            generateStyledChordNotes(chord, trebleVoicings[index], bassVoicings[index], newState.stylingStrategy, newState.timeSignature)
          );
          
          // Update playback gracefully (will finish current measure, then switch)
          chordPlayer.updatePlayback(
            styledChords,
            newState.tempo,
            newState.timeSignature,
            newState.soundType
          );
        } else if (updates.soundType !== undefined && updates.soundType !== prevState.soundType) {
          // Sound type change doesn't affect timing, update immediately
          chordPlayer.setSoundType(updates.soundType);
        }
      }
      
      // Sync to URL whenever state changes
      syncToUrl(newState);
      return newState;
    });
  }, [syncToUrl, isPlaying]);
  
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
    if (isPlaying) {
      chordPlayer.stop();
      setIsPlaying(false);
      setCurrentChordIndex(null);
      const emptySet = new Set<string>();
      setActiveNoteGroups(emptySet);
      activeNoteGroupsRef.current = emptySet;
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
    const emptySet = new Set<string>();
    setActiveNoteGroups(emptySet);
    activeNoteGroupsRef.current = emptySet;
    currentLoopIdRef.current = 0; // Reset loop ID when starting playback

    chordPlayer.play(
      styledChords,
      state.tempo,
      state.timeSignature,
      (activeGroup) => {
      // Special case: measureIndex -1 means clear all highlights (start of new loop)
      if (activeGroup.measureIndex === -1) {
        const newLoopId = activeGroup.loopId ?? currentLoopIdRef.current;
        currentLoopIdRef.current = newLoopId;
        const emptySet = new Set<string>();
        activeNoteGroupsRef.current = emptySet;
        // Use functional setState to ensure we clear the latest state
        setActiveNoteGroups(() => emptySet);
        return;
      }
      
      // Filter out highlights from previous loops - CRITICAL!
      const activeLoopId = activeGroup.loopId ?? currentLoopIdRef.current;
      if (activeLoopId < currentLoopIdRef.current) {
        // This highlight is from a previous loop, ignore it completely
        return;
      }
      
      // Update current loop ID if this is a newer loop - clear all old highlights immediately
      if (activeLoopId > currentLoopIdRef.current) {
        currentLoopIdRef.current = activeLoopId;
        activeNoteGroupsRef.current = new Set<string>();
        // Clear state immediately when detecting a new loop
        setActiveNoteGroups(() => new Set<string>());
      }
      
      // Now update the set - use functional setState to work with latest state
      setActiveNoteGroups(prev => {
        // Start fresh if we detected a new loop, otherwise use previous state
        const baseSet = activeLoopId > currentLoopIdRef.current ? new Set<string>() : prev;
        const next = new Set(baseSet);
        
        // Handle treble group
        if (activeGroup.trebleGroupIndex !== null) {
          if (activeGroup.trebleGroupIndex >= 0) {
            // Positive index means add
            next.add(`${activeGroup.measureIndex}:treble:${activeGroup.trebleGroupIndex}`);
          } else {
            // Negative index means remove (convert back: -(index + 1))
            const groupIndex = -(activeGroup.trebleGroupIndex + 1);
            next.delete(`${activeGroup.measureIndex}:treble:${groupIndex}`);
          }
        }
        
        // Handle bass group
        if (activeGroup.bassGroupIndex !== null) {
          if (activeGroup.bassGroupIndex >= 0) {
            // Positive index means add
            next.add(`${activeGroup.measureIndex}:bass:${activeGroup.bassGroupIndex}`);
          } else {
            // Negative index means remove (convert back: -(index + 1))
            const groupIndex = -(activeGroup.bassGroupIndex + 1);
            next.delete(`${activeGroup.measureIndex}:bass:${groupIndex}`);
          }
        }
        
        // Update ref to match state
        activeNoteGroupsRef.current = next;
        return next;
      });
      },
      () => {
        setIsPlaying(false);
        setCurrentChordIndex(null);
        setActiveNoteGroups(new Set());
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
            <ChordScoreRenderer state={state} currentChordIndex={currentChordIndex} activeNoteGroups={activeNoteGroups} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;

