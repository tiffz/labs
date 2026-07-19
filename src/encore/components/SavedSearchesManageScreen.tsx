import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import { LabsListLoadingState } from '../../shared/components/LabsListLoadingState';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import type { EncoreRepertoireSavedSearch } from '../types';
import { useEncoreHeavyListTabLaidOut } from '../utils/useEncoreHeavyListTabLaidOut';
import { useEncoreActions, useEncoreLibraryExtras, useEncoreLibraryTables } from '../context/EncoreContext';
import { useEncoreRepertoirePlaylist } from '../context/EncoreRepertoirePlaylistContext';
import { encoreAppHref, handleSpaLinkClick, navigateEncore } from '../routes/encoreAppHash';
import {
  derivePlaylistImportTagsFromFilters,
  normalizeExcludedRepertoireFieldIds,
  normalizeSavedSearchFilterValues,
} from '../repertoire/repertoireSavedSearchFilter';
import { buildLibraryRepertoireFilterFieldDefs } from '../repertoire/buildLibraryRepertoireFilterFieldDefs';
import { parseSpotifyPlaylistId } from '../spotify/parseSpotifyPlaylistUrl';
import { encorePagePaddingTop, encoreScreenPaddingX } from '../theme/encoreM3Layout';
import { encoreMaxWidthNarrowPage, encoreRadius } from '../theme/encoreUiTokens';
import {
  EncoreFilterChipBar,
  type EncoreFilterFieldConfig,
} from '../ui/EncoreFilterChipBar';
import { EncorePageHeader } from '../ui/EncorePageHeader';
import { EncoreSynchronizableSpotifyPlaylistPanel } from '../ui/EncoreSynchronizableSpotifyPlaylistPanel';
import { REPERTOIRE_FILTER_PINNED, formatShortDate } from './libraryScreenHelpers';

/**
 * Tooltip body for the saved-search Spotify section. Same shape (subtitle + paragraphs) as the
 * Practice page's `LEARNING_PLAYLIST_HELP_CONTENT` so the two sync surfaces feel like one family.
 * Saved-search sync is one-way (overwrite the playlist from filter results) — that distinction is
 * called out here so the user isn't surprised when Spotify-side edits get clobbered.
 */
const SAVED_SEARCH_SYNC_HELP_CONTENT = (
  <Box sx={{ maxWidth: 300, py: 0.25 }}>
    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>
      Spotify playlist
    </Typography>
    <Typography variant="body2" sx={{ lineHeight: 1.5, mb: 1 }}>
      Optional. Tie this saved search to a Spotify playlist you own and Encore can keep it in sync
      with the songs that match its filters.
    </Typography>
    <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
      Sync rewrites the playlist from your matching repertoire — it’s one-way, so any edits you’ve
      made on Spotify will be replaced.
    </Typography>
  </Box>
);

/**
 * Section label inside a saved-search card. Lowers the visual weight of headings so groups read
 * as one card instead of a stack of nested boxes.
 */
function SectionLabel({ children }: { children: string }): ReactElement {
  return (
    <Typography
      variant="caption"
      sx={{
        color: "text.secondary",
        display: 'block',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        fontSize: '0.6875rem',
        lineHeight: 1.4,
        mb: 1
      }}>
      {children}
    </Typography>
  );
}

type SavedSearchEditorCardProps = {
  saved: EncoreRepertoireSavedSearch;
  filterFieldDefs: EncoreFilterFieldConfig[];
  addableFilterFields: EncoreFilterFieldConfig[];
  onCommit: (next: EncoreRepertoireSavedSearch) => void;
  onDelete: (id: string) => void;
};

