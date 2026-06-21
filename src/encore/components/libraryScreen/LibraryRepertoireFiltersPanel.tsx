import BookmarksOutlinedIcon from '@mui/icons-material/BookmarksOutlined';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SearchIcon from '@mui/icons-material/Search';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import type { MRT_TableInstance } from 'material-react-table';
import { useCallback, useId, useState, type ReactElement, type RefObject } from 'react';
import type { EncoreRepertoireSavedSearch } from '../../types';
import { navigateEncore } from '../../routes/encoreAppHash';
import {
  EncoreFilterChipBar,
  type EncoreFilterChipBarHandle,
  type EncoreFilterFieldConfig,
} from '../../ui/EncoreFilterChipBar';
import { EncoreMrtColumnsSettingsButton } from '../../ui/EncoreMrtColumnsSettingsButton';
import type { EncoreDateRangeFilterValue } from '../../utils/encoreDateRangeFilter';
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
  onRepertoireDateRangeChange: (fieldId: string, next: EncoreDateRangeFilterValue) => void;
  excludedRepertoireFilterIds: string[];
  onExcludedRepertoireFilterIdsChange: (next: string[]) => void;
  repertoireAddableFilterFields: EncoreFilterFieldConfig[];
  onVisibleRepertoireFilterIdsChange: (ids: string[]) => void;
  defaultPinnedFieldIds: readonly string[];
  onClearAllFilters: () => void;
  viewMode: RepertoireViewMode;
  onViewModeChange: (next: RepertoireViewMode) => void;
  table: MRT_TableInstance<EncoreRepertoireMrtRow>;
  onResetRepertoireTableLayout: () => void;
  /** Opens the save-search dialog (search + filters snapshot). */
  onSaveCurrentViewClick?: () => void;
  savedSearches: EncoreRepertoireSavedSearch[];
  onApplySavedSearch: (s: EncoreRepertoireSavedSearch) => void;
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
    onRepertoireDateRangeChange,
    excludedRepertoireFilterIds,
    onExcludedRepertoireFilterIdsChange,
    repertoireAddableFilterFields,
    onVisibleRepertoireFilterIdsChange,
    defaultPinnedFieldIds,
    onClearAllFilters,
    viewMode,
    onViewModeChange,
    table,
    onResetRepertoireTableLayout,
    onSaveCurrentViewClick,
    savedSearches,
    onApplySavedSearch,
  } = props;

  const [savedSearchMenuAnchor, setSavedSearchMenuAnchor] = useState<null | HTMLElement>(null);
  const savedSearchMenuOpen = Boolean(savedSearchMenuAnchor);
  const savedSearchMenuId = useId();

  const closeSavedSearchMenu = useCallback(() => setSavedSearchMenuAnchor(null), []);

  if (songsCount === 0) return null;

  return (
    <Box sx={{ mb: { xs: 4, sm: 5 } }}>
      <Stack spacing={2.5}>
        <EncoreToolbarRow sx={{ mb: 0 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ sm: 'stretch' }}
            sx={{ width: 1, maxWidth: { sm: 860 } }}
          >
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
              sx={{ flex: 1, minWidth: 0 }}
            />
            {onSaveCurrentViewClick ? (
              <Button
                variant="outlined"
                size="small"
                startIcon={<BookmarkAddIcon sx={{ fontSize: 18 }} />}
                onClick={onSaveCurrentViewClick}
                sx={{
                  flexShrink: 0,
                  textTransform: 'none',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  alignSelf: { xs: 'stretch', sm: 'auto' },
                }}
              >
                Save search
              </Button>
            ) : null}
            <Button
              variant="outlined"
              size="small"
              startIcon={<BookmarksOutlinedIcon sx={{ fontSize: 20 }} />}
              endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 20 }} />}
              id={`${savedSearchMenuId}-trigger`}
              aria-controls={savedSearchMenuOpen ? `${savedSearchMenuId}-menu` : undefined}
              aria-haspopup="true"
              aria-expanded={savedSearchMenuOpen ? 'true' : undefined}
              onClick={(e) => setSavedSearchMenuAnchor(e.currentTarget)}
              sx={{
                flexShrink: 0,
                textTransform: 'none',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                alignSelf: { xs: 'stretch', sm: 'auto' },
              }}
            >
              Saved searches
              {savedSearches.length > 0 ? (
                <Typography
                  component="span"
                  variant="caption"
                  sx={{ ml: 0.5, color: 'text.secondary', fontWeight: 500 }}
                >
                  ({savedSearches.length})
                </Typography>
              ) : null}
            </Button>
            <Menu
              id={`${savedSearchMenuId}-menu`}
              anchorEl={savedSearchMenuAnchor}
              open={savedSearchMenuOpen}
              onClose={closeSavedSearchMenu}
              slotProps={{ list: { 'aria-labelledby': `${savedSearchMenuId}-trigger`, dense: true } }}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
              {savedSearches.length === 0 ? (
                <MenuItem disabled>No saved searches yet</MenuItem>
              ) : (
                savedSearches.map((s) => (
                  <MenuItem
                    key={s.id}
                    onClick={() => {
                      onApplySavedSearch(s);
                      closeSavedSearchMenu();
                    }}
                    sx={{ py: 1 }}
                  >
                    {s.name}
                  </MenuItem>
                ))
              )}
              <Divider />
              <MenuItem
                onClick={() => {
                  closeSavedSearchMenu();
                  navigateEncore({ kind: 'savedSearches' });
                }}
                sx={{ fontWeight: 600 }}
              >
                Manage saved searches…
              </MenuItem>
            </Menu>
          </Stack>
        </EncoreToolbarRow>

        <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1} useFlexGap>
          <EncoreFilterChipBar
            ref={repertoireFilterBarRef}
            fields={repertoireFilterFieldDefs}
            visibleFieldIds={visibleRepertoireFilterIds}
            values={repertoireFilterValues}
            onChange={onRepertoireFilterChange}
            onDateRangeChange={onRepertoireDateRangeChange}
            excludedFieldIds={excludedRepertoireFilterIds}
            onExcludedFieldIdsChange={onExcludedRepertoireFilterIdsChange}
            addableFields={repertoireAddableFilterFields}
            onVisibleFieldIdsChange={onVisibleRepertoireFilterIdsChange}
            defaultPinnedFieldIds={[...defaultPinnedFieldIds]}
            hasActiveFilters={hasActiveFilters}
            onClearAll={onClearAllFilters}
          />
        </Stack>
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
