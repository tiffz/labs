/* eslint-disable react/prop-types -- MRT Cell render props are typed via MRT_ColumnDef */
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { useMaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import { useMemo, type ReactElement } from 'react';
import { chordProLyricSnippet } from '../../../shared/music/chordPro/chordProText';
import { EncoreMrtTableShell, ENCORE_MRT_CLICKABLE_ROW_SX } from '../../components/EncoreMrtTableShell';
import { formatShortDate } from '../../components/libraryScreenHelpers';
import { encoreMrtRepertoireTableOptions } from '../../components/encoreMrtTableDefaults';
import { navigateEncore } from '../../routes/encoreAppHash';
import { EncoreMrtColumnHeader } from '../../ui/EncoreMrtColumnHeader';
import { HighlightedText } from '../../ui/HighlightedText';
import type { EncoreOriginalSong } from '../types';
import { formatOriginalStageSummary, inferredWorkflowStage } from '../originalsWorkflowCompletion';
import { workflowStageShortLabel } from '../originalsWorkflowStages';

function dateCell(iso: string): ReactElement {
  return (
    <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
      {formatShortDate(iso)}
    </Typography>
  );
}

export type OriginalsLibraryMrtTableProps = {
  rows: EncoreOriginalSong[];
  search: string;
};

export function OriginalsLibraryMrtTable({ rows, search }: OriginalsLibraryMrtTableProps): ReactElement {
  const theme = useTheme();

  const columns = useMemo<MRT_ColumnDef<EncoreOriginalSong>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Title',
        minSize: 160,
        size: 220,
        Header: ({ column }) => <EncoreMrtColumnHeader label="Title" column={column} />,
        Cell: ({ row }) => (
          <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 0 }}>
            <HighlightedText
              text={row.original.title.trim() || 'Untitled'}
              highlight={search}
              component="span"
              variant="inherit"
            />
          </Typography>
        ),
      },
      {
        id: 'stage',
        header: 'Stage',
        minSize: 120,
        size: 132,
        accessorFn: (row) => workflowStageShortLabel(inferredWorkflowStage(row)),
        Header: ({ column }) => <EncoreMrtColumnHeader label="Stage" column={column} />,
        Cell: ({ row }) => (
          <Chip size="small" label={workflowStageShortLabel(inferredWorkflowStage(row.original))} variant="outlined" />
        ),
      },
      {
        id: 'progress',
        header: 'Progress',
        minSize: 100,
        size: 112,
        accessorFn: (row) => formatOriginalStageSummary(row),
        Header: ({ column }) => <EncoreMrtColumnHeader label="Progress" column={column} />,
        Cell: ({ row }) => (
          <Typography variant="body2" color="text.secondary">
            {formatOriginalStageSummary(row.original)}
          </Typography>
        ),
      },
      {
        accessorKey: 'key',
        header: 'Key',
        minSize: 56,
        size: 64,
        maxSize: 72,
        Header: ({ column }) => <EncoreMrtColumnHeader label="Key" column={column} />,
      },
      {
        accessorKey: 'tempo',
        header: 'BPM',
        minSize: 56,
        size: 64,
        maxSize: 72,
        Header: ({ column }) => <EncoreMrtColumnHeader label="BPM" column={column} />,
        Cell: ({ cell }) => (
          <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {cell.getValue<number>()}
          </Typography>
        ),
      },
      {
        id: 'takes',
        header: 'Takes',
        minSize: 72,
        size: 80,
        maxSize: 88,
        accessorFn: (row) => row.takes.length,
        Header: ({ column }) => <EncoreMrtColumnHeader label="Takes" column={column} />,
        Cell: ({ cell }) => (
          <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {cell.getValue<number>()}
          </Typography>
        ),
      },
      {
        id: 'snippet',
        header: 'Lyrics',
        minSize: 180,
        size: 260,
        accessorFn: (row) => chordProLyricSnippet(row.lyricsAndChords, 120),
        Header: ({ column }) => <EncoreMrtColumnHeader label="Lyrics" column={column} />,
        Cell: ({ row }) => {
          const snippet = chordProLyricSnippet(row.original.lyricsAndChords, 120) || '-';
          return (
            <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 320 }}>
              <HighlightedText text={snippet} highlight={search} component="span" variant="inherit" />
            </Typography>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: 'Started',
        minSize: 108,
        size: 120,
        Header: ({ column }) => <EncoreMrtColumnHeader label="Started" column={column} />,
        Cell: ({ row }) => dateCell(row.original.createdAt),
      },
      {
        accessorKey: 'updatedAt',
        header: 'Updated',
        minSize: 108,
        size: 120,
        Header: ({ column }) => <EncoreMrtColumnHeader label="Updated" column={column} />,
        Cell: ({ row }) => dateCell(row.original.updatedAt),
      },
    ],
    [search],
  );

  const mrtTheme = useMemo(() => ({ baseBackgroundColor: theme.palette.background.paper }), [theme.palette.background.paper]);

  const table = useMaterialReactTable({
    ...encoreMrtRepertoireTableOptions<EncoreOriginalSong>(),
    columns,
    data: rows,
    getRowId: (row) => row.id,
    state: { globalFilter: search },
    mrtTheme,
    initialState: {
      density: 'compact',
      sorting: [{ id: 'updatedAt', desc: true }],
    },
    muiTableBodyRowProps: ({ row }) => ({
      onClick: () => navigateEncore({ kind: 'original', id: row.original.id }),
      sx: ENCORE_MRT_CLICKABLE_ROW_SX,
    }),
  });

  return <EncoreMrtTableShell table={table} searchHighlight={search} />;
}
