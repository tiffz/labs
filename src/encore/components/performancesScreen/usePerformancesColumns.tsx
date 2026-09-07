/* eslint-disable react/prop-types -- MRT Cell / Header render props are typed via MRT_ColumnDef, not PropTypes */
/* eslint-disable react-refresh/only-export-components -- this file exports a hook, not components; PerfSongColumnCell is local to it */
import { useContext, useMemo, useRef, type ReactElement, type RefObject } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import type { MRT_ColumnDef, MRT_Row } from 'material-react-table';
import AppTooltip from '../../../shared/components/AppTooltip';
import { EncoreMrtColumnHeader } from '../../ui/EncoreMrtColumnHeader';
import { HighlightedText } from '../../ui/HighlightedText';
import { InlineChipDate, InlineChipMultiSelect, InlineChipSelect } from '../../ui/InlineEditChip';
import { performanceVideoOpenUrl } from '../../utils/performanceVideoUrl';
import { PerformanceVideoThumb } from '../PerformanceVideoThumb';
import { EncoreMrtSearchHighlightContext } from '../encoreMrtSearchHighlightContext';
import {
  ENCORE_ACCOMPANIMENT_TAGS,
  ENCORE_PERFORMANCE_ROLES,
  type EncoreAccompanimentTag,
  type EncorePerformance,
  type EncorePerformanceRole,
} from '../../types';
import { formatPerformanceNotesLine, type PerfMrtRow } from '../performancesScreenHelpers';
import type { EncoreFilterChipBarHandle } from '../../ui/EncoreFilterChipBar';

