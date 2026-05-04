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
import type { EncoreRepertoireMrtRow } from './libraryRepertoireMrtRowTypes';
import type { RepertoireViewMode } from '../libraryScreenHelpers';

export type LibraryRepertoireFiltersPanelProps = {
  songsCount: number;
  repertoireSongsCount: number;
  searchQuery: string;
  onSearchQueryChange: (next: string) => void;
  hasActiveFilters: boolean;
  repertoireFilterBarRef: RefObject<EncoreFilterChipBarHandle | null>;
  repertoireFilterFieldDefs: EncoreFilterFieldConfig[];
  visibleRepertoireFilterIds: string[];
  repertoireFilterValues: Record<string, string[]>;
  onRepertoireFilterChange: (fieldId: string, next: string[]) => void;
  repertoireAddableFilterFields: EncoreFilterFieldConfig[];
  onVisibleRepertoireFilterIdsChange: (ids: string[]) => void;
  defaultPinnedFieldIds: readonly string[];
  onClearAllFilters: () => void;
  viewMode: RepertoireViewMode;
  onViewModeChange: (next: RepertoireViewMode) => void;
  table: MRT_TableInstance<EncoreRepertoireMrtRow>;
  onResetRepertoireTableLayout: () => void;
};

export function LibraryRepertoireFiltersPanel(props: LibraryRepertoireFiltersPanelProps): ReactElement | null {
  const {
    songsCount,
    repertoireSongsCount,
    searchQuery,
    onSearchQueryChange,
    hasActiveFilters,
    repertoireFilterBarRef,
    repertoireFilterFieldDefs,
    visibleRepertoireFilterIds,
    repertoireFilterValues,
    onRepertoireFilterChange,
    repertoireAddableFilterFields,
    onVisibleRepertoireFilterIdsChange,
    defaultPinnedFieldIds,
    onClearAllFilters,
    viewMode,
    onViewModeChange,
    table,
    onResetRepertoireTableLayout,
  } = props;

  if (songsCount === 0) return null;

  return (
    <Box sx={{ mb: { xs: 4, sm: 5 } }}>
      <Stack spacing={2.5}>
        <EncoreToolbarRow sx={{ mb: 0 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Search title, artist, venue, key…"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            inputProps={{ 'aria-label': 'Search repertoire' }}
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

        <EncoreFilterChipBar
          ref={repertoireFilterBarRef}
          fields={repertoireFilterFieldDefs}
          visibleFieldIds={visibleRepertoireFilterIds}
          values={repertoireFilterValues}
          onChange={onRepertoireFilterChange}
          addableFields={repertoireAddableFilterFields}
          onVisibleFieldIdsChange={onVisibleRepertoireFilterIdsChange}
          defaultPinnedFieldIds={[...defaultPinnedFieldIds]}
          hasActiveFilters={hasActiveFilters}
          onClearAll={onClearAllFilters}
        />
        <Stack direction="row" flexWrap="wrap" alignItems="center" justifyContent="space-between" gap={1} useFlexGap>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, minWidth: 0 }}>
            Showing {repertoireSongsCount} of {songsCount} {songsCount === 1 ? 'song' : 'songs'}
            {hasActiveFilters || searchQuery.trim() ? ' · search or filters applied' : ''}
          </Typography>
          <Stack direction="row" alignItems="center" gap={2.5} sx={{ flexShrink: 0 }}>
            <EncoreMrtColumnsSettingsButton
              show={viewMode === 'table'}
              table={table}
              onResetLayout={onResetRepertoireTableLayout}
            />
            <ToggleButtonGroup
              exclusive
              size="small"
              value={viewMode}
              onChange={(_e, next: RepertoireViewMode | null) => {
                if (next) onViewModeChange(next);
              }}
              aria-label="Repertoire layout"
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
  );
}