function SavedSearchEditorCard(props: SavedSearchEditorCardProps): ReactElement {
  const { saved, filterFieldDefs, addableFilterFields, onCommit, onDelete } = props;
  const {
    spotifyClientId,
    clientIdConfigured,
    spotifyLinked,
    runSavedSearchPlaylistSync,
    syncBusySavedSearchId,
  } = useEncoreRepertoirePlaylist();

  const [name, setName] = useState(saved.name);
  const [searchQuery, setSearchQuery] = useState(saved.searchQuery);
  const [visibleFieldIds, setVisibleFieldIds] = useState<string[]>(saved.visibleFieldIds);
  const [filterValues, setFilterValues] = useState<Record<string, string[]>>(saved.filterValues);
  const [excludedFieldIds, setExcludedFieldIds] = useState<string[]>(
    normalizeExcludedRepertoireFieldIds(saved.excludedFieldIds),
  );
  const [playlistDraft, setPlaylistDraft] = useState(saved.spotifyPlaylistId?.trim() ?? '');

  useEffect(() => {
    setName(saved.name);
    setSearchQuery(saved.searchQuery);
    setVisibleFieldIds(saved.visibleFieldIds.length > 0 ? saved.visibleFieldIds : [...REPERTOIRE_FILTER_PINNED]);
    setFilterValues(normalizeSavedSearchFilterValues(saved.filterValues));
    setExcludedFieldIds(normalizeExcludedRepertoireFieldIds(saved.excludedFieldIds));
    setPlaylistDraft(saved.spotifyPlaylistId?.trim() ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resync draft only when persisted row bumps updatedAt
  }, [saved.id, saved.updatedAt]);

  const onRepertoireFilterChange = useCallback((fieldId: string, nextValues: string[]) => {
    setFilterValues((prev) => ({ ...prev, [fieldId]: nextValues }));
  }, []);

  /**
   * Resolved id (parsed from URL when possible) drives the Spotify deep-link in the panel and
   * the Sync gate. Mirrors the same parser used in `buildPersistedRow` so the link target and
   * the persisted row never disagree.
   */
  const resolvedPlaylistId =
    parseSpotifyPlaylistId(playlistDraft.trim()) ?? playlistDraft.trim().replace(/^\/+|\/+$/g, '');
  const busy = syncBusySavedSearchId === saved.id;
  const normalizedVisible =
    visibleFieldIds.length > 0 ? visibleFieldIds : [...REPERTOIRE_FILTER_PINNED];

  const buildPersistedRow = (): EncoreRepertoireSavedSearch => {
    const fv = normalizeSavedSearchFilterValues(filterValues);
    const excluded = normalizeExcludedRepertoireFieldIds(excludedFieldIds);
    const rawPl = playlistDraft.trim();
    const spotifyPlaylistId = rawPl
      ? parseSpotifyPlaylistId(rawPl) ?? rawPl.replace(/^\/+|\/+$/g, '')
      : undefined;
    return {
      ...saved,
      name: name.trim() || saved.name,
      searchQuery,
      visibleFieldIds: normalizedVisible,
      filterValues: fv,
      excludedFieldIds: excluded.length > 0 ? excluded : undefined,
      spotifyPlaylistId,
      playlistImportTags: derivePlaylistImportTagsFromFilters(fv, excluded),
      updatedAt: new Date().toISOString(),
    };
  };

  const handleSave = () => {
    onCommit(buildPersistedRow());
  };

  const handleSync = () => {
    runSavedSearchPlaylistSync(buildPersistedRow());
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2.25, sm: 3 },
        borderRadius: encoreRadius,
        borderColor: 'divider',
        boxShadow: 'none',
      }}
    >
      <Stack spacing={2.75}>
        {/* Card chrome: name (primary identity) + delete (destructive, right-aligned) */}
        <Stack direction="row" spacing={1.5} sx={{
          alignItems: "flex-start"
        }}>
          <TextField
            label="Name"
            size="small"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ flex: 1 }}
          />
          <Tooltip title="Delete saved search">
            <IconButton
              size="small"
              color="error"
              aria-label={`Delete saved search ${saved.name}`}
              onClick={() => onDelete(saved.id)}
              sx={{ mt: 0.5 }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>

        {/* Filters group: text + chips together */}
        <Box>
          <SectionLabel>Filters</SectionLabel>
          <Stack spacing={1.5}>
            <TextField
              size="small"
              fullWidth
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Matches title, artist, venue, key…"
              slotProps={{
                htmlInput: { 'aria-label': 'Search text' }
              }}
            />
            <EncoreFilterChipBar
              fields={filterFieldDefs}
              visibleFieldIds={normalizedVisible}
              values={filterValues}
              onChange={onRepertoireFilterChange}
              excludedFieldIds={excludedFieldIds}
              onExcludedFieldIdsChange={setExcludedFieldIds}
              addableFields={addableFilterFields}
              onVisibleFieldIdsChange={setVisibleFieldIds}
              defaultPinnedFieldIds={[...REPERTOIRE_FILTER_PINNED]}
              hasActiveFilters={Boolean(
                Object.values(filterValues).some((a) => Array.isArray(a) && a.length > 0),
              )}
              onClearAll={() => {
                setFilterValues(normalizeSavedSearchFilterValues({}));
                setExcludedFieldIds([]);
              }}
            />
          </Stack>
        </Box>

        {/*
         * Spotify playlist binding goes through the shared `EncoreSynchronizableSpotifyPlaylistPanel`
         * so this surface stays in lock-step with the Practice learning-playlist UI: same chip
         * showing the live playlist *name* (not just the id), same Sync / Open / Edit affordances,
         * and the same single source of truth for icon ordering. Future polish on either surface
         * benefits both for free.
         *
         * Note on commit semantics: the panel's inline Save button calls `handleSave`, which
         * writes the entire row (name + filters + playlist) — same code path as the bottom
         * "Save changes" button. This intentionally lets a fast inline-Save also persist any
         * pending name/filter edits without surprising the user (everything they were editing
         * lands together).
         */}
        <Box>
          <EncoreSynchronizableSpotifyPlaylistPanel
            sectionTitle="Spotify playlist"
            inlineSectionTitle
            helpContent={SAVED_SEARCH_SYNC_HELP_CONTENT}
            spotifyClientId={spotifyClientId}
            savedPlaylistId={saved.spotifyPlaylistId?.trim() ?? ''}
            playlistField={playlistDraft}
            onPlaylistFieldChange={setPlaylistDraft}
            onSavePlaylistId={handleSave}
            resolvedPlaylistId={resolvedPlaylistId}
            onSync={handleSync}
            syncBusy={busy}
            spotifyLinked={spotifyLinked}
            clientIdConfigured={clientIdConfigured}
            syncReadyTooltip="Rewrite this playlist from songs that match the filters above"
          />
        </Box>

        {/* Footer: meta + primary save (parallel weight to delete affordance up top) */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{
            justifyContent: "space-between",
            alignItems: { xs: 'flex-start', sm: 'center' },
            pt: 0.25
          }}>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 500
            }}>
            Updated {formatShortDate(saved.updatedAt)}
          </Typography>
          <Button
            variant="contained"
            size="small"
            onClick={handleSave}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Save changes
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

