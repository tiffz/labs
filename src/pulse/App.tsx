import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Popover from '@mui/material/Popover';
import type { TimeSignature } from '../shared/rhythm/types';
import {
  getDefaultBeatGrouping,
  parseBeatGrouping,
} from '../shared/rhythm/timeSignatureUtils';
import { BpmControl } from './components/BpmControl';
import { SubdivisionMixer } from './components/SubdivisionMixer';
import { TimeSignatureControl } from './components/TimeSignatureControl';
import { BeatDisplay } from './components/BeatDisplay';
import { SongProfileManager } from './components/SongProfileManager';
import { MetronomeEngine } from './engine/MetronomeEngine';
import type { SubdivisionVolumes, BeatEvent, VoiceMode, SubdivisionLevel } from './engine/types';
import { eighthBaseSlotsPerEighth, getSubdivisionOptions, getDefaultSubdivisionLevel } from './engine/types';
import { useSongProfiles, loadLastSession, saveLastSession } from './hooks/useSongProfiles';

const DEFAULT_BPM = 120;
const DEFAULT_TIME_SIG: TimeSignature = { numerator: 4, denominator: 4 };
const DEFAULT_VOLUMES: SubdivisionVolumes = {
  accent: 1.0,
  quarter: 0.8,
  eighth: 0.0,
  sixteenth: 0.0,
};
const DEFAULT_EIGHTH_VOL = 0.5;
const DEFAULT_SIXTEENTH_VOL = 0.3;

function getInitialState() {
  const saved = loadLastSession();
  return {
    bpm: saved?.bpm ?? DEFAULT_BPM,
    timeSignature: saved?.timeSignature ?? DEFAULT_TIME_SIG,
    volumes: saved?.volumes ?? DEFAULT_VOLUMES,
    beatGrouping: saved?.beatGrouping ?? undefined,
  };
}

function computeSubdivsPerMeasure(ts: TimeSignature, groupingStr: string | undefined, level: SubdivisionLevel): number {
  const groups = groupingStr
    ? (parseBeatGrouping(groupingStr) ?? getDefaultBeatGrouping(ts))
    : getDefaultBeatGrouping(ts);
  const isEighthBase = ts.denominator === 8;
  let total = 0;
  if (isEighthBase) {
    const slotsPerEighth = eighthBaseSlotsPerEighth(level);
    for (const g of groups) {
      total += g * slotsPerEighth;
    }
  } else {
    for (const g of groups) {
      total += g * level;
    }
  }
  return total;
}

const POPOVER_PAPER_SX = {
  bgcolor: 'var(--pulse-bg)',
  border: '1px solid var(--pulse-accent)',
  borderRadius: 0,
  boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
  maxHeight: 420,
  width: 380,
  overflowY: 'auto' as const,
  p: '14px',
};

