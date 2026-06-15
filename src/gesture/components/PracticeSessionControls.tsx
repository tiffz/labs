import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { readGestureDriveAccessToken } from '../drive/readGestureDriveAccessToken';
import { useGestureSessionWarmup } from '../hooks/useGestureSessionWarmup';
import {
  isGestureSessionPhotoDisplayReady,
  prefetchGestureSessionPhotoUntilReady,
} from '../media/gestureSessionPhotoPipeline';
import {
  readGesturePracticeSessionConfig,
  writeGesturePracticeSessionConfig,
  type GesturePracticeTimerPreset,
} from '../practice/gesturePracticeConfigStorage';
import { buildGestureSessionQueueFromConfig } from '../session/gestureSessionQueueFromConfig';
import type { GestureDrawRecord, GesturePackFile, SessionConfig } from '../types';

const PRESETS = [
  { label: '30s', sec: 30 },
  { label: '1 min', sec: 60 },
  { label: '2 min', sec: 120 },
  { label: '5 min', sec: 300 },
  { label: '10 min', sec: 600 },
] as const;

const CUSTOM_PRESET = 'custom' as const;

type TimerPreset = GesturePracticeTimerPreset;

type SessionLengthMode = 'endless' | 'limited';

type PracticeSessionConfigContextValue = {
  starting: boolean;
  startError: string | null;
  canStart: boolean;
  handleEnterRoom: () => void;
  timerPreset: TimerPreset;
  setTimerPreset: (value: TimerPreset) => void;
  durationSec: number;
  setDurationSec: (value: number) => void;
  customDurationSec: string;
  setCustomDurationSec: (value: string) => void;
  sessionLengthMode: SessionLengthMode;
  setSessionLengthMode: (value: SessionLengthMode) => void;
  photoLimit: string;
  setPhotoLimit: (value: string) => void;
  prioritizeLeastDrawn: boolean;
  setPrioritizeLeastDrawn: (value: boolean) => void;
  shuffle: boolean;
  setShuffle: (value: boolean) => void;
};

const PracticeSessionConfigContext = createContext<PracticeSessionConfigContextValue | null>(
  null,
);

function usePracticeSessionConfig(): PracticeSessionConfigContextValue {
  const ctx = useContext(PracticeSessionConfigContext);
  if (!ctx) {
    throw new Error('usePracticeSessionConfig must be used within PracticeSessionConfigProvider');
  }
  return ctx;
}

type PracticeSessionConfigProviderProps = {
  selectedPackIds: string[];
  activeTagFilters: string[];
  packFiles: GesturePackFile[];
  drawHistory: GestureDrawRecord[];
  onStart: (config: SessionConfig) => void;
  children: ReactNode;
};

