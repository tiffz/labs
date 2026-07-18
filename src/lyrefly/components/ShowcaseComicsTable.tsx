/* eslint-disable react/prop-types -- MRT Cell render props are typed via MRT_ColumnDef */
import { useTheme } from '@mui/material/styles';
import {
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_SortingState,
} from 'material-react-table';
import { useMemo, useState, type MouseEvent as ReactMouseEvent, type ReactElement } from 'react';

import { workflowStageShelfLabel } from '../hooks/useLyreflyShelfPreviews';
import { isLyreflyProjectArchived } from '../workflow/lyreflyProjectProgress';
import type { LyreflyShelfRow } from '../utils/lyreflyShelfFilters';
import { LyreflyDateChip } from './LyreflyDateChip';
import { LyreflySearchHighlight } from './LyreflySearchHighlight';
import { LyreflyShelfCover } from './LyreflyShelfCover';
import { LYREFLY_MRT_CLICKABLE_ROW_SX, lyreflyMrtShelfTableOptions } from './lyreflyMrtTableDefaults';
import { LyreflyMrtTableShell } from './LyreflyMrtTableShell';

export type ShowcaseComicsTableProps = {
  rows: LyreflyShelfRow[];
  searchQuery: string;
  onOpen: (projectId: string) => void;
};

export function ShowcaseComicsTable({
  rows,
  searchQuery,
  onOpen,
}: ShowcaseComicsTableProps): ReactElement {
  const theme = useTheme();
  const [sorting, setSorting] = useState<MRT_SortingState>([{ id: 'updatedAt', desc: true }]);

  const columns = useMemo<MRT_ColumnDef<LyreflyShelfRow>[]>(
    () => [
      {
        id: 'cover',
        header: 'Cover',
        enableSorting: false,
        minSize: 56,
        size: 64,
        Cell: ({ row }) => (
          <div className="lyrefly-shelf-table__cover" aria-hidden>
            <LyreflyShelfCover
              project={row.original.project}
              coverRevisionId={row.original.coverRevisionId}
              conceptAssetId={row.original.conceptAssetId}
            />
          </div>
        ),
      },
      {
        id: 'title',
        accessorFn: (row) => row.project.title,
        header: 'Title',
        minSize: 160,
        size: 240,
        Cell: ({ row }) => {
          const { project } = row.original;
          return (
            <div className="lyrefly-shelf-table__title-cell">
              <span className="lyrefly-shelf-table__title">
                <LyreflySearchHighlight text={project.title} query={searchQuery} />
              </span>
              {project.subtitle ? (
                <div className="lyrefly-shelf-table__subtitle">
                  <LyreflySearchHighlight text={project.subtitle} query={searchQuery} />
                </div>
              ) : null}
            </div>
          );
        },
      },
      {
        id: 'stage',
        accessorFn: (row) => row.workflowStage,
        header: 'Stage',
        minSize: 100,
        size: 120,
        sortingFn: (a, b) => {
          const order = ['brainstorm', 'script', 'thumbs', 'art', 'publish'];
          return (
            order.indexOf(a.original.workflowStage) - order.indexOf(b.original.workflowStage)
          );
        },
        Cell: ({ row }) => {
          const archived = isLyreflyProjectArchived(row.original.project);
          return (
            <div className="lyrefly-shelf-table__stage-cell">
              <span className="lyrefly-shelf__stage-pill">
                {workflowStageShelfLabel(row.original.workflowStage)}
              </span>
              {archived ? (
                <span className="lyrefly-shelf__status lyrefly-shelf__status--archived">
                  Archived
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: 'pageCount',
        accessorFn: (row) => row.project.pageCount ?? 0,
        header: 'Pages',
        minSize: 72,
        size: 80,
        Cell: ({ row }) => (
          <span className="lyrefly-shelf-table__num">{row.original.project.pageCount ?? ''}</span>
        ),
      },
      {
        id: 'updatedAt',
        accessorFn: (row) => row.project.updatedAt,
        header: 'Updated',
        minSize: 100,
        size: 120,
        Cell: ({ row }) => (
          <LyreflyDateChip value={row.original.project.updatedAt} ariaLabel="Updated date" />
        ),
      },
    ],
    [searchQuery],
  );

  const mrtTheme = useMemo(
    () => ({ baseBackgroundColor: theme.palette.background.paper }),
    [theme.palette.background.paper],
  );

  const table = useMaterialReactTable({
    ...lyreflyMrtShelfTableOptions<LyreflyShelfRow>(),
    columns,
    data: rows,
    getRowId: (row) => row.project.id,
    enableGlobalFilter: false,
    state: { sorting },
    onSortingChange: setSorting,
    mrtTheme,
    initialState: {
      density: 'compact',
      sorting: [{ id: 'updatedAt', desc: true }],
    },
    muiTableBodyRowProps: ({ row }) => ({
      onClick: (e: ReactMouseEvent<HTMLTableRowElement>) => {
        const el = e.target as HTMLElement;
        if (el.closest('button, a, input, [role="button"]')) return;
        onOpen(row.original.project.id);
      },
      sx: LYREFLY_MRT_CLICKABLE_ROW_SX,
    }),
  });

  return <LyreflyMrtTableShell table={table} />;
}
