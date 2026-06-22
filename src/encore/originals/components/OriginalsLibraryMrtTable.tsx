/* eslint-disable react/prop-types -- MRT Cell render props are typed via MRT_ColumnDef */
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { useMaterialReactTable, type MRT_ColumnDef, type MRT_RowSelectionState } from 'material-react-table';
import { useCallback, useMemo, type Dispatch, type ReactElement, type SetStateAction } from 'react';
import { MRT_ROW_SELECT_COL } from '../../components/encoreMrtColumnOrder';
import { chordProLyricSnippet } from '../../../shared/music/chordPro/chordProText';
import { EncoreMrtTableShell, ENCORE_MRT_CLICKABLE_ROW_SX } from '../../components/EncoreMrtTableShell';
import { formatShortDate } from '../../components/libraryScreenHelpers';
import { encoreMrtOriginalsLibraryTableOptions } from '../../components/encoreMrtTableDefaults';
import { EncoreBpmChip } from '../../ui/EncoreBpmChip';
import { EncoreKeyChip } from '../../ui/EncoreKeyChip';
import { EncoreTimeSignatureChip } from '../../ui/EncoreTimeSignatureChip';
import { EncoreMrtColumnHeader } from '../../ui/EncoreMrtColumnHeader';
import { HighlightedText } from '../../ui/HighlightedText';
import { InlineChipDate } from '../../ui/InlineEditChip';
import { originalSongStartedDate, originalSongTimeSignature, type EncoreOriginalSong } from '../types';
import { navigateToOriginalFromLibrary } from '../originalsLibraryNavigation';
import {
  isOriginalDemoReady,
  originalsLibraryStageLabel,
  originalsLibraryStageProgressDetail,
  originalsLibraryStageSortKey,
} from '../originalsWorkflowCompletion';
import type { OriginalsGridTakePlaybackState } from './OriginalsLibraryList';
import {
  OriginalsTablePlayCell,
  OriginalsTableStageCell,
  OriginalsTableTakesCell,
} from './OriginalsLibraryTableCells';
import { OriginalsLyricsHoverCard } from './OriginalsLyricsHoverCard';

function ReadOnlyDateChip({ iso }: { iso: string }): ReactElement {
  return (
    <Chip
      size="small"
      label={formatShortDate(iso)}
      variant="outlined"
      sx={{
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 600,
        color: 'text.primary',
        borderStyle: 'solid',
        maxWidth: '100%',
      }}
    />
  );
}

export type OriginalsLibraryMrtTableProps = {
  rows: EncoreOriginalSong[];
  search: string;
  listActive: boolean;
  onSaveSong: (song: EncoreOriginalSong) => void;
  onPlayTake: (song: EncoreOriginalSong) => void;
  onStopTake: () => void;
  takePlaybackBySongId: ReadonlyMap<string, OriginalsGridTakePlaybackState>;
  rowSelection: MRT_RowSelectionState;
  onRowSelectionChange: Dispatch<SetStateAction<MRT_RowSelectionState>>;
};

