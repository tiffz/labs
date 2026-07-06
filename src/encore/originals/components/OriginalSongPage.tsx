import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { useEncoreOriginalsActions } from '../../context/EncoreOriginalsActionsContext';
import { useEncoreOriginal } from '../../context/EncoreOriginalsLibraryContext';
import { navigateEncore } from '../../routes/encoreAppHash';
import { encoreHairline, encoreMaxWidthPage, encoreRadius, encoreShadowSurface } from '../../theme/encoreUiTokens';
import { encorePagePaddingTop, encorePageSectionGap, encoreScreenPaddingX, encoreSurfacePadX } from '../../theme/encoreM3Layout';
import { takePendingOriginalDraft } from '../pendingOriginalDraft';
import { mergeIdleChartSnapshot, restoreOriginalFromSnapshot } from '../originalsSnapshot';
import { createBlankOriginalSong, type EncoreOriginalSong } from '../types';
import { OriginalsSongHeader, type OriginalsPageMode } from './OriginalsSongHeader';
import { OriginalsSongViewMode } from './OriginalsSongViewMode';
import { OriginalsSongWorkspace } from './OriginalsSongWorkspace';
import { OriginalsWorkflowStepper } from './OriginalsWorkflowStepper';
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
  const latestChartRef = useRef('');
  const saveChainRef = useRef(Promise.resolve());
  /** Bind draft from Dexie once per song id; later live updates must not clobber in-flight edits. */
  const hydratedOriginalIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isNew || !draft) return;
    navigateEncore({ kind: 'original', id: draft.id });
    // Stable id in the hash replaces legacy #/originals/new without persisting an empty row.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per /new draft id
  }, [isNew, draft?.id]);

  useEffect(() => {
    if (isNew) return;
    if (live.status === 'missing') {
      hydratedOriginalIdRef.current = null;
      setDraft((prev) => (prev?.id === id ? prev : null));
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

  const handleWorkflowStageChange = useCallback(
    (next: OriginalsWorkflowStage) => {
      if (next === workflowStage) return;
      flushIdleSnapshot();
      setWorkflowStage(next);
    },
    [flushIdleSnapshot, workflowStage],
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
      onRestoreSnapshot={(snap) => void persist(restoreOriginalFromSnapshot(activeSong, snap))}
      onDelete={async () => {
        if (!window.confirm('Delete this original?')) return;
        await deleteOriginal(activeSong.id);
        navigateEncore({ kind: 'originals' });
      }}
    />
  );

  const workflowStepperBand =
    mode === 'write' ? (
      <Box
        className={[
          'encore-originals-workspace-stepper',
          'encore-originals-no-print',
          chordsPaintScroll ? 'in-scroll-region__band' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        sx={{
          px: encoreSurfacePadX,
          py: { xs: 1.25, sm: 1.5 },
          flexShrink: 0,
          borderTop: 1,
          borderBottom: 1,
          borderColor: encoreHairline,
        }}
      >
        <OriginalsWorkflowStepper
          song={activeSong}
          stage={workflowStage}
          onStageChange={handleWorkflowStageChange}
        />
      </Box>
    ) : null;

  const editorShellSx = {
    display: 'flex',
    flexDirection: 'column',
    border: 1,
    borderColor: encoreHairline,
    borderRadius: encoreRadius,
    overflow: 'hidden',
    bgcolor: 'background.paper',
    boxShadow: encoreShadowSurface,
    ...(chordsPaintScroll ? { flex: 1, minHeight: 0 } : { flexShrink: 0, mb: encorePageSectionGap }),
  } as const;

  const editorHeaderBand = (
    <Box
      className="encore-originals-editor-anchor__header"
      sx={{
        px: encoreSurfacePadX,
        pt: { xs: 1.5, sm: 2 },
        pb: { xs: 1, sm: 1.25 },
      }}
    >
      {songHeader}
    </Box>
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

  const writeEditorShell =
    mode === 'write' ? (
      <Box className="encore-originals-editor-shell encore-originals-no-print" sx={editorShellSx}>
        {chordsPaintScroll ? (
          <Box
            className="in-scroll-region encore-originals-chords-page-scroll encore-originals-editor-shell__scroll"
            sx={{ flex: 1, minHeight: 0 }}
          >
            <Box
              className="in-scroll-region__band encore-originals-editor-anchor__header"
              sx={{
                px: encoreSurfacePadX,
                pt: { xs: 1.5, sm: 2 },
                pb: { xs: 1, sm: 1.25 },
                flexShrink: 0,
              }}
            >
              {songHeader}
            </Box>
            {workflowStepperBand}
            {writeWorkspace}
          </Box>
        ) : (
          <>
            <Box className="encore-originals-editor-anchor" sx={{ flexShrink: 0 }}>
              {editorHeaderBand}
              {workflowStepperBand}
            </Box>
            {writeWorkspace}
          </>
        )}
      </Box>
    ) : null;

  const viewHeaderShell = (
    <Box
      className="encore-originals-editor-shell encore-originals-no-print"
      sx={{
        ...editorShellSx,
        mb: encorePageSectionGap,
      }}
    >
      <Box className="encore-originals-editor-anchor" sx={{ flexShrink: 0 }}>
        {editorHeaderBand}
      </Box>
    </Box>
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
      {mode === 'write' ? writeEditorShell : viewHeaderShell}
      {mode === 'view' ? (
        <OriginalsSongViewMode
          song={activeSong}
          onEdit={() => setMode('write')}
          onEditStage={onEditStage}
          onSongChange={update}
        />
      ) : null}
    </Box>
  );
}
