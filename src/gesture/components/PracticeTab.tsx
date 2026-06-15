import { useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useLiveQuery } from 'dexie-react-hooks';
import PackCollectionCard from '../components/PackCollectionCard';
import GestureTabLoading from '../components/GestureTabLoading';
import GestureTagFilterBar from '../components/GestureTagFilterBar';
import { gestureDb } from '../db/gestureDb';
import { readGestureDriveAccessToken } from '../drive/readGestureDriveAccessToken';
import { isIncompleteUploadPack } from '../drive/gestureUploadActivity';
import {
  packHasGestureTag,
  packMatchesGestureTagFilters,
} from '../drive/gesturePackTags';
import { useGestureKnownTags } from '../hooks/useGestureKnownTags';
import {
  GESTURE_EMPTY_DRAW_HISTORY,
  GESTURE_EMPTY_PACK_FILES,
} from '../hooks/gestureLiveQueryEmpty';
import { useGesturePackStats, resolveGesturePackCoverFileIds } from '../hooks/useGesturePackStats';
import { useGesturePacks } from '../hooks/useGesturePacks';
import { useGestureSessionWarmup } from '../hooks/useGestureSessionWarmup';
import {
  isGestureSessionPhotoDisplayReady,
  prefetchGestureSessionPhotoUntilReady,
} from '../media/gestureSessionPhotoPipeline';
import { buildGestureSessionQueueFromConfig } from '../session/gestureSessionQueueFromConfig';
import {
  readGesturePracticeSessionConfig,
  writeGesturePracticeSessionConfig,
  type GesturePracticeTimerPreset,
} from '../practice/gesturePracticeConfigStorage';
import type { SessionConfig } from '../types';

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

interface PracticeTabProps {
  onStart: (config: SessionConfig) => void;
  onNeedCollections: () => void;
  activeTagFilters: string[];
  onActiveTagFiltersChange: (tags: string[]) => void;
  previewFetchEnabled?: boolean;
}

