import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useLiveQuery } from 'dexie-react-hooks';
import PackCollectionCard from '../components/PackCollectionCard';
import { useGestureCollectionPreviewWarmup } from '../hooks/useGestureCollectionPreviewWarmup';
import { gestureDb } from '../db/gestureDb';
import { isIncompleteUploadPack } from '../drive/gestureUploadActivity';
import type { SessionConfig } from '../types';

const PRESETS = [
  { label: '30s', sec: 30 },
  { label: '1 min', sec: 60 },
  { label: '5 min', sec: 300 },
] as const;

interface PracticeTabProps {
  onStart: (config: SessionConfig) => void;
  onNeedCollections: () => void;
}

export default function PracticeTab({ onStart, onNeedCollections }: PracticeTabProps): React.ReactElement {
  const packs = useLiveQuery(() => gestureDb.packs.orderBy('linkedAt').reverse().toArray(), []) ?? [];
  const packFiles = useLiveQuery(() => gestureDb.packFiles.toArray(), []) ?? [];
  const drawHistory = useLiveQuery(() => gestureDb.drawHistory.toArray(), []) ?? [];

  const { counts, ids, drawnSets } = useMemo(() => {
    const counts = new Map<string, number>();
    const ids = new Map<string, string[]>();
    const drawnSets = new Map<string, Set<string>>();
    for (const f of packFiles) {
      counts.set(f.packId, (counts.get(f.packId) ?? 0) + 1);
      const list = ids.get(f.packId) ?? [];
      list.push(f.driveFileId);
      ids.set(f.packId, list);
    }
    for (const row of drawHistory) {
      const set = drawnSets.get(row.packId) ?? new Set<string>();
      set.add(row.driveFileId);
      drawnSets.set(row.packId, set);
    }
    return { counts, ids, drawnSets };
  }, [drawHistory, packFiles]);

  const readyPacks = useMemo(() => packs.filter((p) => !isIncompleteUploadPack(p)), [packs]);

  const packIdsWithPhotos = useMemo(
    () => readyPacks.filter((p) => (counts.get(p.id) ?? 0) > 0).map((p) => p.id),
    [counts, readyPacks],
  );

  const previewFileIds = useMemo(() => {
    const fileIds: string[] = [];
    for (const packId of packIdsWithPhotos) {
      fileIds.push(...(ids.get(packId) ?? []).slice(0, 4));
    }
    return fileIds;
  }, [ids, packIdsWithPhotos]);

  useGestureCollectionPreviewWarmup(previewFileIds);

  const [selectedPackIds, setSelectedPackIds] = useState<string[]>([]);
  const [durationSec, setDurationSec] = useState(60);
  const [excludePreviouslyDrawn, setExcludePreviouslyDrawn] = useState(true);
  const [shuffle, setShuffle] = useState(true);

  useEffect(() => {
    if (selectedPackIds.length === 0 && packIdsWithPhotos.length > 0) {
      setSelectedPackIds(packIdsWithPhotos);
    }
  }, [packIdsWithPhotos, selectedPackIds.length]);

  const togglePack = (packId: string) => {
    setSelectedPackIds((prev) =>
      prev.includes(packId) ? prev.filter((id) => id !== packId) : [...prev, packId],
    );
  };

  const canStart = selectedPackIds.length > 0;

  if (packIdsWithPhotos.length === 0) {
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

  return (
    <div className="gesture-tab-panel gesture-practice-panel">
      <section className="gesture-practice-controls" aria-label="Session options">
        <div className="gesture-practice-control-row">
          <Typography component="h2" className="gesture-practice-label">
            Timer
          </Typography>
          <ToggleButtonGroup
            exclusive
            value={durationSec}
            onChange={(_e, v: number | null) => {
              if (v != null) setDurationSec(v);
            }}
            size="small"
            className="gesture-timer-toggle"
          >
            {PRESETS.map((p) => (
              <ToggleButton key={p.sec} value={p.sec}>
                {p.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </div>
        <div className="gesture-practice-options">
          <FormControlLabel
            control={
              <Checkbox
                checked={excludePreviouslyDrawn}
                onChange={(e) => setExcludePreviouslyDrawn(e.target.checked)}
              />
            }
            label="Skip drawn photos"
          />
          <FormControlLabel
            control={
              <Checkbox checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} />
            }
            label="Shuffle"
          />
        </div>
      </section>

      <Typography component="h2" className="gesture-practice-label">
        Collections
      </Typography>
      <div className="gesture-collection-grid gesture-collection-grid--practice">
        {packs
          .filter((p) => packIdsWithPhotos.includes(p.id))
          .map((pack) => (
            <PackCollectionCard
              key={pack.id}
              pack={pack}
              driveFileIds={ids.get(pack.id) ?? []}
              photoCount={counts.get(pack.id) ?? 0}
              drawnCount={drawnSets.get(pack.id)?.size ?? 0}
              mode="select"
              selected={selectedPackIds.includes(pack.id)}
              onToggleSelect={() => togglePack(pack.id)}
            />
          ))}
      </div>

      <Box className="gesture-practice-footer">
        <Button
          variant="contained"
          size="large"
          fullWidth
          className="gesture-enter-btn"
          disabled={!canStart}
          onClick={() =>
            onStart({
              durationSec,
              excludePreviouslyDrawn,
              shuffle,
              packIds: selectedPackIds,
            })
          }
        >
          Enter the room
        </Button>
      </Box>
    </div>
  );
}