export default function App() {
  const initial = useRef(getInitialState()).current;
  const [bpm, setBpm] = useState(initial.bpm);
  const [timeSignature, setTimeSignature] = useState<TimeSignature>(initial.timeSignature);
  const [volumes, setVolumes] = useState<SubdivisionVolumes>(initial.volumes);
  const [subdivisionLevel, setSubdivisionLevel] = useState<SubdivisionLevel>(2);
  const [voiceGain, setVoiceGain] = useState(1.0);
  const [clickGain, setClickGain] = useState(0.5);
  const [beatGrouping, setBeatGrouping] = useState<string | undefined>(initial.beatGrouping);
  const [playing, setPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState<BeatEvent | null>(null);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('counting');

  const [profileAnchor, setProfileAnchor] = useState<HTMLElement | null>(null);

  const subdivCount = useMemo(
    () => computeSubdivsPerMeasure(timeSignature, beatGrouping, subdivisionLevel),
    [timeSignature, beatGrouping, subdivisionLevel],
  );
  const [perBeatVolumes, setPerBeatVolumes] = useState<number[]>(() =>
    Array(subdivCount).fill(1.0),
  );

  useEffect(() => {
    setPerBeatVolumes(Array(subdivCount).fill(1.0));
  }, [subdivCount]);

  const engineRef = useRef<MetronomeEngine | null>(null);

  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new MetronomeEngine();
    }
    return engineRef.current;
  }, []);

  const profiles = useSongProfiles();

  useEffect(() => {
    saveLastSession({ bpm, timeSignature, volumes, beatGrouping });
  }, [bpm, timeSignature, volumes, beatGrouping]);

  const handlePlay = useCallback(async () => {
    const engine = getEngine();
    if (playing) {
      engine.stop();
      setPlaying(false);
      setCurrentBeat(null);
      return;
    }
    engine.onBeat((evt) => setCurrentBeat(evt));
    await engine.start({
      bpm,
      timeSignature,
      volumes,
      beatGrouping,
      voiceGain,
      clickGain,
      perBeatVolumes,
      voiceMode,
      subdivisionLevel,
    });
    setPlaying(true);
  }, [playing, bpm, timeSignature, volumes, beatGrouping, voiceGain, clickGain, perBeatVolumes, voiceMode, subdivisionLevel, getEngine]);

  const handleBpmChange = useCallback((newBpm: number) => {
    setBpm(newBpm);
    engineRef.current?.setTempo(newBpm);
  }, []);

  const handleTimeSignatureChange = useCallback((ts: TimeSignature, grouping?: string) => {
    setTimeSignature(ts);
    setBeatGrouping(ts.denominator === 4 ? undefined : grouping);
    engineRef.current?.setTimeSignature(ts, ts.denominator === 4 ? undefined : grouping);

    setSubdivisionLevel((prev) => {
      const available = getSubdivisionOptions(ts);
      if (available.some((o) => o.level === prev)) return prev;
      const next = getDefaultSubdivisionLevel(ts);
      engineRef.current?.setSubdivisionLevel(next);
      return next;
    });
  }, []);

  const handleVolumesChange = useCallback((v: SubdivisionVolumes) => {
    setVolumes(v);
    engineRef.current?.setSubdivisionVolumes(v);
  }, []);

  const handleSubdivisionLevelChange = useCallback((level: SubdivisionLevel) => {
    setSubdivisionLevel(level);
    setVolumes((prev) => {
      const next = { ...prev };
      if (next.eighth === 0) next.eighth = DEFAULT_EIGHTH_VOL;
      if (level === 4 && next.sixteenth === 0) next.sixteenth = DEFAULT_SIXTEENTH_VOL;
      engineRef.current?.setSubdivisionVolumes(next);
      return next;
    });
    engineRef.current?.setSubdivisionLevel(level);
  }, []);

  const handleVoiceGain = useCallback((v: number) => {
    setVoiceGain(v);
    engineRef.current?.setVoiceGain(v);
  }, []);

  const handleClickGain = useCallback((v: number) => {
    setClickGain(v);
    engineRef.current?.setClickGain(v);
  }, []);

  const handleVoiceModeChange = useCallback((mode: VoiceMode) => {
    setVoiceMode(mode);
    engineRef.current?.setVoiceMode(mode);
  }, []);

  const handleBeatVolumeChange = useCallback((beatIndex: number, volume: number) => {
    setPerBeatVolumes((prev) => {
      const next = [...prev];
      next[beatIndex] = volume;
      engineRef.current?.setPerBeatVolumes(next);
      return next;
    });
  }, []);

  const handleLoadProfile = useCallback((profile: {
    bpm: number;
    timeSignature: TimeSignature;
    volumes: SubdivisionVolumes;
    beatGrouping?: string;
  }) => {
    setBpm(profile.bpm);
    setTimeSignature(profile.timeSignature);
    setVolumes(profile.volumes);
    setBeatGrouping(profile.beatGrouping);
    setProfileAnchor(null);
    if (engineRef.current) {
      engineRef.current.setTempo(profile.bpm);
      engineRef.current.setTimeSignature(profile.timeSignature, profile.beatGrouping);
      engineRef.current.setSubdivisionVolumes(profile.volumes);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      handlePlay();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlay]);

  const profilesOpen = Boolean(profileAnchor);

  return (
    <div className="pulse-app">
      <header className="pulse-header">
        <h1 className="pulse-title">PROJECT PULSE</h1>
        <div className="pulse-header-actions">
          <button
            className={`pulse-header-btn ${profilesOpen ? 'is-active' : ''}`}
            onClick={(e) => setProfileAnchor(profilesOpen ? null : e.currentTarget)}
            type="button"
          >
            PROFILES{profiles.profiles.length > 0 ? ` (${profiles.profiles.length})` : ''}
          </button>
        </div>
      </header>

      <Popover
        open={profilesOpen}
        anchorEl={profileAnchor}
        onClose={() => setProfileAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: POPOVER_PAPER_SX } }}
      >
        <div className="pulse-header-dropdown-title">SONG PROFILES</div>
        <SongProfileManager
          currentBpm={bpm}
          currentTimeSignature={timeSignature}
          currentVolumes={volumes}
          currentBeatGrouping={beatGrouping}
          profiles={profiles.profiles}
          onSave={profiles.save}
          onLoad={handleLoadProfile}
          onDelete={profiles.remove}
        />
      </Popover>

      <main className="pulse-main">
        <div className="pulse-top-row">
          <section className="pulse-transport-left">
            <BpmControl bpm={bpm} onChange={handleBpmChange} />
          </section>

          <section className="pulse-transport-center">
            <button
              className={`pulse-play-btn ${playing ? 'is-active' : ''}`}
              onClick={handlePlay}
              aria-label={playing ? 'Stop' : 'Play'}
            >
              {playing ? 'STOP' : 'PLAY'}
            </button>
            <BeatDisplay
              currentBeat={currentBeat}
              timeSignature={timeSignature}
              beatGrouping={beatGrouping}
              playing={playing}
              perBeatVolumes={perBeatVolumes}
              onBeatVolumeChange={handleBeatVolumeChange}
              subdivisionLevel={subdivisionLevel}
              voiceMode={voiceMode}
            />
          </section>

          <section className="pulse-transport-right">
            <TimeSignatureControl
              timeSignature={timeSignature}
              beatGrouping={beatGrouping}
              onChange={handleTimeSignatureChange}
            />
          </section>
        </div>

        <SubdivisionMixer
          volumes={volumes}
          voiceGain={voiceGain}
          clickGain={clickGain}
          voiceMode={voiceMode}
          subdivisionLevel={subdivisionLevel}
          timeSignature={timeSignature}
          onChange={handleVolumesChange}
          onVoiceGainChange={handleVoiceGain}
          onClickGainChange={handleClickGain}
          onVoiceModeChange={handleVoiceModeChange}
          onSubdivisionLevelChange={handleSubdivisionLevelChange}
        />
      </main>
    </div>
  );
}
