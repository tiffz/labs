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
import { appendOriginalChartSnapshot, restoreOriginalFromSnapshot } from '../originalsSnapshot';
import { createBlankOriginalSong, type EncoreOriginalSong } from '../types';
import { OriginalsPdfImportDialog } from './OriginalsPdfImportDialog';
import { OriginalsSongHeader, type OriginalsPageMode } from './OriginalsSongHeader';
import { OriginalsSongViewMode } from './OriginalsSongViewMode';
import { OriginalsSongWorkspace } from './OriginalsSongWorkspace';
import { readPersistedWorkflowStage } from '../originalsWorkflowStagePersistence';
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
  const [pdfOpen, setPdfOpen] = useState(false);
  const [workflowStage, setWorkflowStage] = useState<OriginalsWorkflowStage>(() =>
    draft ? readPersistedWorkflowStage(draft.id, draft) : 'brainstorm',
  );
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistedNewRef = useRef(false);

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
    if (live.status === 'ok') setDraft(live.song);
    else if (live.status === 'missing') setDraft(null);
  }, [isNew, live]);

  useEffect(() => {
    try {
      sessionStorage.setItem(pageModeStorageKey(id), mode);
    } catch {
      /* ignore */
    }
  }, [id, mode]);

  useEffect(() => {
    if (draft) setWorkflowStage(readPersistedWorkflowStage(draft.id, draft));
  }, [draft?.id, draft]);

  const persist = useCallback(
    async (next: EncoreOriginalSong, opts?: { silentUndo?: boolean }) => {
      setDraft(next);
      await saveOriginal(next, opts);
    },
    [saveOriginal],
  );

  const scheduleIdleSnapshot = useCallback(
    (chart: string) => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        if (!draft) return;
        const withHist = appendOriginalChartSnapshot(draft, chart);
        if (withHist.history !== draft.history) void persist(withHist, { silentUndo: true });
      }, 3000);
    },
    [draft, persist],
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

  const update = (patch: Partial<EncoreOriginalSong>) => {
    const next = { ...activeSong, ...patch, updatedAt: new Date().toISOString() };
    void persist(next, { silentUndo: true });
  };

  const onChartChange = (lyricsAndChords: string) => {
    update({ lyricsAndChords });
    scheduleIdleSnapshot(lyricsAndChords);
  };

  const chordsPaintScroll = mode === 'write' && workflowStage === 'chords';

  const songHeader = (
    <OriginalsSongHeader
      song={activeSong}
      mode={mode}
      onModeChange={setMode}
      onChange={update}
      compact={chordsPaintScroll}
      onRestoreSnapshot={(snap) => void persist(restoreOriginalFromSnapshot(activeSong, snap))}
      onImportPdf={() => setPdfOpen(true)}
      onDelete={async () => {
        if (!window.confirm('Delete this original?')) return;
        await deleteOriginal(activeSong.id);
        navigateEncore({ kind: 'originals' });
      }}
    />
  );

  const writeWorkspace = (
    <OriginalsSongWorkspace
      song={activeSong}
      integratedPageScroll={chordsPaintScroll}
      onWorkflowStageChange={setWorkflowStage}
      onChartChange={onChartChange}
      onSongChange={(patch) => update(patch)}
      onPersist={(next) => persist(next)}
    />
  );

  return (
    <Box
      className="encore-originals-print-root"
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: chordsPaintScroll ? 'hidden' : undefined,
        px: encoreScreenPaddingX,
        pt: encorePagePaddingTop,
        pb: { xs: 4, sm: 5 },
        ...encoreMaxWidthPage,
      }}
    >
      {mode === 'write' ? (
        chordsPaintScroll ? (
          <Box className="in-scroll-region encore-originals-chords-page-scroll">
            <Box className="in-scroll-region__band">{songHeader}</Box>
            {writeWorkspace}
          </Box>
        ) : (
          <>
            {songHeader}
            {writeWorkspace}
          </>
        )
      ) : (
        <>
          {songHeader}
          <OriginalsSongViewMode song={activeSong} onEdit={() => setMode('write')} onSongChange={update} />
        </>
      )}

      <OriginalsPdfImportDialog
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        onImported={(chart) => {
          onChartChange(chart);
          setPdfOpen(false);
          setMode('write');
        }}
      />
    </Box>
  );
}
