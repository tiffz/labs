import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { useEncoreOriginalsActions } from '../../context/EncoreOriginalsActionsContext';
import { useEncoreOriginal } from '../../context/EncoreOriginalsLibraryContext';
import { navigateEncore } from '../../routes/encoreAppHash';
import { encoreMaxWidthPage } from '../../theme/encoreUiTokens';
import { encorePagePaddingTop, encoreScreenPaddingX } from '../../theme/encoreM3Layout';
import { takePendingOriginalDraft } from '../pendingOriginalDraft';
import { mergeIdleChartSnapshot, restoreOriginalFromSnapshot } from '../originalsSnapshot';
import { createBlankOriginalSong, type EncoreOriginalSong } from '../types';
import { OriginalsSongHeader, type OriginalsPageMode } from './OriginalsSongHeader';
import { OriginalsSongViewMode } from './OriginalsSongViewMode';
import { OriginalsSongWorkspace } from './OriginalsSongWorkspace';
import { readPersistedWorkflowStage, persistWorkflowStage, readSessionWorkflowStage } from '../originalsWorkflowStagePersistence';
import type { OriginalsWorkflowStage } from '../originalsWorkflowStages';

export type OriginalSongPageProps = {
  id: string;
  isNew: boolean;
};

function pageModeStorageKey(songId: string): string {
  return `encore-originals-page-mode:${songId}`;
}

function readPageMode(songId: string): OriginalsPageMode {
  try {
    const raw = sessionStorage.getItem(pageModeStorageKey(songId));
    if (raw === 'write' || raw === 'view') return raw;
  } catch {
    /* ignore */
  }
  return 'write';
}

function initialDraftForRoute(id: string, isNew: boolean): EncoreOriginalSong | null {
  const pending = takePendingOriginalDraft(id);
  if (pending) return pending;
  if (isNew) return createBlankOriginalSong();
  return null;
}

