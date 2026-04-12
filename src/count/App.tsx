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
import type { SubdivisionVolumes, SubdivisionChannel, BeatEvent, VoiceMode, SubdivisionLevel } from './engine/types';
import { eighthBaseSlotsPerEighth, slotsPerBeat, getSubdivisionOptions, getDefaultSubdivisionLevel } from './engine/types';
import { useSongProfiles, loadLastSession, saveLastSession } from './hooks/useSongProfiles';
import { readUrlParams, hasUrlParams, useUrlSync } from './hooks/useUrlParams';
import { createAppAnalytics } from '../shared/utils/analytics';

const analytics = createAppAnalytics('count');
const DEFAULT_BPM = 120;
const DEFAULT_TIME_SIG: TimeSignature = { numerator: 4, denominator: 4 };
const DEFAULT_VOLUMES: SubdivisionVolumes = {
  accent: 1.0,
  quarter: 0.8,
  eighth: 0.6,
  sixteenth: 0.0,
};
const DEFAULT_EIGHTH_VOL = 0.5;
const DEFAULT_SIXTEENTH_VOL = 0.3;

function getInitialState() {
  const fromUrl = hasUrlParams() ? readUrlParams() : null;
  const saved = fromUrl ? null : loadLastSession();
  return {
    bpm: fromUrl?.bpm ?? saved?.bpm ?? DEFAULT_BPM,
    timeSignature: fromUrl?.timeSignature ?? saved?.timeSignature ?? DEFAULT_TIME_SIG,
    volumes: fromUrl?.volumes ?? saved?.volumes ?? DEFAULT_VOLUMES,
    beatGrouping: fromUrl?.beatGrouping ?? saved?.beatGrouping ?? undefined,
    subdivisionLevel: fromUrl?.subdivisionLevel,
    voiceMode: fromUrl?.voiceMode,
    voiceGain: fromUrl?.voiceGain,
    clickGain: fromUrl?.clickGain,
    drumGain: fromUrl?.drumGain,
    channelVoiceMutes: fromUrl?.channelVoiceMutes,
    channelClickMutes: fromUrl?.channelClickMutes,
    channelDrumMutes: fromUrl?.channelDrumMutes,
  };
}