function PerfSongColumnCell({ row }: { row: MRT_Row<PerfMrtRow> }): ReactElement {
  const highlight = useContext(EncoreMrtSearchHighlightContext);
  const { subject, artistLabel, perf } = row.original;
  // Route by subject, so an original opens its songwriting page rather than dead-ending.
  const href = subject.href ?? undefined;
  return (
    <Box>
      <Button
        variant="text"
        size="small"
        disabled={!href}
        component={href ? 'a' : 'button'}
        href={href}
        sx={{
          textAlign: 'left',
          justifyContent: 'flex-start',
          fontWeight: 600,
          textTransform: 'none',
          p: 0,
          minWidth: 0,
          maxWidth: '100%',
          color: 'text.primary',
          '&:hover': { bgcolor: 'transparent', color: 'primary.main' },
        }}
      >
        <AppTooltip title={row.original.songLabel}>
          <Box component="span" sx={{ display: 'block', minWidth: 0, maxWidth: '100%' }}>
            <HighlightedText
              text={row.original.songLabel}
              highlight={highlight}
              variant="body2"
              sx={{
                fontWeight: 600,
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            />
          </Box>
        </AppTooltip>
      </Button>
      {artistLabel ? (
        <AppTooltip title={artistLabel}>
          <Box component="span" sx={{ display: 'block', minWidth: 0, maxWidth: '100%' }}>
            <HighlightedText
              text={artistLabel}
              highlight={highlight}
              variant="caption"
              sx={{
                color: 'text.secondary',
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            />
          </Box>
        </AppTooltip>
      ) : null}
      {perf.notes ? (
        <AppTooltip title={perf.notes}>
          <Box component="span" sx={{ display: 'block', minWidth: 0, maxWidth: '100%', mt: 0.25 }}>
            <HighlightedText
              text={formatPerformanceNotesLine(perf.notes)}
              highlight={highlight}
              variant="caption"
              sx={{ color: 'text.secondary', lineHeight: 1.4, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}
            />
          </Box>
        </AppTooltip>
      ) : null}
    </Box>
  );
}

/**
 * Performances table column definitions.
 *
 * Extracted from `PerformancesScreen.tsx` — 155 lines of column defs plus the 73-line song cell —
 * because that file had grown to ~1990 lines and sat exactly at the React Compiler's bail
 * threshold. Past it the compiler stops preserving memoization across the WHOLE component, so
 * adding a single `useState` cost 8 `react-hooks/preserve-manual-memoization` violations, all of
 * them landing on unrelated pre-existing callbacks.
 *
 * That is the real cost of an oversized component here: not readability, but unrelated code
 * silently losing memoization. See `docs/COMPONENT_DECOMPOSITION_PATTERN.md`.
 */
export interface UsePerformancesColumnsArgs {
  heavyListTabActive: boolean;
  googleAccessToken: string | null;
  venueOptions: string[];
  updatePerformance: (next: EncorePerformance) => void | Promise<void>;
  perfFilterBarRef: RefObject<EncoreFilterChipBarHandle | null>;
}

export function usePerformancesColumns({
  heavyListTabActive,
  googleAccessToken,
  venueOptions,
  updatePerformance,
  perfFilterBarRef,
}: UsePerformancesColumnsArgs): MRT_ColumnDef<PerfMrtRow>[] {
  const perfColumnsCacheRef = useRef<MRT_ColumnDef<PerfMrtRow>[]>([]);

  const columns = useMemo<MRT_ColumnDef<PerfMrtRow>[]>(() => {
    if (!heavyListTabActive) return perfColumnsCacheRef.current;
    const next: MRT_ColumnDef<PerfMrtRow>[] = [
    {
      id: 'video',
      header: 'Video',
      Header: ({ column }) => <EncoreMrtColumnHeader label="Video" column={column} />,
      size: 120,
      enableColumnFilter: false,
      enableSorting: false,
      Cell: ({ row }) => {
        const url = performanceVideoOpenUrl(row.original.perf);
        const thumb = (
          <PerformanceVideoThumb performance={row.original.perf} width={100} alt="" googleAccessToken={googleAccessToken} />
        );
        if (url) {
          return (
            <Box
              component="a"
              href={url}
              target="_blank"
              rel="noreferrer"
              aria-label="Open performance video"
              onClick={(e) => e.stopPropagation()}
              sx={{
                display: 'inline-flex',
                borderRadius: 1,
                lineHeight: 0,
                textDecoration: 'none',
                color: 'inherit',
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: 'primary.main',
                  outlineOffset: 2,
                },
              }}
            >
              {thumb}
            </Box>
          );
        }
        return (
          <Box sx={{ lineHeight: 0 }} aria-label="No video link">
            {thumb}
          </Box>
        );
      },
    },
    {
      accessorKey: 'date',
      header: 'Date',
      meta: { encoreFilterFieldId: 'perfDate' },
      Header: ({ column }) => (
        <EncoreMrtColumnHeader label="Date" column={column} filterBarRef={perfFilterBarRef} />
      ),
      size: 160,
      enableColumnFilter: false,
      Cell: ({ row }) => (
        <InlineChipDate
          value={row.original.date}
          placeholder="Set date"
          onChange={(d) => {
            if (!d) return;
            void updatePerformance({ ...row.original.perf, date: d });
          }}
        />
      ),
    },
    {
      accessorKey: 'songLabel',
      header: 'Song',
      meta: { encoreFilterFieldId: 'song' },
      Header: ({ column }) => (
        <EncoreMrtColumnHeader label="Song" column={column} filterBarRef={perfFilterBarRef} />
      ),
      size: 240,
      minSize: 180,
      enableColumnFilter: false,
      Cell: ({ row }) => <PerfSongColumnCell row={row} />,
    },
    {
      accessorKey: 'venue',
      header: 'Venue',
      meta: { encoreFilterFieldId: 'venue' },
      Header: ({ column }) => (
        <EncoreMrtColumnHeader label="Venue" column={column} filterBarRef={perfFilterBarRef} />
      ),
      size: 140,
      minSize: 120,
      Cell: ({ row }) => (
        <InlineChipSelect<string>
          value={row.original.venue}
          options={venueOptions}
          freeSolo
          placeholder="Venue"
          onChange={(v) => {
            if (v == null) return;
            void updatePerformance({ ...row.original.perf, venueTag: v });
          }}
        />
      ),
    },
    {
      accessorKey: 'role',
      header: 'Your role',
      meta: { encoreFilterFieldId: 'role' },
      Header: ({ column }) => (
        <EncoreMrtColumnHeader label="Your role" column={column} filterBarRef={perfFilterBarRef} />
      ),
      size: 130,
      minSize: 110,
      Cell: ({ row }) => (
        <InlineChipSelect<EncorePerformanceRole>
          value={row.original.role}
          options={ENCORE_PERFORMANCE_ROLES}
          placeholder="Role"
          onChange={(v) => {
            if (v == null) return;
            // Store the default as absent, matching the editor, so unchanged rows stay
            // byte-identical on the wire.
            void updatePerformance({
              ...row.original.perf,
              role: v === 'Lead vocal' ? undefined : v,
            });
          }}
        />
      ),
    },
    {
      accessorKey: 'accompaniment',
      header: 'Accompaniment',
      meta: { encoreFilterFieldId: 'accompaniment' },
      Header: ({ column }) => (
        <EncoreMrtColumnHeader label="Accompaniment" column={column} filterBarRef={perfFilterBarRef} />
      ),
      size: 160,
      minSize: 140,
      Cell: ({ row }) => (
        <InlineChipMultiSelect<EncoreAccompanimentTag>
          values={row.original.accompaniment}
          options={ENCORE_ACCOMPANIMENT_TAGS}
          placeholder="Add tags"
          onChange={(arr) => {
            void updatePerformance({
              ...row.original.perf,
              accompanimentTags: arr.length ? arr : undefined,
            });
          }}
        />
      ),
    },
  ];
    perfColumnsCacheRef.current = next;
    return next;
  }, [heavyListTabActive, googleAccessToken, venueOptions, updatePerformance, perfFilterBarRef]);

  return columns;
}