export function OriginalSongPage({ id, isNew }: OriginalSongPageProps): ReactElement {
  const live = useEncoreOriginal(isNew ? null : id);
  const { saveOriginal, deleteOriginal } = useEncoreOriginalsActions();
  const [draft, setDraft] = useState<EncoreOriginalSong | null>(() => initialDraftForRoute(id, isNew));
  const [mode, setMode] = useState<OriginalsPageMode>(() => readPageMode(id));
  const [workflowStage, setWorkflowStage] = useState<OriginalsWorkflowStage>(
    () => readSessionWorkflowStage(id) ?? 'brainstorm',
  );
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistedNewRef = useRef(false);
  const latestChartRef = useRef('');
  const saveChainRef = useRef(Promise.resolve());
  /** Bind draft from Dexie once per song id; later live updates must not clobber in-flight edits. */
  const hydratedOriginalIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isNew || !draft || persistedNewRef.current) return;
    persistedNewRef.current = true;
    void (async () => {
      await saveOriginal(draft, { silentUndo: true });
      navigateEncore({ kind: 'original', id: draft.id });
    })();
  }, [isNew, draft, saveOriginal]);

  useEffect(() => {
    if (isNew) return;
    if (live.status === 'missing') {
      hydratedOriginalIdRef.current = null;
      setDraft(null);
      return;
    }
    if (live.status !== 'ok') return;
    // Re-bind when the route id changes; Dexie live updates for the same row do not reset draft.
    if (hydratedOriginalIdRef.current === live.song.id) return;
    hydratedOriginalIdRef.current = live.song.id;
    setDraft(live.song);
  }, [isNew, live]);

  useEffect(() => {
    setMode(readPageMode(id));
    const stored = readSessionWorkflowStage(id);
    if (stored) setWorkflowStage(stored);
    hydratedOriginalIdRef.current = null;
  }, [id]);

  useEffect(() => {
    try {
      sessionStorage.setItem(pageModeStorageKey(id), mode);
    } catch {
      /* ignore */
    }
  }, [id, mode]);

  useEffect(() => {
    if (!draft) return;
    setWorkflowStage(readPersistedWorkflowStage(draft.id, draft));
  }, [draft?.id, draft]);

  useEffect(() => {
    if (draft) latestChartRef.current = draft.lyricsAndChords;
  }, [draft]);

  const enqueueSave = useCallback(
    (next: EncoreOriginalSong, opts?: { silentUndo?: boolean }) => {
      saveChainRef.current = saveChainRef.current
        .catch(() => undefined)
        .then(() => saveOriginal(next, opts));
      return saveChainRef.current;
    },
    [saveOriginal],
  );

  const persist = useCallback(
    (next: EncoreOriginalSong, opts?: { silentUndo?: boolean }) => {
      setDraft(next);
      latestChartRef.current = next.lyricsAndChords;
      void enqueueSave(next, opts);
    },
    [enqueueSave],
  );

  const cancelIdleSnapshot = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const runIdleSnapshot = useCallback(
    (chart: string) => {
      setDraft((prev) => {
        if (!prev) return prev;
        const merged = mergeIdleChartSnapshot(prev, chart);
        if (!merged) return prev;
        void enqueueSave(merged, { silentUndo: true });
        return merged;
      });
    },
    [enqueueSave],
  );

  const scheduleIdleSnapshot = useCallback(
    (chart: string) => {
      cancelIdleSnapshot();
      idleTimerRef.current = setTimeout(() => {
        idleTimerRef.current = null;
        runIdleSnapshot(chart);
      }, 3000);
    },
    [cancelIdleSnapshot, runIdleSnapshot],
  );

  const flushIdleSnapshot = useCallback(() => {
    cancelIdleSnapshot();
    runIdleSnapshot(latestChartRef.current);
  }, [cancelIdleSnapshot, runIdleSnapshot]);

  useEffect(() => () => cancelIdleSnapshot(), [cancelIdleSnapshot]);

  const update = useCallback(
    (patch: Partial<EncoreOriginalSong>) => {
      setDraft((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch, updatedAt: new Date().toISOString() };
        latestChartRef.current = next.lyricsAndChords;
        void enqueueSave(next, { silentUndo: true });
        return next;
      });
    },
    [enqueueSave],
  );

  const onChartChange = useCallback(
    (lyricsAndChords: string) => {
      latestChartRef.current = lyricsAndChords;
      update({ lyricsAndChords });
      scheduleIdleSnapshot(lyricsAndChords);
    },
    [scheduleIdleSnapshot, update],
  );

  const onEditStage = useCallback(
    (stage: OriginalsWorkflowStage) => {
      persistWorkflowStage(id, stage);
      setWorkflowStage(stage);
      setMode('write');
    },
    [id],
  );

  const activeSong = draft ?? (live.status === 'ok' ? live.song : null);

  if (!activeSong) {
    if (!isNew && live.status === 'missing') {
      return (
        <Box sx={{ p: encoreScreenPaddingX }}>
          <Typography>Song not found.</Typography>
        </Box>
      );
    }

    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', py: 8 }}
        aria-busy="true"
        aria-label="Loading original song"
      >
        <CircularProgress />
      </Box>
    );
  }

  const chordsPaintScroll = mode === 'write' && workflowStage === 'chords';
  const pageScrollIntegrated = true;

  const songHeader = (
    <OriginalsSongHeader
      song={activeSong}
      mode={mode}
      onModeChange={setMode}
      onChange={update}
      compact={chordsPaintScroll}
      onRestoreSnapshot={(snap) => void persist(restoreOriginalFromSnapshot(activeSong, snap))}
      onDelete={async () => {
        if (!window.confirm('Delete this original?')) return;
        await deleteOriginal(activeSong.id);
        navigateEncore({ kind: 'originals' });
      }}
    />
  );

  const writeWorkspace = (
    <OriginalsSongWorkspace
      key={`${activeSong.id}-${workflowStage}`}
      song={activeSong}
      initialWorkflowStage={workflowStage}
      integratedPageScroll={chordsPaintScroll}
      pageScrollIntegrated={pageScrollIntegrated}
      onWorkflowStageChange={setWorkflowStage}
      onBeforeWorkflowStageChange={flushIdleSnapshot}
      onChartChange={onChartChange}
      onSongChange={(patch) => update(patch)}
      onPersist={(next) => persist(next)}
    />
  );

  return (
    <Box
      className="encore-originals-print-root"
      sx={{
        flex: chordsPaintScroll ? 1 : undefined,
        minHeight: chordsPaintScroll ? 0 : undefined,
        display: 'flex',
        flexDirection: 'column',
        overflow: chordsPaintScroll ? 'hidden' : undefined,
        px: encoreScreenPaddingX,
        pt: encorePagePaddingTop,
        pb: { xs: 4, sm: 5 },
        ...encoreMaxWidthPage,
      }}
    >
      {chordsPaintScroll ? (
        <Box
          className="in-scroll-region encore-originals-chords-page-scroll"
          sx={{ flex: 1, minHeight: 0 }}
        >
          <Box className="in-scroll-region__band">{songHeader}</Box>
          {writeWorkspace}
        </Box>
      ) : (
        <>
          {songHeader}
          {mode === 'write' ? (
            writeWorkspace
          ) : (
            <OriginalsSongViewMode
              song={activeSong}
              onEdit={() => setMode('write')}
              onEditStage={onEditStage}
              onSongChange={update}
            />
          )}
        </>
      )}
    </Box>
  );
}