export function OriginalsLibraryMrtTable({
  rows,
  search,
  listActive,
  onSaveSong,
  onPlayTake,
  onStopTake,
  takePlaybackBySongId,
  rowSelection,
  onRowSelectionChange,
}: OriginalsLibraryMrtTableProps): ReactElement {
  const theme = useTheme();

  const patchSong = useCallback(
    (song: EncoreOriginalSong, patch: Partial<EncoreOriginalSong>) => {
      onSaveSong({ ...song, ...patch });
    },
    [onSaveSong],
  );

  const columns = useMemo<MRT_ColumnDef<EncoreOriginalSong>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Title',
        minSize: 100,
        size: 160,
        grow: 2,
        Header: ({ column }) => <EncoreMrtColumnHeader label="Title" column={column} />,
        Cell: ({ row }) => {
          const song = row.original;
          const playback = takePlaybackBySongId.get(song.id) ?? 'idle';
          return (
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0, width: 1 }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 600, minWidth: 0, flex: 1 }}>
                <HighlightedText
                  text={song.title.trim() || 'Untitled'}
                  highlight={search}
                  component="span"
                  variant="inherit"
                />
              </Typography>
              <OriginalsTablePlayCell
                song={song}
                listActive={listActive}
                playback={playback}
                onPlayTake={onPlayTake}
                onStopTake={onStopTake}
              />
            </Stack>
          );
        },
      },
      {
        id: 'stage',
        header: 'Stage',
        minSize: 92,
        size: 108,
        accessorFn: (row) => originalsLibraryStageSortKey(row),
        Header: ({ column }) => <EncoreMrtColumnHeader label="Stage" column={column} />,
        Cell: ({ row }) => (
          <OriginalsTableStageCell
            label={originalsLibraryStageLabel(row.original)}
            progressDetail={originalsLibraryStageProgressDetail(row.original)}
            demoReady={isOriginalDemoReady(row.original)}
          />
        ),
      },
      {
        accessorKey: 'key',
        header: 'Key',
        minSize: 64,
        size: 72,
        Header: ({ column }) => <EncoreMrtColumnHeader label="Key" column={column} />,
        Cell: ({ row }) => (
          <Box onClick={(e) => e.stopPropagation()} sx={{ minWidth: 0 }}>
            <EncoreKeyChip
              value={row.original.key}
              placeholder="Set key"
              displayMode="compact"
              onChange={(next) => patchSong(row.original, { key: next })}
            />
          </Box>
        ),
      },
      {
        id: 'timeSignature',
        header: 'Meter',
        minSize: 56,
        size: 64,
        accessorFn: (row) => `${originalSongTimeSignature(row).numerator}/${originalSongTimeSignature(row).denominator}`,
        Header: ({ column }) => <EncoreMrtColumnHeader label="Meter" column={column} />,
        Cell: ({ row }) => (
          <Box onClick={(e) => e.stopPropagation()} sx={{ minWidth: 0 }}>
            <EncoreTimeSignatureChip
              value={originalSongTimeSignature(row.original)}
              onChange={(next) => patchSong(row.original, { timeSignature: next })}
            />
          </Box>
        ),
      },
      {
        accessorKey: 'tempo',
        header: 'BPM',
        minSize: 60,
        size: 68,
        Header: ({ column }) => <EncoreMrtColumnHeader label="BPM" column={column} />,
        Cell: ({ row }) => (
          <Box onClick={(e) => e.stopPropagation()} sx={{ minWidth: 0 }}>
            <EncoreBpmChip
              value={row.original.tempo}
              onChange={(next) => patchSong(row.original, { tempo: next })}
            />
          </Box>
        ),
      },
      {
        id: 'takes',
        header: 'Takes',
        minSize: 52,
        size: 60,
        accessorFn: (row) => row.takes.length,
        Header: ({ column }) => <EncoreMrtColumnHeader label="Takes" column={column} />,
        Cell: ({ row }) => <OriginalsTableTakesCell song={row.original} listActive={listActive} />,
      },
      {
        id: 'snippet',
        header: 'Lyrics',
        minSize: 140,
        size: 260,
        grow: 2,
        accessorFn: (row) => chordProLyricSnippet(row.lyricsAndChords, 120),
        Header: ({ column }) => <EncoreMrtColumnHeader label="Lyrics" column={column} />,
        Cell: ({ row }) => {
          const snippet = chordProLyricSnippet(row.original.lyricsAndChords, 120) || '–';
          return (
            <OriginalsLyricsHoverCard songId={row.original.id} lyricsAndChords={row.original.lyricsAndChords}>
              <Typography variant="body2" color="text.secondary" noWrap sx={{ minWidth: 0, width: 1 }}>
                <HighlightedText text={snippet} highlight={search} component="span" variant="inherit" />
              </Typography>
            </OriginalsLyricsHoverCard>
          );
        },
      },
      {
        id: 'startedAt',
        header: 'Started',
        minSize: 100,
        size: 112,
        accessorFn: (row) => originalSongStartedDate(row),
        Header: ({ column }) => <EncoreMrtColumnHeader label="Started" column={column} />,
        Cell: ({ row }) => (
          <Box onClick={(e) => e.stopPropagation()} sx={{ minWidth: 0 }}>
            <InlineChipDate
              value={row.original.startedAt ?? originalSongStartedDate(row.original)}
              placeholder="Started writing"
              onChange={(next) => patchSong(row.original, { startedAt: next ?? undefined })}
            />
          </Box>
        ),
      },
      {
        accessorKey: 'updatedAt',
        header: 'Updated',
        minSize: 100,
        size: 112,
        Header: ({ column }) => <EncoreMrtColumnHeader label="Updated" column={column} />,
        Cell: ({ row }) => <ReadOnlyDateChip iso={row.original.updatedAt} />,
      },
    ],
    [listActive, onPlayTake, onStopTake, patchSong, search, takePlaybackBySongId],
  );

  const mrtTheme = useMemo(() => ({ baseBackgroundColor: theme.palette.background.paper }), [theme.palette.background.paper]);

  const displayColumnDefOptions = useMemo(
    () =>
      ({
        [MRT_ROW_SELECT_COL]: {
          size: 44,
          minSize: 40,
          maxSize: 48,
          muiTableHeadCellProps: { sx: { px: 0.75, py: 1.25, verticalAlign: 'middle' } },
          muiTableBodyCellProps: { sx: { px: 0.75, py: 1.25, verticalAlign: 'middle' } },
        },
      }) as const,
    [],
  );

  const table = useMaterialReactTable({
    ...encoreMrtOriginalsLibraryTableOptions<EncoreOriginalSong>(),
    columns,
    data: rows,
    getRowId: (row) => row.id,
    enableRowSelection: true,
    onRowSelectionChange: onRowSelectionChange,
    displayColumnDefOptions,
    state: { globalFilter: search, rowSelection },
    mrtTheme,
    initialState: {
      density: 'compact',
      sorting: [{ id: 'updatedAt', desc: true }],
    },
    muiTableBodyRowProps: ({ row }) => ({
      onClick: () => navigateToOriginalFromLibrary(row.original),
      sx: ENCORE_MRT_CLICKABLE_ROW_SX,
    }),
  });

  return (
    <EncoreMrtTableShell
      table={table}
      searchHighlight={search}
      sx={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        '& .MuiPaper-root': { height: '100%', minHeight: 0 },
      }}
    />
  );
}
