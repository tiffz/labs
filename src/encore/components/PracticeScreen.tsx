import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SyncIcon from '@mui/icons-material/Sync';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEncoreBlockingJobs } from '../context/EncoreBlockingJobContext';
import { useEncore } from '../context/EncoreContext';
import { driveFileWebUrl } from '../drive/driveWebUrls';
import {
  bestImportMatch,
  IMPORT_MATCH_AUTO_MIN,
  IMPORT_MATCH_SUGGEST_MIN,
  mergeSongWithImport,
} from '../import/findExistingSongForImport';
import { navigateEncore } from '../routes/encoreAppHash';
import { applyTemplateProgressToSong } from '../repertoire/repertoireMilestones';
import {
  effectivePrimaryBackingLink,
  effectivePrimaryReferenceLink,
  mediaLinkOpenUrl,
  spotifyDataSourceTrackId,
} from '../repertoire/songMediaLinks';
import {
  fetchSpotifyPlaylistTracks,
  replaceSpotifyPlaylistTracks,
  type SpotifyPlaylistTrackRow,
} from '../spotify/spotifyApi';
import { parseSpotifyPlaylistId } from '../spotify/parseSpotifyPlaylistUrl';
import { spotifyGrantedScopesSufficientForPlaylistModify } from '../spotify/spotifyScopes';
import { readSpotifyToken } from '../spotify/pkce';
import type { EncoreSong } from '../types';
import {
  encoreDialogActionsSx,
  encoreDialogContentSx,
  encoreDialogTitleSx,
  encoreMaxWidthPage,
  encoreRadius,
  encoreShadowSurface,
} from '../theme/encoreUiTokens';
import { encorePagePaddingTop, encoreScreenPaddingX } from '../theme/encoreM3Layout';
import { EncorePageHeader } from '../ui/EncorePageHeader';
import { encoreNoAlbumArtIconSx, encoreNoAlbumArtSurfaceSx } from '../utils/encoreNoAlbumArtSurface';
import { primaryChartAttachment } from '../utils/songAttachments';
import { SpotifyBrandIcon, YouTubeBrandIcon } from './EncoreBrandIcon';
import { SongMilestoneChecklist } from './SongMilestoneChecklist';
import { encorePossessivePageTitle } from '../utils/encorePossessivePageTitle';

function songStubFromPlaylistRow(row: SpotifyPlaylistTrackRow): EncoreSong {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: row.title,
    artist: row.artist,
    spotifyTrackId: row.trackId,
    albumArtUrl: row.albumArtUrl,
    journalMarkdown: '',
    practicing: true,
    createdAt: now,
    updatedAt: now,
  };
}

export type PracticeImportSuggestRow = {
  row: SpotifyPlaylistTrackRow;
  match: EncoreSong;
  score: number;
};

