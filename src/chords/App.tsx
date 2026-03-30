import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Popover from '@mui/material/Popover';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import useMediaQuery from '@mui/material/useMediaQuery';
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
import MetronomeToggleButton from '../shared/components/MetronomeToggleButton';
import { AudioPlayer } from '../shared/audio/audioPlayer';
import AppTooltip from '../shared/components/AppTooltip';
import AppSlider from '../shared/components/AppSlider';
import SharedExportPopover from '../shared/components/music/SharedExportPopover';
import type { ExportSourceAdapter } from '../shared/music/exportTypes';
import { buildSingleTrackMidi, type MidiNoteEvent } from '../shared/music/midiBuilder';
import { renderMidiEventsToAudioBuffer } from '../shared/music/midiAudioRender';
import { CLICK_SAMPLE_URL } from '../shared/audio/drumSampleUrls';

// Loading state for piano samples
interface LoadingState {
  isLoading: boolean;
  progress: number;  // 0-100
  total: number;
}

function chordDurationToBeats(duration: string): number {
  const map: Record<string, number> = {
    'w': 4,
    'hd': 3,
    'h': 2,
    'qd': 1.5,
    'q': 1,
    '8': 0.5,
    '16': 0.25,
  };
  return map[duration] ?? 1;
}

const App: React.FC = () => {
  const { getInitialState, syncToUrl, setupPopStateListener } = useUrlState();
  const initialStateRef = useRef<ChordProgressionState | null>(null);
  
  const [state, setState] = useState<ChordProgressionState>(() => {
    // Try to get initial state from URL
    const urlState = getInitialState();
    
    if (urlState) {
      // Use URL state, fill in defaults for missing values
      const timeSignature = urlState.timeSignature || randomTimeSignature();
      const initialState: ChordProgressionState = {
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
      initialStateRef.current = initialState;
      return initialState;
    }
    
    // No URL state, use random defaults
    const timeSignature = randomTimeSignature();
    const initialState: ChordProgressionState = {
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
    initialStateRef.current = initialState;
    return initialState;
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [currentChordIndex, setCurrentChordIndex] = useState<number | null>(null);
  const [activeNoteGroups, setActiveNoteGroups] = useState<Set<string>>(new Set());
  const [lockedOptions, setLockedOptions] = useState<LockedOptions>({});
  const [loadingState, setLoadingState] = useState<LoadingState>({ isLoading: false, progress: 0, total: 0 });
  const [masterVolume, setMasterVolume] = useState(0.9);
  const [pianoVolume, setPianoVolume] = useState(0.9);
  const [metronomeVolume, setMetronomeVolume] = useState(0.75);
  const [playbackSettingsOpen, setPlaybackSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const currentLoopIdRef = useRef<number>(0);
  const metronomeEnabledRef = useRef(metronomeEnabled);
  const masterVolumeRef = useRef(masterVolume);
  const metronomeVolumeRef = useRef(metronomeVolume);
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const exportButtonRef = useRef<HTMLButtonElement | null>(null);
  const isResponsiveLayout = useMediaQuery('(max-width:980px)');
  const metronomeAudioPlayerRef = useRef<AudioPlayer | null>(null);
  const lastMetronomeBeatRef = useRef<number>(-1);
  const [exportOpen, setExportOpen] = useState(false);

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
  const exportAdapter = useMemo<ExportSourceAdapter>(() => ({
    id: 'chords',
    title: 'Export Chord Progression',
    fileBaseName: 'chords-progression',
    stems: [
      { id: 'treble', label: 'Treble', defaultSelected: true },
      { id: 'bass', label: 'Bass', defaultSelected: true },
    ],
    defaultFormat: 'wav',
    supportsFormat: (format) => ['midi', 'wav', 'mp3', 'ogg', 'flac'].includes(format),
    estimateDurationSeconds: (loopCount) => {
      const styled = generateExpandedStyledChords(state);
      const beatsPerLoop = styled.reduce((sum, measure) => {
        const trebleBeats = measure.trebleNotes.reduce((acc, item) => acc + chordDurationToBeats(item.duration), 0);
        const bassBeats = measure.bassNotes.reduce((acc, item) => acc + chordDurationToBeats(item.duration), 0);
        return sum + Math.max(trebleBeats, bassBeats);
      }, 0);
      return ((beatsPerLoop * loopCount) / Math.max(1, state.tempo)) * 60;
    },
    renderMidi: async ({ loopCount, selectedStemIds }) => {
      const includeTreble = selectedStemIds.length === 0 || selectedStemIds.includes('treble');
      const includeBass = selectedStemIds.length === 0 || selectedStemIds.includes('bass');
      const styled = generateExpandedStyledChords(state);
      const ticksPerQuarter = 480;
      const measureTicks = state.timeSignature.numerator * ticksPerQuarter;
      const events: MidiNoteEvent[] = [];
      for (let loopIndex = 0; loopIndex < loopCount; loopIndex += 1) {
        styled.forEach((measure, measureIndex) => {
          const loopOffset = loopIndex * styled.length * measureTicks;
          const measureStart = loopOffset + (measureIndex * measureTicks);
          if (includeTreble) {
            let cursor = measureStart;
            measure.trebleNotes.forEach((group) => {
              const durationTicks = Math.max(30, Math.round(chordDurationToBeats(group.duration) * ticksPerQuarter));
              group.notes.forEach((pitch) => {
                events.push({
                  midi: pitch,
                  startTick: cursor,
                  durationTicks,
                  velocity: 84,
                  channel: 0,
                });
              });
              cursor += durationTicks;
            });
          }
          if (includeBass) {
            let cursor = measureStart;
            measure.bassNotes.forEach((group) => {
              const durationTicks = Math.max(30, Math.round(chordDurationToBeats(group.duration) * ticksPerQuarter));
              group.notes.forEach((pitch) => {
                events.push({
                  midi: pitch,
                  startTick: cursor,
                  durationTicks,
                  velocity: 92,
                  channel: 1,
                });
              });
              cursor += durationTicks;
            });
          }
        });
      }
      return buildSingleTrackMidi(events, state.tempo);
    },
    renderAudio: async ({ loopCount, selectedStemIds }) => {
      const includeTreble = selectedStemIds.length === 0 || selectedStemIds.includes('treble');
      const includeBass = selectedStemIds.length === 0 || selectedStemIds.includes('bass');
      const styled = generateExpandedStyledChords(state);
      const ticksPerQuarter = 480;
      const measureTicks = state.timeSignature.numerator * ticksPerQuarter;
      const trebleEvents: MidiNoteEvent[] = [];
      const bassEvents: MidiNoteEvent[] = [];
      for (let loopIndex = 0; loopIndex < loopCount; loopIndex += 1) {
        styled.forEach((measure, measureIndex) => {
          const loopOffset = loopIndex * styled.length * measureTicks;
          const measureStart = loopOffset + (measureIndex * measureTicks);
          if (includeTreble) {
            let cursor = measureStart;
            measure.trebleNotes.forEach((group) => {
              const durationTicks = Math.max(30, Math.round(chordDurationToBeats(group.duration) * ticksPerQuarter));
              group.notes.forEach((pitch) => {
                trebleEvents.push({
                  midi: pitch,
                  startTick: cursor,
                  durationTicks,
                  velocity: 84,
                  channel: 0,
                });
              });
              cursor += durationTicks;
            });
          }
          if (includeBass) {
            let cursor = measureStart;
            measure.bassNotes.forEach((group) => {
              const durationTicks = Math.max(30, Math.round(chordDurationToBeats(group.duration) * ticksPerQuarter));
              group.notes.forEach((pitch) => {
                bassEvents.push({
                  midi: pitch,
                  startTick: cursor,
                  durationTicks,
                  velocity: 92,
                  channel: 1,
                });
              });
              cursor += durationTicks;
            });
          }
        });
      }
      const stems: Record<string, AudioBuffer> = {};
      if (trebleEvents.length > 0) {
        stems.treble = await renderMidiEventsToAudioBuffer(trebleEvents, { bpm: state.tempo });
      }
      if (bassEvents.length > 0) {
        stems.bass = await renderMidiEventsToAudioBuffer(bassEvents, { bpm: state.tempo });
      }
      const mixEvents = [...trebleEvents, ...bassEvents];
      const mix = await renderMidiEventsToAudioBuffer(mixEvents, { bpm: state.tempo });
      return { mix, stems };
    },
  }), [generateExpandedStyledChords, state]);

  useEffect(() => {
    metronomeEnabledRef.current = metronomeEnabled;
  }, [metronomeEnabled]);

  useEffect(() => {
    masterVolumeRef.current = masterVolume;
  }, [masterVolume]);

  useEffect(() => {
    metronomeVolumeRef.current = metronomeVolume;
  }, [metronomeVolume]);

  useEffect(() => {
    const playbackEngine = getPlaybackEngine();
    playbackEngine.setVolume(Math.max(0, Math.min(1, masterVolume * pianoVolume)));
  }, [masterVolume, pianoVolume]);

  const playMetronomeClick = useCallback((isDownbeat: boolean) => {
    if (!metronomeEnabledRef.current) return;
    if (!metronomeAudioPlayerRef.current) {
      metronomeAudioPlayerRef.current = new AudioPlayer({
        clickUrl: CLICK_SAMPLE_URL,
        enableReverb: false,
      });
    }
    const base = isDownbeat ? 0.8 : 0.5;
    const volume = Math.max(
      0,
      Math.min(1, base * masterVolumeRef.current * metronomeVolumeRef.current)
    );
    void metronomeAudioPlayerRef.current.playClick(volume);
  }, []);

  // Create playback update callback
  const createPlaybackCallback = useCallback((timeSignature: { numerator: number }) => {
    return (positionInBeats: number, activeNotes: Map<number, ActiveNotes>, playing: boolean) => {
      if (!playing) {
        setIsPlaying(false);
        setCurrentChordIndex(null);
        setActiveNoteGroups(new Set());
        lastMetronomeBeatRef.current = -1;
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
      const beatIndex = Math.floor(positionInBeats + 0.0001);
      if (metronomeEnabledRef.current && beatIndex !== lastMetronomeBeatRef.current) {
        lastMetronomeBeatRef.current = beatIndex;
        const isDownbeat = beatIndex % Math.max(1, beatsPerMeasure) === 0;
        playMetronomeClick(isDownbeat);
      }
      setCurrentChordIndex(currentChordIdx);
      setActiveNoteGroups(noteGroups);
    };
  }, [playMetronomeClick]);

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
      if (!urlState) {
        const baseState = initialStateRef.current;
        if (!baseState) return;
        setState(prevState => ({
          ...prevState,
          ...baseState,
          voicingOptions: prevState.voicingOptions,
          soundType: prevState.soundType,
        }));
        return;
      }

      setState(prevState => ({
        ...prevState,
        ...urlState,
        voicingOptions: prevState.voicingOptions,
        soundType: prevState.soundType,
      }));
    });
  }, [setupPopStateListener]);

  useEffect(() => {
    if (state.soundType !== 'piano-sampled') return;
    const playbackEngine = getPlaybackEngine();
    if (playbackEngine.areSamplesLoaded()) return;
    let cancelled = false;
    const preload = async () => {
      playbackEngine.setSampleLoadingCallback((loaded, total) => {
        if (cancelled) return;
        setLoadingState({ isLoading: loaded < total, progress: loaded, total });
      });
      await playbackEngine.loadSamples();
      if (!cancelled) {
        setLoadingState({ isLoading: false, progress: 0, total: 0 });
      }
      playbackEngine.setSampleLoadingCallback(null);
    };
    void preload();
    return () => {
      cancelled = true;
      playbackEngine.setSampleLoadingCallback(null);
    };
  }, [state.soundType]);

  const handleLockChange = (option: keyof LockedOptions, locked: boolean) => {
    setLockedOptions({ ...lockedOptions, [option]: locked });
  };

  const handlePlay = useCallback(async () => {
    const playbackEngine = getPlaybackEngine();
    
    if (isPlaying) {
      playbackEngine.stop();
      setIsPlaying(false);
      setCurrentChordIndex(null);
      setActiveNoteGroups(new Set());
      return;
    }

    // If using sampled piano, show loading state while samples load
    if (state.soundType === 'piano-sampled' && !playbackEngine.areSamplesLoaded()) {
      setLoadingState({ isLoading: true, progress: 0, total: 0 });
      
      // Set up progress callback
      playbackEngine.setSampleLoadingCallback((loaded, total) => {
        setLoadingState({ isLoading: true, progress: loaded, total });
      });
      
      // Load samples
      const loaded = await playbackEngine.loadSamples();
      
      // Clear loading callback
      playbackEngine.setSampleLoadingCallback(null);
      setLoadingState({ isLoading: false, progress: 0, total: 0 });
      
      if (!loaded) {
        console.warn('Failed to load piano samples');
        // Continue anyway - it will fall back to synth
      }
    }

    // Generate styled chords
    const expandedStyledChords = generateExpandedStyledChords(state);

    setIsPlaying(true);
    setCurrentChordIndex(null);
    setActiveNoteGroups(new Set());
    currentLoopIdRef.current = 0;

    // Start playback with new engine
    await playbackEngine.start(
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
      metronomeAudioPlayerRef.current?.destroy();
      metronomeAudioPlayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isResponsiveLayout && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [isResponsiveLayout, sidebarOpen]);

  // Calculate loading progress percentage
  const loadingPercent = loadingState.total > 0 
    ? Math.round((loadingState.progress / loadingState.total) * 100) 
    : 0;

  return (
    <div className="chords-app">
      <header className="chords-header">
        <IconButton
          className="chords-menu-button"
          aria-label="Open customization controls"
          onClick={() => setSidebarOpen(true)}
          size="small"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            menu
          </span>
        </IconButton>
        <h1>Chord Progression Generator</h1>
      </header>
      
      <main className="chords-main">
        {isResponsiveLayout ? (
          <Drawer
            anchor="left"
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            slotProps={{ paper: { className: 'chords-sidebar-drawer' } }}
          >
            <div className="chords-sidebar-drawer-header">
              <strong>Customize</strong>
              <IconButton
                aria-label="Close customization controls"
                onClick={() => setSidebarOpen(false)}
                size="small"
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  close
                </span>
              </IconButton>
            </div>
            <div className="chords-sidebar-drawer-content">
              <ManualControls
                state={state}
                lockedOptions={lockedOptions}
                onStateChange={(updates) => {
                  handleStateChange(updates);
                }}
                onLockChange={handleLockChange}
                onRandomize={handleRandomize}
              />
            </div>
          </Drawer>
        ) : (
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
        )}

        <div className="chords-main-content">
          <div className="chords-playback-controls">
            <button 
              onClick={handlePlay} 
              className="play-button"
              disabled={loadingState.isLoading}
            >
              <span className="material-symbols-outlined">
                {loadingState.isLoading ? 'hourglass_empty' : isPlaying ? 'stop' : 'play_arrow'}
              </span>
              {loadingState.isLoading 
                ? `Loading ${loadingPercent}%` 
                : isPlaying ? 'Stop' : 'Play'}
            </button>
            <AppTooltip title={metronomeEnabled ? 'Metronome: On' : 'Metronome: Off'}>
              <MetronomeToggleButton
                enabled={metronomeEnabled}
                onToggle={() => setMetronomeEnabled((previous) => !previous)}
                className="chords-metronome-toggle"
                activeClassName="active"
                showOnLabel={false}
                tooltipOn="Metronome: On"
                tooltipOff="Metronome: Off"
                includeNativeTitle={false}
                includeDataTooltip={false}
              />
            </AppTooltip>
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
                disabled={loadingState.isLoading}
              >
                {SOUND_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <AppTooltip title="Export">
              <button
                ref={exportButtonRef}
                type="button"
                className={`chords-settings-button ${exportOpen ? 'active' : ''}`}
                onClick={() => setExportOpen((previous) => !previous)}
                aria-label="Export progression"
              >
                <span className="material-symbols-outlined">download</span>
              </button>
            </AppTooltip>
            <SharedExportPopover
              open={exportOpen}
              onClose={() => setExportOpen(false)}
              anchorEl={exportButtonRef.current}
              adapter={exportAdapter}
              persistKey="chords"
            />
            <AppTooltip title="Playback settings">
              <button
                ref={settingsButtonRef}
                type="button"
                className={`chords-settings-button ${playbackSettingsOpen ? 'active' : ''}`}
                onClick={() => setPlaybackSettingsOpen((previous) => !previous)}
                aria-label="Playback settings"
              >
                <span className="material-symbols-outlined">tune</span>
              </button>
            </AppTooltip>
            <Popover
              open={playbackSettingsOpen}
              onClose={() => setPlaybackSettingsOpen(false)}
              anchorEl={settingsButtonRef.current}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              disableAutoFocus
              disableEnforceFocus
              disableRestoreFocus
              slotProps={{ paper: { className: 'chords-playback-settings-popover' } }}
            >
              <div className="chords-playback-settings-menu">
                <label className="chords-playback-setting-row">
                  <span>Master volume</span>
                  <AppSlider
                    className="chords-playback-slider"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round(masterVolume * 100)}
                    aria-label="Master volume"
                    onChange={(event) => setMasterVolume(Number(event.target.value) / 100)}
                  />
                  <strong>{Math.round(masterVolume * 100)}</strong>
                </label>
                <label className="chords-playback-setting-row">
                  <span>Piano volume</span>
                  <AppSlider
                    className="chords-playback-slider"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round(pianoVolume * 100)}
                    aria-label="Piano volume"
                    onChange={(event) => setPianoVolume(Number(event.target.value) / 100)}
                  />
                  <strong>{Math.round(pianoVolume * 100)}</strong>
                </label>
                <label className="chords-playback-setting-row">
                  <span>Metronome volume</span>
                  <AppSlider
                    className="chords-playback-slider"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round(metronomeVolume * 100)}
                    aria-label="Metronome volume"
                    onChange={(event) =>
                      setMetronomeVolume(Number(event.target.value) / 100)
                    }
                  />
                  <strong>{Math.round(metronomeVolume * 100)}</strong>
                </label>
              </div>
            </Popover>
          </div>
          <div className="chords-score">
            <ChordScoreRenderer
              state={state}
              currentChordIndex={currentChordIndex}
              activeNoteGroups={activeNoteGroups}
              isPlaying={isPlaying}
            />
          </div>
          
          <footer className="chords-footer">
            <span className="footer-attribution">
              Piano samples: &ldquo;Salamander Grand Piano&rdquo; by Alexander Holm, licensed under{' '}
              <a 
                href="https://creativecommons.org/licenses/by/3.0/" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                CC BY 3.0
              </a>
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default App;

