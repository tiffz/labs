import Box from '@mui/material/Box';
import HeadphonesOutlinedIcon from '@mui/icons-material/HeadphonesOutlined';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { MRT_RowSelectionState } from 'material-react-table';
import { useCallback, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import { ENCORE_ORIGINALS_TABLE_SCROLL_HEIGHT } from '../../components/encoreMrtTableDefaults';
import type { RepertoireViewMode } from '../../components/libraryScreenHelpers';
import type { EncoreMediaPlaybackPhase } from '../../media/encorePlayableMedia';
import type { OriginalsPlaybackTarget } from '../../context/encoreMediaPlaybackContextStore';
import { useEncoreOriginalsPlayback } from '../context/EncoreOriginalsPlaybackContext';
import { originalTakeBlobKey } from '../originalTakeLocalAudio';
import { originalTakeHasPlayableSource, preferredOriginalTake, type EncoreOriginalSong } from '../types';
import { OriginalsSongDashboardView } from './OriginalsSongDashboardView';
import { OriginalsLibraryMrtTable } from './OriginalsLibraryMrtTable';

export type OriginalsGridTakePlaybackState = 'idle' | 'loading' | 'playing' | 'error';

function buildTakeTarget(song: EncoreOriginalSong): OriginalsPlaybackTarget | null {
  const preferred = preferredOriginalTake(song);
  if (!preferred) return null;
  const take = song.takes.find((t) => originalTakeHasPlayableSource(t)) ?? preferred;
  return {
    songId: song.id,
    songTitle: song.title,
    takeId: take.id,
    takeLabel: take.label,
    driveFileId: take.driveFileId,
    localTakeKey: originalTakeBlobKey(song.id, take.id),
    mimeType: take.mimeType,
  };
}

function originalsTakePlaybackId(songId: string, takeId: string): string {
  return `original-take:${songId}:${takeId}`;
}

function takePlaybackState(
  songId: string,
  takeId: string | undefined,
  activePlaybackId: string | undefined,
  phase: EncoreMediaPlaybackPhase,
): OriginalsGridTakePlaybackState {
  if (!takeId || !activePlaybackId) return 'idle';
  if (activePlaybackId !== originalsTakePlaybackId(songId, takeId)) return 'idle';
  if (phase === 'loading') return 'loading';
  if (phase === 'playing' || phase === 'paused') return 'playing';
  if (phase === 'error') return 'error';
  return 'idle';
}

export type OriginalsLibraryListProps = {
  rows: EncoreOriginalSong[];
  search: string;
  listActive: boolean;
  viewMode: RepertoireViewMode;
  onSaveSong: (song: EncoreOriginalSong) => void;
  /** View toggle and other trailing toolbar controls (right-aligned). */
  toolbarTrailing?: ReactNode;
};

/** Table or song-dashboard list for the Originals library. */
export function OriginalsLibraryList({
  rows,
  search,
  listActive,
  viewMode,
  onSaveSong,
  toolbarTrailing,
}: OriginalsLibraryListProps): ReactElement {
  const [rowSelection, setRowSelection] = useState<MRT_RowSelectionState>({});
  const { playTake, playTakeQueue, phase, target, stopPlayback } = useEncoreOriginalsPlayback();
  const activePlaybackId = target?.playbackId;

  const selectedIds = useMemo(
    () => new Set(Object.keys(rowSelection).filter((id) => rowSelection[id])),
    [rowSelection],
  );

  const onPlaySelected = useCallback(() => {
    const targets = rows
      .filter((s) => selectedIds.has(s.id))
      .map(buildTakeTarget)
      .filter((t): t is OriginalsPlaybackTarget => t != null);
    if (targets.length === 0) return;
    if (targets.length === 1) playTake(targets[0]!);
    else playTakeQueue(targets);
  }, [playTake, playTakeQueue, rows, selectedIds]);

  const onPlayTake = useCallback(
    (song: EncoreOriginalSong) => {
      const takeTarget = buildTakeTarget(song);
      if (takeTarget) playTake(takeTarget);
    },
    [playTake],
  );

  const playbackBySongId = useMemo(() => {
    const map = new Map<string, OriginalsGridTakePlaybackState>();
    if (!listActive) return map;
    for (const song of rows) {
      const preferred = preferredOriginalTake(song);
      const take = preferred
        ? song.takes.find((t) => originalTakeHasPlayableSource(t)) ?? preferred
        : undefined;
      map.set(song.id, takePlaybackState(song.id, take?.id, activePlaybackId, phase));
    }
    return map;
  }, [activePlaybackId, listActive, phase, rows]);

  const bulkActions =
    selectedIds.size > 0 ? (
      <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
          {selectedIds.size} selected
        </Typography>
        <Button
          size="small"
          variant="contained"
          startIcon={<HeadphonesOutlinedIcon />}
          onClick={onPlaySelected}
          sx={{ textTransform: 'none' }}
        >
          Play selected
        </Button>
        <Button
          size="small"
          variant="text"
          onClick={() => setRowSelection({})}
          sx={{ textTransform: 'none' }}
        >
          Clear
        </Button>
      </Stack>
    ) : null;

  return (
    <>
      <Stack
        direction="row"
        flexWrap="wrap"
        alignItems="center"
        justifyContent="space-between"
        gap={1}
        useFlexGap
        sx={{ mb: 1.5 }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
          {rows.length} {rows.length === 1 ? 'original' : 'originals'}
          {search.trim() ? ' · search applied' : ''}
        </Typography>
        <Stack direction="row" alignItems="center" gap={2} useFlexGap sx={{ flexShrink: 0 }}>
          {bulkActions}
          {toolbarTrailing}
        </Stack>
      </Stack>

      {viewMode === 'table' ? (
        <Box
          sx={{
            height: ENCORE_ORIGINALS_TABLE_SCROLL_HEIGHT,
            minHeight: 240,
            minWidth: 0,
          }}
        >
          <OriginalsLibraryMrtTable
            rows={rows}
            search={search}
            listActive={listActive}
            onSaveSong={onSaveSong}
            onPlayTake={onPlayTake}
            onStopTake={stopPlayback}
            takePlaybackBySongId={playbackBySongId}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
          />
        </Box>
      ) : (
        <Box sx={{ minWidth: 0, maxWidth: '100%', overflowX: 'clip' }}>
          <OriginalsSongDashboardView
            rows={rows}
            search={search}
            listActive={listActive}
            onSaveSong={onSaveSong}
          />
        </Box>
      )}
    </>
  );
}