function PracticeSessionConfigProvider({
  selectedPackIds,
  activeTagFilters,
  packFiles,
  drawHistory,
  onStart,
  children,
}: PracticeSessionConfigProviderProps): ReactElement {
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState(
    () => readGesturePracticeSessionConfig()?.durationSec ?? 60,
  );
  const [timerPreset, setTimerPreset] = useState<TimerPreset>(
    () => readGesturePracticeSessionConfig()?.timerPreset ?? 60,
  );
  const [customDurationSec, setCustomDurationSec] = useState(
    () => readGesturePracticeSessionConfig()?.customDurationSec ?? '90',
  );
  const [prioritizeLeastDrawn, setPrioritizeLeastDrawn] = useState(
    () => readGesturePracticeSessionConfig()?.prioritizeLeastDrawn ?? true,
  );
  const [shuffle, setShuffle] = useState(
    () => readGesturePracticeSessionConfig()?.shuffle ?? true,
  );
  const [sessionLengthMode, setSessionLengthMode] = useState<SessionLengthMode>(
    () => readGesturePracticeSessionConfig()?.sessionLengthMode ?? 'endless',
  );
  const [photoLimit, setPhotoLimit] = useState(
    () => readGesturePracticeSessionConfig()?.photoLimit ?? '20',
  );

  const effectiveDurationSec =
    timerPreset === CUSTOM_PRESET
      ? Math.max(5, Math.min(3600, Number.parseInt(customDurationSec, 10) || 60))
      : durationSec;

  const effectiveMaxPhotos =
    sessionLengthMode === 'endless'
      ? null
      : Math.max(1, Math.min(9999, Number.parseInt(photoLimit, 10) || 1));

  const sessionConfigDraft = useMemo(
    (): Omit<SessionConfig, 'queue'> => ({
      durationSec: effectiveDurationSec,
      prioritizeLeastDrawn,
      shuffle,
      packIds: selectedPackIds,
      maxPhotos: effectiveMaxPhotos,
    }),
    [effectiveDurationSec, effectiveMaxPhotos, prioritizeLeastDrawn, selectedPackIds, shuffle],
  );

  useGestureSessionWarmup({
    config: sessionConfigDraft,
    packFiles,
    drawHistory,
    enabled: selectedPackIds.length > 0,
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      writeGesturePracticeSessionConfig({
        version: 1,
        selectedPackIds,
        durationSec,
        timerPreset,
        customDurationSec,
        prioritizeLeastDrawn,
        shuffle,
        sessionLengthMode,
        photoLimit,
        activeTagFilters,
      });
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [
    activeTagFilters,
    customDurationSec,
    durationSec,
    photoLimit,
    prioritizeLeastDrawn,
    selectedPackIds,
    sessionLengthMode,
    shuffle,
    timerPreset,
  ]);

  const canStart = selectedPackIds.length > 0 && !starting;

  const handleEnterRoom = useCallback(() => {
    void (async () => {
      const sessionConfig: SessionConfig = { ...sessionConfigDraft };
      const queue = buildGestureSessionQueueFromConfig(sessionConfig, packFiles, drawHistory);
      if (queue.length === 0) {
        setStartError('Selected collections have no photos yet.');
        return;
      }

      const first = queue[0]!;
      setStarting(true);
      setStartError(null);
      try {
        if (!isGestureSessionPhotoDisplayReady(first.driveFileId)) {
          const token = await readGestureDriveAccessToken();
          await prefetchGestureSessionPhotoUntilReady(token, first);
        }
        onStart({ ...sessionConfig, queue });
      } catch (e) {
        setStartError(e instanceof Error ? e.message : 'Could not load reference image.');
      } finally {
        setStarting(false);
      }
    })();
  }, [drawHistory, onStart, packFiles, sessionConfigDraft]);

  const value = useMemo(
    (): PracticeSessionConfigContextValue => ({
      starting,
      startError,
      canStart,
      handleEnterRoom,
      timerPreset,
      setTimerPreset,
      durationSec,
      setDurationSec,
      customDurationSec,
      setCustomDurationSec,
      sessionLengthMode,
      setSessionLengthMode,
      photoLimit,
      setPhotoLimit,
      prioritizeLeastDrawn,
      setPrioritizeLeastDrawn,
      shuffle,
      setShuffle,
    }),
    [
      canStart,
      customDurationSec,
      durationSec,
      handleEnterRoom,
      photoLimit,
      prioritizeLeastDrawn,
      sessionLengthMode,
      setShuffle,
      shuffle,
      startError,
      starting,
      timerPreset,
    ],
  );

  return (
    <PracticeSessionConfigContext.Provider value={value}>
      {children}
    </PracticeSessionConfigContext.Provider>
  );
}

function PracticeSessionControlsPanel(): ReactElement {
  const {
    timerPreset,
    setTimerPreset,
    setDurationSec,
    customDurationSec,
    setCustomDurationSec,
    sessionLengthMode,
    setSessionLengthMode,
    photoLimit,
    setPhotoLimit,
    prioritizeLeastDrawn,
    setPrioritizeLeastDrawn,
    shuffle,
    setShuffle,
  } = usePracticeSessionConfig();

  return (
    <section className="gesture-practice-controls" aria-label="Session options">
      <div className="gesture-practice-control-row">
        <Typography component="h2" className="gesture-practice-label">
          Timer
        </Typography>
        <div className="gesture-timer-controls">
          <ToggleButtonGroup
            exclusive
            value={timerPreset}
            onChange={(_e, v: TimerPreset | null) => {
              if (v == null) return;
              setTimerPreset(v);
              if (v !== CUSTOM_PRESET) setDurationSec(v);
            }}
            size="small"
            className="gesture-timer-toggle"
          >
            {PRESETS.map((p) => (
              <ToggleButton key={p.sec} value={p.sec}>
                {p.label}
              </ToggleButton>
            ))}
            <ToggleButton value={CUSTOM_PRESET}>Custom</ToggleButton>
          </ToggleButtonGroup>
          {timerPreset === CUSTOM_PRESET ? (
            <span className="gesture-custom-duration-limited">
              <TextField
                id="gesture-custom-duration"
                size="small"
                type="number"
                aria-label="Custom duration in seconds"
                inputProps={{ min: 5, max: 3600, step: 5 }}
                value={customDurationSec}
                onChange={(e) => setCustomDurationSec(e.target.value)}
                className="gesture-custom-duration-field"
              />
              <span className="gesture-custom-duration-suffix">sec</span>
            </span>
          ) : null}
        </div>
      </div>
      <div className="gesture-practice-control-row">
        <Typography component="h2" className="gesture-practice-label">
          Session length
        </Typography>
        <div className="gesture-session-length-controls">
          <FormControlLabel
            className="gesture-session-length-option"
            control={
              <Radio
                size="small"
                checked={sessionLengthMode === 'endless'}
                onChange={() => setSessionLengthMode('endless')}
                inputProps={{ 'aria-label': 'Endless session' }}
              />
            }
            label="Endless"
          />
          <FormControlLabel
            className="gesture-session-length-option gesture-session-length-option--limited"
            control={
              <Radio
                size="small"
                checked={sessionLengthMode === 'limited'}
                onChange={() => setSessionLengthMode('limited')}
                inputProps={{ 'aria-label': 'Limited session length' }}
              />
            }
            label={
              <span className="gesture-session-length-limited">
                <TextField
                  id="gesture-session-photo-limit"
                  size="small"
                  type="number"
                  aria-label="Number of photos in session"
                  inputProps={{ min: 1, max: 9999 }}
                  value={photoLimit}
                  onChange={(e) => setPhotoLimit(e.target.value)}
                  onFocus={() => setSessionLengthMode('limited')}
                  disabled={sessionLengthMode !== 'limited'}
                  className="gesture-session-photo-limit-field"
                />
                <span className="gesture-session-length-suffix">photos</span>
              </span>
            }
          />
        </div>
      </div>
      <div className="gesture-practice-options">
        <FormControlLabel
          control={
            <Checkbox
              checked={prioritizeLeastDrawn}
              onChange={(e) => setPrioritizeLeastDrawn(e.target.checked)}
            />
          }
          label="Prioritize least drawn photos"
        />
        <FormControlLabel
          control={
            <Checkbox checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} />
          }
          label="Shuffle"
        />
      </div>
    </section>
  );
}

function PracticeSessionFooterPanel(): ReactElement {
  const { canStart, handleEnterRoom, startError, starting } = usePracticeSessionConfig();

  return (
    <Box className="gesture-practice-footer">
      {startError ? (
        <Typography role="alert" color="error" sx={{ mb: 1.5 }}>
          {startError}
        </Typography>
      ) : null}
      <Button
        variant="contained"
        size="large"
        fullWidth
        className="gesture-enter-btn"
        disabled={!canStart}
        onClick={handleEnterRoom}
      >
        {starting ? 'Preparing photo…' : 'Enter the room'}
      </Button>
    </Box>
  );
}

export const PracticeSessionControls = memo(PracticeSessionControlsPanel);
export const PracticeSessionFooter = memo(PracticeSessionFooterPanel);
export default memo(PracticeSessionConfigProvider);