export default function PracticeTab({
  onStart,
  onNeedCollections,
  activeTagFilters,
  onActiveTagFiltersChange,
  previewFetchEnabled = true,
}: PracticeTabProps): React.ReactElement {
  const storedConfig = readGesturePracticeSessionConfig();
  const { packs, packsHydrated } = useGesturePacks();
  const { counts, coverIds, drawnSets, statsHydrated } = useGesturePackStats();

  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [selectedPackIds, setSelectedPackIds] = useState<string[]>(
    () => storedConfig?.selectedPackIds ?? [],
  );
  const [durationSec, setDurationSec] = useState(() => storedConfig?.durationSec ?? 60);
  const [timerPreset, setTimerPreset] = useState<TimerPreset>(
    () => storedConfig?.timerPreset ?? 60,
  );
  const [customDurationSec, setCustomDurationSec] = useState(
    () => storedConfig?.customDurationSec ?? '90',
  );
  const [prioritizeLeastDrawn, setPrioritizeLeastDrawn] = useState(
    () => storedConfig?.prioritizeLeastDrawn ?? true,
  );
  const [shuffle, setShuffle] = useState(() => storedConfig?.shuffle ?? true);
  const [sessionLengthMode, setSessionLengthMode] = useState<SessionLengthMode>(
    () => storedConfig?.sessionLengthMode ?? 'endless',
  );
  const [photoLimit, setPhotoLimit] = useState(() => storedConfig?.photoLimit ?? '20');

  const packFilesRaw = useLiveQuery(
    () =>
      selectedPackIds.length === 0
        ? Promise.resolve(GESTURE_EMPTY_PACK_FILES)
        : gestureDb.packFiles.where('packId').anyOf(selectedPackIds).toArray(),
    [selectedPackIds.join(',')],
    undefined,
  );
  const drawHistoryRaw = useLiveQuery(() => gestureDb.drawHistory.toArray(), [], undefined);
  const packFiles = packFilesRaw ?? GESTURE_EMPTY_PACK_FILES;
  const drawHistory = drawHistoryRaw ?? GESTURE_EMPTY_DRAW_HISTORY;

  const readyPacks = useMemo(
    () => packs.filter((p) => !isIncompleteUploadPack(p, counts.get(p.id) ?? 0)),
    [counts, packs],
  );

  const allTags = useGestureKnownTags(packs);

  const practicePacks = useMemo(
    () =>
      readyPacks.filter(
        (p) =>
          (counts.get(p.id) ?? 0) > 0 && packMatchesGestureTagFilters(p, activeTagFilters),
      ),
    [activeTagFilters, counts, readyPacks],
  );

  const packIdsWithPhotos = useMemo(() => practicePacks.map((p) => p.id), [practicePacks]);

  const allPackIdsWithPhotos = useMemo(
    () => readyPacks.filter((p) => (counts.get(p.id) ?? 0) > 0).map((p) => p.id),
    [counts, readyPacks],
  );

  const didInitSelection = useRef(storedConfig != null);
  useEffect(() => {
    if (!didInitSelection.current && allPackIdsWithPhotos.length > 0) {
      setSelectedPackIds(allPackIdsWithPhotos);
      didInitSelection.current = true;
    }
  }, [allPackIdsWithPhotos]);

  useEffect(() => {
    if (allPackIdsWithPhotos.length === 0) return;
    setSelectedPackIds((prev) => {
      const valid = prev.filter((id) => allPackIdsWithPhotos.includes(id));
      return valid.length === prev.length ? prev : valid;
    });
  }, [allPackIdsWithPhotos]);

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

  const togglePack = (packId: string) => {
    setSelectedPackIds((prev) =>
      prev.includes(packId) ? prev.filter((id) => id !== packId) : [...prev, packId],
    );
  };

  const toggleTagFilter = (tag: string) => {
    const wasActive = activeTagFilters.includes(tag);
    const nextFilters = wasActive
      ? activeTagFilters.filter((t) => t !== tag)
      : [...activeTagFilters, tag];
    onActiveTagFiltersChange(nextFilters);

    if (!wasActive) {
      const matchingIds = readyPacks
        .filter((pack) => (counts.get(pack.id) ?? 0) > 0 && packHasGestureTag(pack, tag))
        .map((pack) => pack.id);
      if (matchingIds.length > 0) {
        setSelectedPackIds((prev) => [...new Set([...prev, ...matchingIds])]);
      }
    }
  };

  const selectAllVisible = () => {
    setSelectedPackIds((prev) => [...new Set([...prev, ...packIdsWithPhotos])]);
  };

  const deselectAllVisible = () => {
    setSelectedPackIds((prev) => prev.filter((id) => !packIdsWithPhotos.includes(id)));
  };

  const visibleSelectedCount = packIdsWithPhotos.filter((id) => selectedPackIds.includes(id)).length;
  const selectionHint =
    packIdsWithPhotos.length > 0
      ? `${visibleSelectedCount} of ${packIdsWithPhotos.length} selected`
      : null;

  const effectiveDurationSec =
    timerPreset === CUSTOM_PRESET
      ? Math.max(5, Math.min(3600, Number.parseInt(customDurationSec, 10) || 60))
      : durationSec;

  const effectiveMaxPhotos =
    sessionLengthMode === 'endless'
      ? null
      : Math.max(1, Math.min(9999, Number.parseInt(photoLimit, 10) || 1));

  const canStart = selectedPackIds.length > 0 && !starting;

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

  const { firstPhotoReady } = useGestureSessionWarmup({
    config: sessionConfigDraft,
    packFiles,
    drawHistory,
    enabled: selectedPackIds.length > 0,
  });

  const handleEnterRoom = async () => {
    const sessionConfig: SessionConfig = { ...sessionConfigDraft };
    const queue = buildGestureSessionQueueFromConfig(sessionConfig, packFiles, drawHistory);
    if (queue.length === 0) {
      setStartError('Selected collections have no photos yet.');
      return;
    }

    const first = queue[0]!;
    const ready = isGestureSessionPhotoDisplayReady(first.driveFileId) || firstPhotoReady;

    setStarting(!ready);
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
  };

  const collectionsReady = packsHydrated && statsHydrated;

  if (!collectionsReady) {
    return (
      <div className="gesture-tab-panel">
        <GestureTabLoading />
      </div>
    );
  }

  if (packIdsWithPhotos.length === 0 && activeTagFilters.length === 0) {
    return (
      <div className="gesture-tab-panel">
        <div className="gesture-empty-state">
          <Typography className="gesture-empty-title">Add a collection first</Typography>
          <Typography className="gesture-empty-copy">
            Practice pulls photos from your collections. Upload or link a folder to begin.
          </Typography>
          <Button variant="contained" onClick={onNeedCollections}>
            Go to collections
          </Button>
        </div>
      </div>
    );
  }

  if (packIdsWithPhotos.length === 0) {
    return (
      <div className="gesture-tab-panel">
        <GestureTagFilterBar
          tags={allTags}
          activeTags={activeTagFilters}
          onToggleTag={toggleTagFilter}
          onClear={() => onActiveTagFiltersChange([])}
        />
        <div className="gesture-empty-state">
          <Typography className="gesture-empty-title">No collections match these tags</Typography>
          <Typography className="gesture-empty-copy">
            Clear the tag filters or tag collections on the Collections tab.
          </Typography>
        </div>
      </div>
    );
  }

  return (
    <div className="gesture-tab-panel gesture-practice-panel">
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

      <GestureTagFilterBar
        tags={allTags}
        activeTags={activeTagFilters}
        onToggleTag={toggleTagFilter}
        onClear={() => onActiveTagFiltersChange([])}
        selectionHint={selectionHint}
        onSelectAllShown={packIdsWithPhotos.length > 0 ? selectAllVisible : undefined}
        onDeselectAllShown={packIdsWithPhotos.length > 0 ? deselectAllVisible : undefined}
      />

      <Typography component="h2" className="gesture-practice-label">
        Collections
      </Typography>
      <div className="gesture-collection-grid gesture-collection-grid--practice">
        {practicePacks.map((pack) => (
          <PackCollectionCard
            key={pack.id}
            pack={pack}
            driveFileIds={resolveGesturePackCoverFileIds(pack, coverIds)}
            photoCount={counts.get(pack.id) ?? 0}
            drawnCount={drawnSets.get(pack.id)?.size ?? 0}
            mode="select"
            selected={selectedPackIds.includes(pack.id)}
            suppressTags={activeTagFilters.length > 0}
            previewFetchEnabled={previewFetchEnabled}
            onToggleSelect={() => togglePack(pack.id)}
          />
        ))}
      </div>

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
          onClick={() => void handleEnterRoom()}
        >
          {starting ? 'Preparing photo…' : 'Enter the room'}
        </Button>
      </Box>
    </div>
  );
}
