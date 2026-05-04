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
  table: MRT_TableInstance<PerfMrtRow>;
  onResetTableLayout: () => void;
  perfFilterBarRef: RefObject<EncoreFilterChipBarHandle | null>;
  perfFilterFieldDefs: EncoreFilterFieldConfig[];
  visiblePerfFilterIds: string[];
  perfFilterValues: Record<string, string[]>;
  onPerfFilterChange: (fieldId: string, next: string[]) => void;
  perfAddableFilterFields: EncoreFilterFieldConfig[];
  onVisiblePerfFilterIdsChange: (ids: string[]) => void;
  defaultPinnedFieldIds: readonly string[];
  onClearAllFilters: () => void;
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
    perfAddableFilterFields,
    onVisiblePerfFilterIdsChange,
    defaultPinnedFieldIds,
    onClearAllFilters,
  } = props;

  return (
    <>
      <EncoreToolbarRow>
        <TextField
          size="small"
          fullWidth
          placeholder="Search song, artist, venue, date…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          inputProps={{ 'aria-label': 'Search performances' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" aria-hidden />
              </InputAdornment>
            ),
          }}
          sx={{ maxWidth: { sm: 560 } }}
        />
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
              addableFields={perfAddableFilterFields}
              onVisibleFieldIdsChange={onVisiblePerfFilterIdsChange}
              defaultPinnedFieldIds={[...defaultPinnedFieldIds]}
              hasActiveFilters={hasActivePerfFilters}
              onClearAll={onClearAllFilters}
            />
            <Stack direction="row" flexWrap="wrap" alignItems="center" justifyContent="space-between" gap={1} useFlexGap>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, minWidth: 0 }}>
                Showing {filteredCount} of {performancesCount}{' '}
                {performancesCount === 1 ? 'performance' : 'performances'}
                {hasActivePerfFilters || query.trim() ? ' · search or filters applied' : ''}
              </Typography>
              <Stack direction="row" alignItems="center" gap={2.5} sx={{ flexShrink: 0 }}>
                <EncoreMrtColumnsSettingsButton
                  show={viewMode === 'table'}
                  table={table}
                  onResetLayout={onResetTableLayout}
                />
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
            </Stack>
          </Stack>
        </Box>
      ) : null}
    </>
  );
}