export function PracticeScreen(): React.ReactElement {
  const theme = useTheme();
  const {
    songs,
    saveSong,
    repertoireExtras,
    saveRepertoireExtras,
    spotifyLinked,
    effectiveDisplayName,
  } = useEncore();
  const { withBlockingJob } = useEncoreBlockingJobs();

  const clientId =
    (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined)?.trim() ?? '';

  const practicingSongs = useMemo(
    () =>
      songs
        .filter((s) => Boolean(s.practicing))
        .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })),
    [songs],
  );

  const [playlistField, setPlaylistField] = useState('');
  useEffect(() => {
    const cur = repertoireExtras.currentlyLearningSpotifyPlaylistId ?? '';
    setPlaylistField((v) => (v.trim() === '' ? cur : v));
  }, [repertoireExtras.currentlyLearningSpotifyPlaylistId]);

  const [pullBusy, setPullBusy] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [importCandidates, setImportCandidates] = useState<SpotifyPlaylistTrackRow[] | null>(null);
  const [importSuggestions, setImportSuggestions] = useState<PracticeImportSuggestRow[] | null>(null);
  const [playlistPanelOpen, setPlaylistPanelOpen] = useState(false);
  const [journalLocalBySongId, setJournalLocalBySongId] = useState<Record<string, string>>({});

  const savedPlaylistId = repertoireExtras.currentlyLearningSpotifyPlaylistId?.trim() ?? '';
  const resolvedPlaylistId =
    savedPlaylistId || parseSpotifyPlaylistId(playlistField.trim()) || playlistField.trim();

  useEffect(() => {
    setPlaylistPanelOpen(!savedPlaylistId);
  }, [savedPlaylistId]);

  useEffect(() => {
    setJournalLocalBySongId((prev) => {
      const next = { ...prev };
      for (const s of practicingSongs) {
        if (next[s.id] === undefined) {
          next[s.id] = s.journalMarkdown ?? '';
        }
      }
      return next;
    });
  }, [practicingSongs]);

  const persistPlaylistId = useCallback(async () => {
    const raw = playlistField.trim();
    const id = raw ? parseSpotifyPlaylistId(raw) ?? raw.replace(/^\/+|\/+$/g, '') : '';
    await saveRepertoireExtras({
      currentlyLearningSpotifyPlaylistId: id || undefined,
    });
  }, [playlistField, saveRepertoireExtras]);

  const onPullFromPlaylist = useCallback(async () => {
    setSyncError(null);
    if (!clientId || !spotifyLinked) {
      setSyncError('Connect Spotify (Account menu) to read your playlist.');
      return;
    }
    const pl = resolvedPlaylistId;
    if (!pl) {
      setSyncError('Paste your “Currently learning” playlist link or id (you can sync before pressing Save).');
      return;
    }
    setPullBusy(true);
    try {
      await withBlockingJob('Pulling playlist from Spotify…', async (setProgress) => {
        const rows = await fetchSpotifyPlaylistTracks(clientId, pl);
        const fresh: SpotifyPlaylistTrackRow[] = [];
        const suggestions: PracticeImportSuggestRow[] = [];
        const now = new Date().toISOString();
        const total = rows.length;
        let i = 0;
        for (const row of rows) {
          const incoming = songStubFromPlaylistRow(row);
          const { song: match, score } = bestImportMatch(songs, incoming);
          if (score >= IMPORT_MATCH_AUTO_MIN && match) {
            const merged = mergeSongWithImport(match, incoming);
            await saveSong({ ...merged, practicing: true, updatedAt: now });
          } else if (score >= IMPORT_MATCH_SUGGEST_MIN && score < IMPORT_MATCH_AUTO_MIN && match) {
            suggestions.push({ row, match, score });
          } else {
            fresh.push(row);
          }
          i += 1;
          setProgress(total ? i / total : null);
        }
        if (suggestions.length > 0) setImportSuggestions(suggestions);
        if (fresh.length > 0) setImportCandidates(fresh);
      });
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : String(e));
    } finally {
      setPullBusy(false);
    }
  }, [clientId, spotifyLinked, resolvedPlaylistId, songs, saveSong, withBlockingJob]);

  const closePracticeImportReview = useCallback(() => {
    setImportSuggestions(null);
    setImportCandidates(null);
  }, []);

  const practiceImportReviewOpen =
    (importSuggestions?.length ?? 0) > 0 || (importCandidates?.length ?? 0) > 0;
  const hasSuggestions = (importSuggestions?.length ?? 0) > 0;
  const hasNewCandidates = (importCandidates?.length ?? 0) > 0;

  const confirmImport = useCallback(async () => {
    if (!importCandidates?.length) {
      setImportCandidates(null);
      return;
    }
    const list = [...importCandidates];
    setPullBusy(true);
    try {
      await withBlockingJob('Adding songs from playlist…', async (setProgress) => {
        let i = 0;
        for (const row of list) {
          const stub = songStubFromPlaylistRow(row);
          await saveSong(stub);
          i += 1;
          setProgress(list.length ? i / list.length : null);
        }
      });
      setImportCandidates(null);
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : String(e));
    } finally {
      setPullBusy(false);
    }
  }, [importCandidates, saveSong, withBlockingJob]);

  const mergeSuggestion = useCallback(
    async (item: PracticeImportSuggestRow) => {
      const now = new Date().toISOString();
      const incoming = songStubFromPlaylistRow(item.row);
      const merged = mergeSongWithImport(item.match, incoming);
      await saveSong({ ...merged, practicing: true, updatedAt: now });
      setImportSuggestions((cur) => {
        if (!cur) return null;
        const next = cur.filter((x) => x.row.trackId !== item.row.trackId);
        return next.length > 0 ? next : null;
      });
    },
    [saveSong],
  );

  const importSuggestionAsNew = useCallback(
    async (item: PracticeImportSuggestRow) => {
      const stub = songStubFromPlaylistRow(item.row);
      await saveSong(stub);
      setImportSuggestions((cur) => {
        if (!cur) return null;
        const next = cur.filter((x) => x.row.trackId !== item.row.trackId);
        return next.length > 0 ? next : null;
      });
    },
    [saveSong],
  );

  const onPushToPlaylist = useCallback(async () => {
    setSyncError(null);
    if (!clientId || !spotifyLinked) {
      setSyncError('Connect Spotify to update the playlist.');
      return;
    }
    const bundle = readSpotifyToken();
    if (bundle && !spotifyGrantedScopesSufficientForPlaylistModify(bundle.scope)) {
      setSyncError(
        'Reconnect Spotify (Account menu → Disconnect, then Connect) so Encore can edit playlists.',
      );
      return;
    }
    const pl = resolvedPlaylistId;
    if (!pl) {
      setSyncError('Paste or save a playlist id before pushing tracks.');
      return;
    }
    const ids = practicingSongs
      .map((s) => spotifyDataSourceTrackId(s))
      .filter((x): x is string => Boolean(x));
    if (ids.length === 0) {
      setSyncError('No practicing songs have a Spotify track id to send yet.');
      return;
    }
    setPushBusy(true);
    try {
      await withBlockingJob('Updating Spotify playlist…', () => replaceSpotifyPlaylistTracks(clientId, pl, ids));
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : String(e));
    } finally {
      setPushBusy(false);
    }
  }, [clientId, spotifyLinked, resolvedPlaylistId, practicingSongs, withBlockingJob]);

  const playlistControls = (
    <Stack spacing={1.25}>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
        Pull matches playlist tracks to your library and marks them practicing. Push replaces the entire playlist with
        your practicing songs’ <strong>primary</strong> Spotify tracks only (destructive).
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
        <TextField
          size="small"
          fullWidth
          label="Playlist URL or id"
          placeholder="https://open.spotify.com/playlist/…"
          value={playlistField}
          onChange={(e) => setPlaylistField(e.target.value)}
          disabled={pullBusy || pushBusy}
        />
        <Button variant="outlined" size="small" onClick={() => void persistPlaylistId()} sx={{ flexShrink: 0 }}>
          Save
        </Button>
      </Stack>
      <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap>
        <Button
          size="small"
          variant="contained"
          startIcon={<SyncIcon />}
          disabled={pullBusy || pushBusy || !spotifyLinked || !resolvedPlaylistId}
          onClick={() => void onPullFromPlaylist()}
        >
          {pullBusy ? 'Checking…' : 'Pull from playlist'}
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<SyncIcon />}
          disabled={pushBusy || pullBusy || !spotifyLinked || !resolvedPlaylistId}
          onClick={() => void onPushToPlaylist()}
        >
          {pushBusy ? 'Updating…' : 'Push practicing → playlist'}
        </Button>
      </Stack>
      {!clientId ? (
        <Alert severity="info">
          Set <code>VITE_SPOTIFY_CLIENT_ID</code> for Spotify actions.
        </Alert>
      ) : null}
      {syncError ? <Alert severity="error">{syncError}</Alert> : null}
    </Stack>
  );

  return (
    <Box
      sx={{
        px: encoreScreenPaddingX,
        pt: encorePagePaddingTop,
        pb: { xs: 10, md: 5 },
        ...encoreMaxWidthPage,
      }}
    >
      <EncorePageHeader
        title={encorePossessivePageTitle(effectiveDisplayName, 'practice')}
        description="Focused workspace for songs you’re actively practicing."
      />

      {practicingSongs.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 1, mb: 2, lineHeight: 1.6 }}>
          Nothing here yet. Turn on <strong>Currently practicing</strong> on a song, or pull from your playlist below.
        </Typography>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(3, minmax(0, 1fr))',
            },
            gap: 2,
            mb: 2,
          }}
        >
          {practicingSongs.map((s) => {
            const chartPrimary = primaryChartAttachment(s);
            const refLink = effectivePrimaryReferenceLink(s);
            const backLink = effectivePrimaryBackingLink(s);
            const refUrl = refLink ? mediaLinkOpenUrl(refLink) : undefined;
            const backUrl = backLink ? mediaLinkOpenUrl(backLink) : undefined;
            const chartUrl = chartPrimary ? driveFileWebUrl(chartPrimary.driveFileId) : undefined;
            const milestoneSong = applyTemplateProgressToSong(s, repertoireExtras.milestoneTemplate);
            const journalKey = s.id;
            const journalVal = journalLocalBySongId[journalKey] ?? s.journalMarkdown ?? '';

            return (
              <Card
                key={s.id}
                elevation={0}
                sx={{
                  borderRadius: encoreRadius,
                  border: 'none',
                  boxShadow: encoreShadowSurface,
                  overflow: 'hidden',
                }}
              >
                <Stack direction="row" gap={1.5} sx={{ p: 1.5, alignItems: 'flex-start' }}>
                  <Box
                    sx={{
                      width: 72,
                      height: 72,
                      borderRadius: 1,
                      overflow: 'hidden',
                      flexShrink: 0,
                      bgcolor: 'action.hover',
                    }}
                  >
                    {s.albumArtUrl ? (
                      <Box
                        component="img"
                        src={s.albumArtUrl}
                        alt=""
                        sx={{ width: 1, height: 1, objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      <Box sx={{ ...encoreNoAlbumArtSurfaceSx(theme), width: 1, height: 1, minHeight: 0 }}>
                        <MusicNoteIcon sx={{ ...encoreNoAlbumArtIconSx(theme), fontSize: 28 }} aria-hidden />
                      </Box>
                    )}
                  </Box>
                  <CardContent sx={{ flex: 1, minWidth: 0, py: 0, px: 0, '&:last-child': { pb: 0 } }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                      {s.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                      {s.artist}
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.5} useFlexGap sx={{ mt: 1 }}>
                      {refUrl ? (
                        <Chip
                          size="small"
                          component="a"
                          href={refUrl}
                          target="_blank"
                          rel="noreferrer"
                          clickable
                          icon={
                            refLink?.source === 'youtube' ? (
                              <YouTubeBrandIcon sx={{ '&&': { fontSize: 16 } }} />
                            ) : (
                              <SpotifyBrandIcon sx={{ '&&': { fontSize: 16 } }} />
                            )
                          }
                          label="Reference"
                          onClick={(e) => e.stopPropagation()}
                          variant="outlined"
                        />
                      ) : null}
                      {backUrl ? (
                        <Chip
                          size="small"
                          component="a"
                          href={backUrl}
                          target="_blank"
                          rel="noreferrer"
                          clickable
                          icon={
                            backLink?.source === 'youtube' ? (
                              <YouTubeBrandIcon sx={{ '&&': { fontSize: 16 } }} />
                            ) : (
                              <SpotifyBrandIcon sx={{ '&&': { fontSize: 16 } }} />
                            )
                          }
                          label="Backing"
                          onClick={(e) => e.stopPropagation()}
                          variant="outlined"
                        />
                      ) : null}
                      {chartUrl ? (
                        <Chip
                          size="small"
                          component="a"
                          href={chartUrl}
                          target="_blank"
                          rel="noreferrer"
                          clickable
                          label={chartPrimary?.label ?? 'Chart'}
                          onClick={(e) => e.stopPropagation()}
                          variant="outlined"
                        />
                      ) : null}
                    </Stack>
                    <Button
                      size="small"
                      variant="text"
                      endIcon={<OpenInNewIcon sx={{ fontSize: 14, opacity: 0.7 }} />}
                      onClick={() => navigateEncore({ kind: 'song', id: s.id })}
                      sx={{ mt: 0.75, p: 0, minWidth: 0, fontWeight: 600 }}
                    >
                      Full song page
                    </Button>
                  </CardContent>
                </Stack>

                <Accordion
                  disableGutters
                  elevation={0}
                  sx={{ borderTop: 1, borderColor: 'divider', '&:before': { display: 'none' } }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Practice details
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0 }}>
                    <Stack spacing={2}>
                      <SongMilestoneChecklist
                        song={milestoneSong}
                        milestoneTemplate={repertoireExtras.milestoneTemplate}
                        onChange={(next) => void saveSong(next)}
                        onOpenGlobalMilestoneSettings={() => navigateEncore({ kind: 'repertoireSettings' })}
                      />
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>
                          Practice journal
                        </Typography>
                        <TextField
                          value={journalVal}
                          onChange={(e) =>
                            setJournalLocalBySongId((m) => ({ ...m, [journalKey]: e.target.value }))
                          }
                          fullWidth
                          multiline
                          minRows={4}
                          size="small"
                          inputProps={{ 'aria-label': `Practice journal for ${s.title}` }}
                          placeholder="Notes for this song…"
                        />
                        <Button
                          size="small"
                          variant="contained"
                          sx={{ mt: 1 }}
                          onClick={() => {
                            const md = journalVal;
                            void saveSong({
                              ...s,
                              journalMarkdown: md,
                              updatedAt: new Date().toISOString(),
                            });
                          }}
                        >
                          Save journal
                        </Button>
                      </Box>
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              </Card>
            );
          })}
        </Box>
      )}

      <Accordion expanded={playlistPanelOpen} onChange={(_, exp) => setPlaylistPanelOpen(exp)} sx={{ boxShadow: 'none', border: 1, borderColor: 'divider', borderRadius: encoreRadius, '&:before': { display: 'none' }, overflow: 'hidden' }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Spotify “Currently learning” playlist
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>{playlistControls}</AccordionDetails>
      </Accordion>

      <Dialog
        open={practiceImportReviewOpen}
        onClose={closePracticeImportReview}
        fullWidth
        maxWidth="sm"
        aria-labelledby="practice-playlist-import-review-title"
      >
        <DialogTitle id="practice-playlist-import-review-title" sx={encoreDialogTitleSx}>
          Review playlist import
        </DialogTitle>
        <DialogContent sx={encoreDialogContentSx}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.55 }}>
            Exact matches were merged automatically. Use possible matches when a playlist track might already exist in
            your library under a different title. Import new tracks to add them as separate songs (marked currently
            practicing).
          </Typography>

          {hasSuggestions ? (
            <Stack spacing={2}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Possible library matches
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: -1 }}>
                Merge adds this Spotify track id to the library song. Add as new keeps a separate song row.
              </Typography>
              {importSuggestions?.map((item) => (
                <Stack key={item.row.trackId} spacing={0.75}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {item.row.title} — {item.row.artist}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Likely match: {item.match.title} — {item.match.artist} (score {(item.score * 100).toFixed(0)}%)
                  </Typography>
                  <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
                    <Button size="small" variant="contained" onClick={() => void mergeSuggestion(item)}>
                      Merge into library song
                    </Button>
                    <Button size="small" variant="outlined" onClick={() => void importSuggestionAsNew(item)}>
                      Add as new song
                    </Button>
                  </Stack>
                </Stack>
              ))}
            </Stack>
          ) : null}

          {hasSuggestions && hasNewCandidates ? <Divider sx={{ my: 3 }} /> : null}

          {hasNewCandidates ? (
            <Stack spacing={1.25}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                New tracks (not in your library)
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: -0.75 }}>
                These were not matched closely enough to an existing song. Import adds them all as practicing songs.
              </Typography>
              <Stack spacing={0.75}>
                {importCandidates?.map((r) => (
                  <Typography key={r.trackId} variant="body2">
                    {r.title} — {r.artist}
                  </Typography>
                ))}
              </Stack>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={encoreDialogActionsSx}>
          <Button onClick={closePracticeImportReview}>Close</Button>
          {hasNewCandidates ? (
            <Button variant="contained" onClick={() => void confirmImport()} disabled={pullBusy}>
              {pullBusy ? 'Importing…' : `Import ${importCandidates?.length ?? 0} new`}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