function computeSubdivsPerMeasure(ts: TimeSignature, groupingStr: string | undefined, level: SubdivisionLevel): number {
  const groups = groupingStr
    ? (parseBeatGrouping(groupingStr) ?? getDefaultBeatGrouping(ts))
    : getDefaultBeatGrouping(ts);
  const isEighthBase = ts.denominator === 8;
  let total = 0;
  if (isEighthBase) {
    const slots = eighthBaseSlotsPerEighth(level);
    for (const g of groups) total += g * slots;
  } else {
    const slots = slotsPerBeat(level);
    for (const g of groups) total += g * slots;
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
  const [subdivisionLevel, setSubdivisionLevel] = useState<SubdivisionLevel>(initial.subdivisionLevel ?? 2);
  const [voiceGain, setVoiceGain] = useState(initial.voiceGain ?? 1.0);
  const [clickGain, setClickGain] = useState(initial.clickGain ?? 0.5);
  const [drumGain, setDrumGain] = useState(initial.drumGain ?? 0);
  const [channelVoiceMutes, setChannelVoiceMutes] = useState<Set<SubdivisionChannel>>(initial.channelVoiceMutes ?? new Set());
  const [channelClickMutes, setChannelClickMutes] = useState<Set<SubdivisionChannel>>(initial.channelClickMutes ?? new Set());
  const [channelDrumMutes, setChannelDrumMutes] = useState<Set<SubdivisionChannel>>(initial.channelDrumMutes ?? new Set());
  const [beatGrouping, setBeatGrouping] = useState<string | undefined>(initial.beatGrouping);
  const [playing, setPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState<BeatEvent | null>(null);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>(initial.voiceMode ?? 'counting');

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

  useUrlSync({
    bpm, timeSignature, subdivisionLevel, voiceMode,
    voiceGain, clickGain, drumGain, beatGrouping,
    volumes, channelVoiceMutes, channelClickMutes, channelDrumMutes,
  });

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

  const playStartRef = useRef<number>(0);

  const handlePlay = useCallback(async () => {
    const engine = getEngine();
    if (playing) {
      engine.stop();
      setPlaying(false);
      setCurrentBeat(null);
      analytics.trackSessionEnd(playStartRef.current);
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
      drumGain,
      perBeatVolumes,
      voiceMode,
      subdivisionLevel,
      channelVoiceMutes: [...channelVoiceMutes],
      channelClickMutes: [...channelClickMutes],
      channelDrumMutes: [...channelDrumMutes],
    });
    setPlaying(true);
    playStartRef.current = Date.now();
    analytics.trackEvent('playback_start', {
      bpm,
      time_signature: `${timeSignature.numerator}/${timeSignature.denominator}`,
      subdivision_level: subdivisionLevel,
      voice_mode: voiceMode,
    });
  }, [playing, bpm, timeSignature, volumes, beatGrouping, voiceGain, clickGain, drumGain, perBeatVolumes, voiceMode, subdivisionLevel, channelVoiceMutes, channelClickMutes, channelDrumMutes, getEngine]);

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
      const needsEighth = (typeof level === 'number' && level >= 2) || level === 'swing8';
      const needsSixteenth = level === 4;
      if (needsEighth && next.eighth === 0) next.eighth = DEFAULT_EIGHTH_VOL;
      if (needsSixteenth && next.sixteenth === 0) next.sixteenth = DEFAULT_SIXTEENTH_VOL;
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

  const handleChannelVoiceMute = useCallback((channel: SubdivisionChannel, muted: boolean) => {
    setChannelVoiceMutes(prev => {
      const next = new Set(prev);
      if (muted) next.add(channel); else next.delete(channel);
      engineRef.current?.setChannelVoiceMutes(next);
      return next;
    });
  }, []);

  const handleChannelClickMute = useCallback((channel: SubdivisionChannel, muted: boolean) => {
    setChannelClickMutes(prev => {
      const next = new Set(prev);
      if (muted) next.add(channel); else next.delete(channel);
      engineRef.current?.setChannelClickMutes(next);
      return next;
    });
  }, []);

  const handleDrumGain = useCallback((v: number) => {
    setDrumGain(v);
    engineRef.current?.setDrumGain(v);
  }, []);

  const handleChannelDrumMute = useCallback((channel: SubdivisionChannel, muted: boolean) => {
    setChannelDrumMutes(prev => {
      const next = new Set(prev);
      if (muted) next.add(channel); else next.delete(channel);
      engineRef.current?.setChannelDrumMutes(next);
      return next;
    });
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
    name?: string;
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
    analytics.trackEvent('profile_load', { bpm: profile.bpm });
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
        <h1 className="pulse-title">COUNT ME IN</h1>
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
          onSave={(...args) => { profiles.save(...args); analytics.trackEvent('profile_save'); }}
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

            <div className="pulse-playback-controls">
              <div className="pulse-sound-toggles">
                <button
                  type="button"
                  className={`pulse-sound-toggle ${voiceGain > 0 ? 'is-active' : ''}`}
                  onClick={() => handleVoiceGain(voiceGain > 0 ? 0 : 1)}
                  aria-label={voiceGain > 0 ? 'Mute voice' : 'Unmute voice'}
                >
                  VOICE: {voiceGain > 0 ? 'ON' : 'OFF'}
                </button>
                <button
                  type="button"
                  className={`pulse-sound-toggle ${clickGain > 0 ? 'is-active' : ''}`}
                  onClick={() => handleClickGain(clickGain > 0 ? 0 : 0.5)}
                  aria-label={clickGain > 0 ? 'Mute click' : 'Unmute click'}
                >
                  CLICK: {clickGain > 0 ? 'ON' : 'OFF'}
                </button>
                <button
                  type="button"
                  className={`pulse-sound-toggle ${drumGain > 0 ? 'is-active' : ''}`}
                  onClick={() => handleDrumGain(drumGain > 0 ? 0 : 0.7)}
                  aria-label={drumGain > 0 ? 'Mute drum' : 'Unmute drum'}
                >
                  DRUM: {drumGain > 0 ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="pulse-voice-mode-toggle" role="radiogroup" aria-label="Counting style">
                <button
                  type="button"
                  className={`pulse-voice-mode-btn ${voiceMode === 'counting' ? 'is-active' : ''}`}
                  onClick={() => handleVoiceModeChange('counting')}
                  role="radio"
                  aria-checked={voiceMode === 'counting'}
                >
                  1 e + a
                </button>
                <button
                  type="button"
                  className={`pulse-voice-mode-btn ${voiceMode === 'takadimi' ? 'is-active' : ''}`}
                  onClick={() => handleVoiceModeChange('takadimi')}
                  role="radio"
                  aria-checked={voiceMode === 'takadimi'}
                >
                  Ta ka di mi
                </button>
              </div>
            </div>
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
          voiceEnabled={voiceGain > 0}
          clickEnabled={clickGain > 0}
          drumEnabled={drumGain > 0}
          channelVoiceMutes={channelVoiceMutes}
          channelClickMutes={channelClickMutes}
          channelDrumMutes={channelDrumMutes}
          subdivisionLevel={subdivisionLevel}
          timeSignature={timeSignature}
          onChange={handleVolumesChange}
          onChannelVoiceMute={handleChannelVoiceMute}
          onChannelClickMute={handleChannelClickMute}
          onChannelDrumMute={handleChannelDrumMute}
          onSubdivisionLevelChange={handleSubdivisionLevelChange}
        />
      </main>
    </div>
  );
}
