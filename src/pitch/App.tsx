import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SkipToMain from '../shared/components/SkipToMain';
import OnscreenPianoKeyboard from '../shared/components/music/OnscreenPianoKeyboard';
import {
  MicrophonePitchInput,
  type MicrophoneDevice,
} from '../shared/music/pitch/microphonePitchInput';
import type { PitchInfo } from '../shared/music/pitch/pitchDetection';
import { createAppAnalytics } from '../shared/utils/analytics';
const analytics = createAppAnalytics('pitch');

const PITCH_TITLE = 'Find Your Pitch';
const PITCH_TAGLINE = 'A simple free online voice tuner';

interface PitchSample {
  id: number;
  at: number;
  pitch: PitchInfo;
}

const MAX_HISTORY = 96;
const HISTORY_VIEW = 48;
const PITCH_HOLD_MS = 360;
const HISTORY_SAMPLE_MS = 180;
const SMOOTHING_ALPHA = 0.24;

function getTuningLabel(cents: number): string {
  if (Math.abs(cents) <= 8) return 'In tune';
  return cents < 0 ? 'Flat' : 'Sharp';
}

function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export default function App(): React.ReactElement {
  const inputRef = useRef<MicrophonePitchInput | null>(null);
  const synthContextRef = useRef<AudioContext | null>(null);
  const synthNodesRef = useRef<Map<number, { osc: OscillatorNode; gain: GainNode }>>(new Map());
  const lastHistoryPushRef = useRef(0);
  const historyIdRef = useRef(0);
  const lastPitchSeenAtRef = useRef(0);
  const targetPitchRef = useRef<PitchInfo | null>(null);
  const [listening, setListening] = useState(false);
  const [devices, setDevices] = useState<MicrophoneDevice[]>([{ id: 'default', name: 'System default' }]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('default');
  const [activeInputLabel, setActiveInputLabel] = useState<string | null>(null);
  const [displayPitch, setDisplayPitch] = useState<PitchInfo | null>(null);
  const [history, setHistory] = useState<PitchSample[]>([]);
  const [activeKeyboardNotes, setActiveKeyboardNotes] = useState<Set<number>>(new Set());

  const refreshDevices = useCallback(async () => {
    const nextDevices = await MicrophonePitchInput.listDevices();
    setDevices(nextDevices);
    setSelectedDeviceId((current) => (
      nextDevices.some((device) => device.id === current) ? current : 'default'
    ));
  }, []);

  const pitchListenStartRef = useRef<number>(0);
  const stopListening = useCallback(() => {
    inputRef.current?.stop();
    inputRef.current = null;
    setListening(false);
    setActiveInputLabel(null);
    targetPitchRef.current = null;
    setDisplayPitch(null);
    analytics.trackSessionEnd(pitchListenStartRef.current);
  }, []);

  const startListening = useCallback(async (deviceId: string) => {
    const input = new MicrophonePitchInput({
      onPitchDetected: (_midi, _confidence, pitchInfo) => {
        const now = Date.now();
        if (!pitchInfo) {
          if (now - lastPitchSeenAtRef.current > PITCH_HOLD_MS) {
            targetPitchRef.current = null;
          }
          return;
        }
        lastPitchSeenAtRef.current = now;
        targetPitchRef.current = pitchInfo;
        if (now - lastHistoryPushRef.current < HISTORY_SAMPLE_MS) return;
        lastHistoryPushRef.current = now;
        setHistory((prev) => {
          const next = [...prev, { id: ++historyIdRef.current, at: now, pitch: pitchInfo }];
          if (next.length > MAX_HISTORY) next.splice(0, next.length - MAX_HISTORY);
          return next;
        });
      },
    });
    await input.start(deviceId);
    inputRef.current = input;
    setListening(true);
    setActiveInputLabel(input.getActiveInputLabel());
    void refreshDevices();
    pitchListenStartRef.current = Date.now();
    analytics.trackEvent('listening_start');
  }, [refreshDevices]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      if (now - lastPitchSeenAtRef.current > PITCH_HOLD_MS) {
        targetPitchRef.current = null;
      }

      setDisplayPitch((previous) => {
        const target = targetPitchRef.current;
        if (!target) return null;
        if (!previous) return target;
        return {
          ...target,
          frequency: previous.frequency + (target.frequency - previous.frequency) * SMOOTHING_ALPHA,
          cents: previous.cents + (target.cents - previous.cents) * SMOOTHING_ALPHA,
        };
      });
    }, 120);
    return () => window.clearInterval(timer);
  }, []);

  const restartListeningForDevice = useCallback(async (deviceId: string) => {
    stopListening();
    try {
      await startListening(deviceId);
    } catch (error) {
      console.error('Microphone access failed:', error);
    }
  }, [startListening, stopListening]);

  useEffect(() => {
    void refreshDevices();
    if (!navigator.mediaDevices?.addEventListener) return;
    const handleDeviceChange = () => { void refreshDevices(); };
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [refreshDevices]);

  useEffect(() => () => {
    stopListening();
    synthNodesRef.current.forEach(({ osc, gain }) => {
      gain.gain.cancelScheduledValues(0);
      gain.gain.setValueAtTime(0, 0);
      try { osc.stop(); } catch { /* ignore */ }
    });
    synthNodesRef.current.clear();
    if (synthContextRef.current) {
      void synthContextRef.current.close();
      synthContextRef.current = null;
    }
  }, [stopListening]);

  const handleToggleListening = useCallback(async () => {
    if (listening) {
      stopListening();
      return;
    }
    try {
      await startListening(selectedDeviceId);
    } catch (error) {
      console.error('Microphone access failed:', error);
    }
  }, [listening, selectedDeviceId, startListening, stopListening]);

  const ensureSynthContext = useCallback(async (): Promise<AudioContext> => {
    if (!synthContextRef.current) {
      synthContextRef.current = new AudioContext();
    }
    if (synthContextRef.current.state === 'suspended') {
      await synthContextRef.current.resume();
    }
    return synthContextRef.current;
  }, []);

  const playReferenceNote = useCallback(async (midi: number) => {
    if (synthNodesRef.current.has(midi)) return;
    const audioContext = await ensureSynthContext();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'triangle';
    osc.frequency.value = midiToFrequency(midi);
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.03);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    synthNodesRef.current.set(midi, { osc, gain });
    setActiveKeyboardNotes((prev) => new Set(prev).add(midi));
  }, [ensureSynthContext]);

  const stopReferenceNote = useCallback((midi: number) => {
    const node = synthNodesRef.current.get(midi);
    if (!node || !synthContextRef.current) return;
    const now = synthContextRef.current.currentTime;
    node.gain.gain.cancelScheduledValues(now);
    node.gain.gain.setValueAtTime(Math.max(node.gain.gain.value, 0.0001), now);
    node.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    node.osc.stop(now + 0.1);
    synthNodesRef.current.delete(midi);
    setActiveKeyboardNotes((prev) => {
      const next = new Set(prev);
      next.delete(midi);
      return next;
    });
  }, []);

  const cents = displayPitch?.cents ?? 0;
  const centsDisplay = Math.max(-50, Math.min(50, cents * 1.35));
  const tuningLabel = getTuningLabel(centsDisplay);
  const recentHistory = history.slice(-HISTORY_VIEW);
  const historyRange = useMemo(() => {
    const min = 47;
    const max = 81;
    return { min, max, span: max - min };
  }, []);
  const historyPath = useMemo(() => {
    const total = recentHistory.length;
    if (total === 0) return { line: '', smoothPath: '', points: [] as Array<{ x: number; y: number; id: number }> };
    const points = recentHistory.map((sample, index) => {
      const semitone = sample.pitch.midi + sample.pitch.cents / 100;
      const clamped = Math.max(historyRange.min, Math.min(historyRange.max, semitone));
      const x = total === 1 ? 50 : (index / (total - 1)) * 100;
      const y = ((historyRange.max - clamped) / historyRange.span) * 100;
      return { x, y, id: sample.id };
    });
    const line = points.map((point) => `${point.x},${point.y}`).join(' ');
    if (points.length < 2) return { line, smoothPath: '', points };
    const smoothPath = points.reduce((path, point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      const prev = points[index - 1];
      const cx = (prev.x + point.x) / 2;
      return `${path} Q ${cx} ${prev.y}, ${point.x} ${point.y}`;
    }, '');
    return { line, smoothPath, points };
  }, [historyRange.max, historyRange.min, historyRange.span, recentHistory]);

  return (
    <div className="pitch-app">
      <SkipToMain />
      <main id="main" className="pitch-shell">
        <header className="pitch-header">
          <div className="pitch-header-main">
            <h1>{PITCH_TITLE}</h1>
            <p>{PITCH_TAGLINE}</p>
          </div>
          <div className="pitch-header-input">
            <label className="pitch-device">
              <span>Input</span>
              <select
                value={selectedDeviceId}
                onChange={(event) => {
                  const nextId = event.target.value;
                  setSelectedDeviceId(nextId);
                  if (listening) void restartListeningForDevice(nextId);
                }}
              >
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>{device.name}</option>
                ))}
              </select>
            </label>
            <button
              className={`pitch-listen-btn ${listening ? 'active' : ''}`}
              onClick={() => { void handleToggleListening(); }}
            >
              {listening ? 'Stop listening' : 'Start listening'}
            </button>
            <span className="pitch-mic-status">
              {listening ? `Using: ${activeInputLabel || 'Microphone'}` : 'Mic off'}
            </span>
          </div>
        </header>

        <section className="pitch-main-card pitch-card">
          <div className="pitch-note-display">
            <div className="pitch-note">{displayPitch?.noteName ?? '--'}</div>
            <div className="pitch-frequency">
              {displayPitch ? `${displayPitch.frequency.toFixed(1)} Hz` : 'No pitch detected'}
            </div>
          </div>

          <div className="pitch-meter-wrap">
            <div className="pitch-meter-labels">
              <span>Flat</span>
              <span>In tune</span>
              <span>Sharp</span>
            </div>
            <div className="pitch-meter">
              <div className="pitch-meter-center" />
              <div className="pitch-meter-pointer" style={{ left: `${50 + centsDisplay}%` }} />
            </div>
            <div className="pitch-meter-readout">
              <strong>{Math.round(centsDisplay)} cents</strong> - {displayPitch ? tuningLabel : 'Waiting for voice'}
            </div>
          </div>

          <h2 className="pitch-section-title">Recent contour</h2>
          <div className="pitch-history-graph" aria-label="Recent detected pitch graph">
            <svg className="pitch-history-svg" viewBox="0 0 100 100" preserveAspectRatio="none" role="img">
              <line x1="0" y1="50" x2="100" y2="50" className="pitch-history-guide" />
              {historyPath.smoothPath
                ? <path d={historyPath.smoothPath} className="pitch-history-line" />
                : (historyPath.line && <polyline points={historyPath.line} className="pitch-history-line" />)}
            </svg>
          </div>
        </section>

        <section className="pitch-reference-card pitch-card">
          <h2 className="pitch-section-title">Reference keyboard</h2>
          <OnscreenPianoKeyboard
            octaves={[3, 4, 5]}
            activeNotes={activeKeyboardNotes}
            onNoteOn={(midi) => { void playReferenceNote(midi); }}
            onNoteOff={stopReferenceNote}
          />
        </section>
      </main>
    </div>
  );
}

