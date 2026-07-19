import SearchIcon from '@mui/icons-material/Search';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import type { MRT_TableInstance } from 'material-react-table';
import type { ReactElement, RefObject } from 'react';
import {
  EncoreFilterChipBar,
  type EncoreFilterChipBarHandle,
  type EncoreFilterFieldConfig,
} from '../../ui/EncoreFilterChipBar';
import { EncoreMrtColumnsSettingsButton } from '../../ui/EncoreMrtColumnsSettingsButton';
import type { EncoreDateRangeFilterValue } from '../../utils/encoreDateRangeFilter';
import { encoreListSurfaceTopGap, encoreListToolbarGap } from '../../theme/encoreM3Layout';
import { EncoreToolbarRow } from '../../ui/EncoreToolbarRow';
import type { PerformancesViewMode, PerfMrtRow } from '../performancesScreenHelpers';

export type PerformancesListToolbarProps = {
  query: string;
  onQueryChange: (next: string) => void;
  performancesCount: number;
  filteredCount: number;
  hasActivePerfFilters: boolean;
  viewMode: PerformancesViewMode;
  onViewModeChange: (next: PerformancesViewMode) => void;
  table: MRT_TableInstance<PerfMrtRow> | null;
  onResetTableLayout: () => void;
  perfFilterBarRef: RefObject<EncoreFilterChipBarHandle | null>;
  perfFilterFieldDefs: EncoreFilterFieldConfig[];
  visiblePerfFilterIds: string[];
  perfFilterValues: Record<string, string[]>;
  onPerfFilterChange: (fieldId: string, next: string[]) => void;
  onPerfDateRangeChange: (fieldId: string, next: EncoreDateRangeFilterValue) => void;
  perfAddableFilterFields: EncoreFilterFieldConfig[];
  onVisiblePerfFilterIdsChange: (ids: string[]) => void;
  defaultPinnedFieldIds: readonly string[];
  onClearAllFilters: () => void;
  /** Tighter search + filters row so the table gets more viewport height. */
  compact?: boolean;
};

export function PerformancesListToolbar(props: PerformancesListToolbarProps): ReactElement {
  const {
    query,
    onQueryChange,
    performancesCount,
    filteredCount,
    hasActivePerfFilters,
    viewMode,
    onViewModeChange,
    table,
    onResetTableLayout,
    perfFilterBarRef,
    perfFilterFieldDefs,
    visiblePerfFilterIds,
    perfFilterValues,
    onPerfFilterChange,
    onPerfDateRangeChange,
    perfAddableFilterFields,
    onVisiblePerfFilterIdsChange,
    defaultPinnedFieldIds,
    onClearAllFilters,
    compact = false,
  } = props;

  const trailingControls = (
    <Stack
      direction="row"
      sx={{
        alignItems: "center",
        gap: compact ? 1.25 : 2.5,
        flexShrink: 0
      }}>
      {table ? (
        <EncoreMrtColumnsSettingsButton
          show={viewMode === 'table'}
          table={table}
          onResetLayout={onResetTableLayout}
        />
      ) : null}
      <ToggleButtonGroup
        exclusive
        size="small"
        value={viewMode}
        onChange={(_e, next: PerformancesViewMode | null) => {
          if (next) onViewModeChange(next);
        }}
        aria-label="Performances layout"
      >
        <Tooltip title="Table view">
          <ToggleButton value="table" aria-label="Table view">
            <ViewListIcon fontSize="small" />
          </ToggleButton>
        </Tooltip>
        <Tooltip title="Grid view">
          <ToggleButton value="grid" aria-label="Grid view">
            <ViewModuleIcon fontSize="small" />
          </ToggleButton>
        </Tooltip>
      </ToggleButtonGroup>
    </Stack>
  );

  if (compact && performancesCount > 0) {
    return (
      <Box
        sx={{
          flexShrink: 0,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: { xs: 0.75, sm: 1 },
          mt: encoreListToolbarGap,
          mb: encoreListSurfaceTopGap,
        }}
      >
        <TextField
          size="small"
          placeholder="Search song, artist, venue, date…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          sx={{ flex: '1 1 12rem', minWidth: 0, maxWidth: { md: 320 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" aria-hidden />
                </InputAdornment>
              ),
            },

            htmlInput: { 'aria-label': 'Search performances' }
          }} />
        <Box sx={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.75 }}>
          <EncoreFilterChipBar
            ref={perfFilterBarRef}
            fields={perfFilterFieldDefs}
            visibleFieldIds={visiblePerfFilterIds}
            values={perfFilterValues}
            onChange={onPerfFilterChange}
            onDateRangeChange={onPerfDateRangeChange}
            addableFields={perfAddableFilterFields}
            onVisibleFieldIdsChange={onVisiblePerfFilterIdsChange}
            defaultPinnedFieldIds={[...defaultPinnedFieldIds]}
            hasActiveFilters={hasActivePerfFilters}
            onClearAll={onClearAllFilters}
          />
        </Box>
        {trailingControls}
      </Box>
    );
  }

  return (
    <>
      <EncoreToolbarRow>
        <TextField
          size="small"
          fullWidth
          placeholder="Search song, artist, venue, date…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          sx={{ maxWidth: { sm: 560 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" aria-hidden />
                </InputAdornment>
              ),
            },

            htmlInput: { 'aria-label': 'Search performances' }
          }} />
      </EncoreToolbarRow>
      {performancesCount > 0 ? (
        <Box sx={{ mt: 2, mb: 1 }}>
          <Stack spacing={0.75}>
            <EncoreFilterChipBar
              ref={perfFilterBarRef}
              fields={perfFilterFieldDefs}
              visibleFieldIds={visiblePerfFilterIds}
              values={perfFilterValues}
              onChange={onPerfFilterChange}
              onDateRangeChange={onPerfDateRangeChange}
              addableFields={perfAddableFilterFields}
              onVisibleFieldIdsChange={onVisiblePerfFilterIdsChange}
              defaultPinnedFieldIds={[...defaultPinnedFieldIds]}
              hasActiveFilters={hasActivePerfFilters}
              onClearAll={onClearAllFilters}
            />
            <Stack
              direction="row"
              useFlexGap
              sx={{
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1
              }}>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontWeight: 500,
                  minWidth: 0
                }}>
                Showing {filteredCount} of {performancesCount}{' '}
                {performancesCount === 1 ? 'performance' : 'performances'}
                {hasActivePerfFilters || query.trim() ? ' · search or filters applied' : ''}
              </Typography>
              {trailingControls}
            </Stack>
          </Stack>
        </Box>
      ) : null}
    </>
  );
}