export function SavedSearchesManageScreen(props?: {
  onHeavyTabLaidOut?: () => void;
}): ReactElement {
  const { onHeavyTabLaidOut } = props ?? {};
  const { songs, performances, songsHydrated } = useEncoreLibraryTables();
  const { repertoireExtras, effectiveDisplayName, extrasHydrated } = useEncoreLibraryExtras();
  const { saveRepertoireExtras } = useEncoreActions();
  const { clientIdConfigured, syncError, dismissSyncError } = useEncoreRepertoirePlaylist();

  const extrasRef = useRef(repertoireExtras);
  extrasRef.current = repertoireExtras;

  const savedSearches = repertoireExtras.repertoireSavedSearches ?? [];

  useEncoreHeavyListTabLaidOut(true, songsHydrated, onHeavyTabLaidOut);

  const filterFieldDefs = useMemo(
    () =>
      buildLibraryRepertoireFilterFieldDefs({
        songs,
        performances,
        venueCatalog: repertoireExtras.venueCatalog,
        milestoneTemplate: repertoireExtras.milestoneTemplate,
      }),
    [songs, performances, repertoireExtras.venueCatalog, repertoireExtras.milestoneTemplate],
  );

  const addableFilterFields = useMemo(() => {
    const pinned = new Set<string>([...REPERTOIRE_FILTER_PINNED]);
    return filterFieldDefs.filter((f) => !pinned.has(f.id));
  }, [filterFieldDefs]);

  const replaceSavedSearch = useCallback(
    (next: EncoreRepertoireSavedSearch) => {
      const list = extrasRef.current.repertoireSavedSearches ?? [];
      void saveRepertoireExtras({
        repertoireSavedSearches: list.map((x) => (x.id === next.id ? next : x)),
      });
    },
    [saveRepertoireExtras],
  );

  const deleteSavedSearch = useCallback(
    (id: string) => {
      const list = extrasRef.current.repertoireSavedSearches ?? [];
      void saveRepertoireExtras({
        repertoireSavedSearches: list.filter((x) => x.id !== id),
      });
    },
    [saveRepertoireExtras],
  );

  const title = effectiveDisplayName ? `${effectiveDisplayName}'s saved searches` : 'Saved searches';

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        width: 1,
        px: encoreScreenPaddingX,
        pt: encorePagePaddingTop,
        pb: { xs: 6, sm: 8 },
      }}
    >
      <Box sx={{ ...encoreMaxWidthNarrowPage }}>
        <Stack spacing={3}>
          <Button
            size="small"
            startIcon={<ArrowBackIcon />}
            component="a"
            href={encoreAppHref({ kind: 'library' })}
            onClick={(e) => handleSpaLinkClick(e, () => navigateEncore({ kind: 'library' }))}
            sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 600 }}
          >
            Back to repertoire
          </Button>

          <EncorePageHeader
            title={title}
            description="Edit names, filters, and Spotify playlist links."
          />

          {syncError || !clientIdConfigured ? (
            <Stack spacing={1}>
              {syncError ? (
                <Alert severity="warning" onClose={dismissSyncError} sx={{ py: 0.5 }}>
                  {syncError}
                </Alert>
              ) : null}
              {!clientIdConfigured ? (
                <Alert severity="info" sx={{ py: 0.5 }}>
                  Set <code>VITE_SPOTIFY_CLIENT_ID</code> to link saved searches with Spotify playlists.
                </Alert>
              ) : null}
            </Stack>
          ) : null}

          {!extrasHydrated ? (
            <LabsListLoadingState label="Loading saved searches" variant="skeleton" />
          ) : savedSearches.length === 0 ? (
            <Paper
              variant="outlined"
              sx={{
                p: { xs: 3, sm: 4 },
                borderRadius: encoreRadius,
                borderColor: 'divider',
                textAlign: 'center',
                boxShadow: 'none',
              }}
            >
              <Stack spacing={1.25} sx={{
                alignItems: "center"
              }}>
                <BookmarkBorderIcon sx={{ fontSize: 32, color: 'text.disabled' }} aria-hidden />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Nothing here yet.
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    maxWidth: 360,
                    lineHeight: 1.55
                  }}>
                  Save a search from the repertoire toolbar to keep its filters and search text together here.
                </Typography>
              </Stack>
            </Paper>
          ) : (
            <Stack spacing={2}>
              {savedSearches.map((s) => (
                <SavedSearchEditorCard
                  key={s.id}
                  saved={s}
                  filterFieldDefs={filterFieldDefs}
                  addableFilterFields={addableFilterFields}
                  onCommit={replaceSavedSearch}
                  onDelete={deleteSavedSearch}
                />
              ))}
            </Stack>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
