import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import EditIcon from '@mui/icons-material/Edit';
import EventNoteIcon from '@mui/icons-material/EventNote';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EncoreAppRoute } from '../routes/encoreAppHash';
import { navigateEncore } from '../routes/encoreAppHash';
import { ensureSpotifyAccessToken } from '../spotify/pkce';
import { fetchSpotifyTrack, searchTracks, type SpotifySearchTrack } from '../spotify/spotifyApi';
import { parseSpotifyTrackId } from '../spotify/parseSpotifyTrackUrl';
import type { EncorePerformance, EncoreSong } from '../types';
import { parseYoutubeVideoId } from '../youtube/parseYoutubeVideoUrl';
import { encoreNoAlbumArtIconSx, encoreNoAlbumArtSurfaceSx } from '../utils/encoreNoAlbumArtSurface';
import { useEncore } from '../context/EncoreContext';
import {
  encoreFrostedSurfaceSx,
  encoreHairline,
  encoreMaxWidthPage,
  encoreRadius,
  encoreShadowLift,
} from '../theme/encoreUiTokens';
import { encorePagePaddingTop, encoreScreenPaddingX } from '../theme/encoreM3Layout';
import { driveUploadFileResumable } from '../drive/driveFetch';
import { ensureEncoreDriveLayout } from '../drive/bootstrapFolders';
import { driveFileWebUrl } from '../drive/driveWebUrls';
import { ENCORE_DRIVE_CHART_MIME_TYPES } from '../drive/googlePicker';
import { MarkdownPreview } from './MarkdownPreview';
import { PerformanceEditorDialog } from './PerformanceEditorDialog';
import { PerformanceVideoThumb } from './PerformanceVideoThumb';
import { SongMilestoneChecklist } from './SongMilestoneChecklist';
import { DriveFilePickerDialog } from './DriveFilePickerDialog';
import { SpotifyBrandIcon, YouTubeBrandIcon } from './EncoreBrandIcon';
import { encoreGeniusSearchUrl, encoreUltimateGuitarSearchUrl, encoreYouTubeSearchUrl } from './encoreSongResourceLinks';
import { performanceVideoOpenUrl } from '../utils/performanceVideoUrl';
import { addSongAttachment, effectiveSongAttachments, songWithSyncedLegacyDriveIds } from '../utils/songAttachments';
import { applyTemplateProgressToSong } from '../repertoire/repertoireMilestones';
import { ENCORE_PERFORMANCE_KEY_OPTIONS } from '../repertoire/performanceKeys';
import { collectAllSongTags, normalizeSongTags } from '../repertoire/songTags';
import { InlineChipSelect } from '../ui/InlineEditChip';
import { InlineSongTagsCell } from '../ui/InlineSongTagsCell';
import { EncoreSpotifyConnectionChip } from '../ui/EncoreSpotifyConnectionChip';

function newSong(): EncoreSong {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: '',
    artist: '',
    journalMarkdown: '',
    createdAt: now,
    updatedAt: now,
  };
}

function trackLabel(t: SpotifySearchTrack): string {
  const artists = t.artists?.map((a) => a.name).join(', ') ?? '';
  return `${t.name} — ${artists}`;
}

/** Stable snapshot for debounced autosave (avoids loops from updatedAt-only writes). */
function songAutosaveSignature(s: EncoreSong): string {
  return JSON.stringify({
    id: s.id,
    title: s.title,
    artist: s.artist,
    journalMarkdown: s.journalMarkdown,
    spotifyTrackId: s.spotifyTrackId,
    youtubeVideoId: s.youtubeVideoId,
    performanceKey: s.performanceKey,
    practicing: s.practicing,
    tags: s.tags,
    milestoneProgress: s.milestoneProgress,
    songOnlyMilestones: s.songOnlyMilestones,
    attachments: s.attachments,
    albumArtUrl: s.albumArtUrl,
  });
}

export function SongPage(props: { route: Extract<EncoreAppRoute, { kind: 'song' } | { kind: 'songNew' }> }): React.ReactElement {
  const { route } = props;
  const theme = useTheme();
  const {
    songs,
    libraryReady,
    saveSong,
    deleteSong,
    savePerformance,
    performances,
    repertoireExtras,
    googleAccessToken,
    spotifyLinked,
  } = useEncore();
  const clientId = (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined)?.trim() ?? '';

  const [loadState, setLoadState] = useState<'pending' | 'ok' | 'missing'>(() =>
    route.kind === 'songNew' ? 'ok' : 'pending',
  );
  const [draft, setDraft] = useState<EncoreSong | null>(() => (route.kind === 'songNew' ? newSong() : null));
  const [committedJournal, setCommittedJournal] = useState('');
  const [journalLocal, setJournalLocal] = useState('');
  const [journalSaving, setJournalSaving] = useState(false);
  const [songTab, setSongTab] = useState(0);
  const [spotifyQuery, setSpotifyQuery] = useState('');
  const [spotifyOptions, setSpotifyOptions] = useState<SpotifySearchTrack[]>([]);
  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const [spotifyError, setSpotifyError] = useState<string | null>(null);
  const [spotifyMetaLoading, setSpotifyMetaLoading] = useState(false);
  const [spotifyMetaMessage, setSpotifyMetaMessage] = useState<string | null>(null);
  const [showSpotifySearch, setShowSpotifySearch] = useState(false);
  const [perfOpen, setPerfOpen] = useState(false);
  const [perfEditing, setPerfEditing] = useState<EncorePerformance | null>(null);
  const [chartsFolderId, setChartsFolderId] = useState<string | null>(null);
  const [chartPickerOpen, setChartPickerOpen] = useState(false);
  const [driveAttachMsg, setDriveAttachMsg] = useState<string | null>(null);
  const [driveUploading, setDriveUploading] = useState(false);

  const lastAutosaveSigRef = useRef<string>('');

  const venueOptions = useMemo(() => {
    const s = new Set<string>();
    for (const v of repertoireExtras.venueCatalog) {
      const t = v.trim();
      if (t) s.add(t);
    }
    for (const p of performances) {
      const t = p.venueTag.trim();
      if (t) s.add(t);
    }
    return [...s];
  }, [repertoireExtras.venueCatalog, performances]);

  const isNew = route.kind === 'songNew';

  const songPerformances = useMemo(() => {
    if (!draft || isNew) return [];
    return performances.filter((p) => p.songId === draft.id).sort((a, b) => b.date.localeCompare(a.date));
  }, [draft, isNew, performances]);

  const milestoneSong = useMemo(
    () => (draft ? { ...draft, journalMarkdown: committedJournal } : null),
    [draft, committedJournal],
  );

  useEffect(() => {
    if (!googleAccessToken) {
      setChartsFolderId(null);
      return;
    }
    void (async () => {
      try {
        const layout = await ensureEncoreDriveLayout(googleAccessToken);
        setChartsFolderId(layout.sheetMusicFolderId);
      } catch {
        setChartsFolderId(null);
      }
    })();
  }, [googleAccessToken]);

  useEffect(() => {
    setSpotifyError(null);
    setSpotifyMetaMessage(null);
    setShowSpotifySearch(false);
    if (route.kind === 'songNew') {
      const s = newSong();
      setDraft(s);
      setCommittedJournal('');
      setJournalLocal('');
      setSpotifyQuery('');
      setSongTab(0);
      lastAutosaveSigRef.current = songAutosaveSignature(s);
      setLoadState('ok');
      return;
    }
    if (!libraryReady) {
      setLoadState('pending');
      return;
    }
    const s = songs.find((x) => x.id === route.id);
    if (s) {
      setDraft({ ...s });
      setCommittedJournal(s.journalMarkdown);
      setJournalLocal(s.journalMarkdown);
      setSpotifyQuery(`${s.title} ${s.artist}`.trim());
      setSongTab(0);
      lastAutosaveSigRef.current = songAutosaveSignature({ ...s, journalMarkdown: s.journalMarkdown });
      setLoadState('ok');
    } else {
      setDraft(null);
      setLoadState('missing');
    }
  }, [route, songs, libraryReady]);

  const spotifySearchListQuery = useMemo(
    () => (isNew ? `${draft?.title ?? ''} ${draft?.artist ?? ''}`.trim() : spotifyQuery.trim()),
    [isNew, draft?.title, draft?.artist, spotifyQuery],
  );

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!spotifyLinked || !clientId) {
      setSpotifyOptions([]);
      return;
    }
    const q = spotifySearchListQuery;
    if (q.length < 2) {
      setSpotifyOptions([]);
      return;
    }
    searchTimer.current = setTimeout(() => {
      void (async () => {
        setSpotifyLoading(true);
        setSpotifyError(null);
        try {
          const token = await ensureSpotifyAccessToken(clientId);
          if (!token) {
            setSpotifyOptions([]);
            return;
          }
          const tracks = await searchTracks(token, q, 8);
          setSpotifyOptions(tracks);
        } catch (e) {
          setSpotifyError(e instanceof Error ? e.message : String(e));
          setSpotifyOptions([]);
        } finally {
          setSpotifyLoading(false);
        }
      })();
    }, 400);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [spotifySearchListQuery, spotifyLinked, clientId]);

  const bootstrappedSearchRef = useRef<string | null>(null);
  useEffect(() => {
    if (isNew || !spotifyLinked || !clientId || route.kind !== 'song') return;
    const s = songs.find((x) => x.id === route.id);
    if (!s) return;
    const seed = `${s.title} ${s.artist}`.trim();
    if (seed.length < 3) return;
    if (bootstrappedSearchRef.current === `${s.id}:${seed}`) return;
    bootstrappedSearchRef.current = `${s.id}:${seed}`;
    void (async () => {
      setSpotifyLoading(true);
      setSpotifyError(null);
      try {
        const token = await ensureSpotifyAccessToken(clientId);
        if (!token) return;
        const tracks = await searchTracks(token, seed, 8);
        setSpotifyOptions(tracks);
      } catch {
        /* non-fatal */
      } finally {
        setSpotifyLoading(false);
      }
    })();
  }, [route, songs, isNew, spotifyLinked, clientId]);

  const persistSongNow = useCallback(
    async (raw: EncoreSong) => {
      const now = new Date().toISOString();
      const withMilestones = applyTemplateProgressToSong(raw, repertoireExtras.milestoneTemplate);
      const cleanedTags = normalizeSongTags(withMilestones.tags);
      const normalized = songWithSyncedLegacyDriveIds({
        ...withMilestones,
        title: withMilestones.title.trim() || 'Untitled',
        artist: withMilestones.artist.trim() || 'Unknown artist',
        tags: cleanedTags.length > 0 ? cleanedTags : undefined,
        updatedAt: now,
        createdAt: withMilestones.createdAt || now,
      });
      await saveSong(normalized);
      if (isNew) {
        navigateEncore({ kind: 'song', id: normalized.id });
      }
      lastAutosaveSigRef.current = songAutosaveSignature(normalized);
    },
    [isNew, repertoireExtras.milestoneTemplate, saveSong],
  );

  useEffect(() => {
    if (!draft || loadState !== 'ok') return;
    if (isNew && !draft.title.trim()) return;
    const payload = { ...draft, journalMarkdown: committedJournal };
    const sig = songAutosaveSignature(payload);
    if (sig === lastAutosaveSigRef.current) return;
    const t = setTimeout(() => {
      void (async () => {
        try {
          await persistSongNow(payload);
        } catch {
          /* ignore */
        }
      })();
    }, 550);
    return () => clearTimeout(t);
  }, [draft, committedJournal, loadState, isNew, persistSongNow]);

  const applySpotifyTrack = useCallback((t: SpotifySearchTrack) => {
    setDraft((d) => {
      if (!d) return d;
      return {
        ...d,
        spotifyTrackId: t.id,
        title: t.name?.trim() || d.title,
        artist: t.artists?.map((a) => a.name).join(', ').trim() || d.artist,
        albumArtUrl: t.album?.images?.[0]?.url,
        updatedAt: new Date().toISOString(),
      };
    });
    setSpotifyQuery(trackLabel(t));
    setShowSpotifySearch(false);
  }, []);

  const resolveSpotifyPaste = useCallback(
    async (rawOverride?: string) => {
      if (!draft || !clientId || !spotifyLinked) return;
      const raw = (rawOverride ?? spotifyQuery).trim();
      const id = parseSpotifyTrackId(raw);
      if (!id) return;
      setSpotifyError(null);
      setSpotifyLoading(true);
      try {
        const token = await ensureSpotifyAccessToken(clientId);
        if (!token) {
          setSpotifyError('Connect Spotify first (Account menu).');
          return;
        }
        const t = await fetchSpotifyTrack(token, id);
        applySpotifyTrack(t);
      } catch (e) {
        setSpotifyError(e instanceof Error ? e.message : String(e));
      } finally {
        setSpotifyLoading(false);
      }
    },
    [applySpotifyTrack, clientId, draft, spotifyLinked, spotifyQuery],
  );

  const fillFromSpotify = useCallback(async () => {
    if (!draft?.spotifyTrackId || !clientId || !spotifyLinked) return;
    setSpotifyMetaLoading(true);
    setSpotifyMetaMessage(null);
    setSpotifyError(null);
    try {
      const token = await ensureSpotifyAccessToken(clientId);
      if (!token) {
        setSpotifyMetaMessage('Connect Spotify first.');
        return;
      }
      const track = await fetchSpotifyTrack(token, draft.spotifyTrackId);
      setDraft((d) => {
        if (!d) return d;
        return {
          ...d,
          title: track.name?.trim() || d.title,
          artist: track.artists?.map((a) => a.name).join(', ').trim() || d.artist,
          albumArtUrl: track.album?.images?.[0]?.url ?? d.albumArtUrl,
          updatedAt: new Date().toISOString(),
        };
      });
      setSpotifyMetaMessage('Updated from Spotify: title, artist, and artwork.');
    } catch (e) {
      setSpotifyError(e instanceof Error ? e.message : String(e));
    } finally {
      setSpotifyMetaLoading(false);
    }
  }, [clientId, draft?.spotifyTrackId, spotifyLinked]);

  const handleDriveChartUpload = async (file: File | undefined) => {
    if (!file) return;
    if (!googleAccessToken) {
      setDriveAttachMsg('Sign in to Google to upload files to Drive.');
      return;
    }
    if (!chartsFolderId) {
      setDriveAttachMsg('Drive folders are not ready yet. Try again after the first backup completes.');
      return;
    }
    setDriveUploading(true);
    setDriveAttachMsg(null);
    try {
      const created = await driveUploadFileResumable(googleAccessToken, file, [chartsFolderId]);
      setDraft((d) => (d ? addSongAttachment(d, { kind: 'chart', driveFileId: created.id, label: file.name }) : d));
      setDriveAttachMsg('Chart linked.');
    } catch (e) {
      setDriveAttachMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setDriveUploading(false);
    }
  };

  const handleSaveJournal = async () => {
    if (!draft) return;
    setJournalSaving(true);
    try {
      const next = { ...draft, journalMarkdown: journalLocal, updatedAt: new Date().toISOString() };
      setCommittedJournal(journalLocal);
      await persistSongNow(next);
      setDraft(next);
    } finally {
      setJournalSaving(false);
    }
  };

  const onMilestoneSongChange = useCallback(
    (next: EncoreSong) => {
      setDraft(next);
      void (async () => {
        try {
          await persistSongNow(next);
        } catch {
          /* ignore */
        }
      })();
    },
    [persistSongNow],
  );

  const handleBack = () => {
    navigateEncore({ kind: 'library' });
  };

  const handleDelete = async () => {
    if (!draft || isNew) return;
    if (!window.confirm(`Delete “${draft.title}” from your library?`)) return;
    await deleteSong(draft.id);
    navigateEncore({ kind: 'library' });
  };

  const tagSuggestions = collectAllSongTags(songs);

  if (loadState === 'pending') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }} aria-busy="true" aria-label="Loading song">
        <CircularProgress />
      </Box>
    );
  }

  if (route.kind === 'song' && loadState === 'missing') {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mb: 2 }}>
          Back to library
        </Button>
        <Typography variant="h6" gutterBottom>
          Song not found
        </Typography>
        <Typography color="text.secondary">This id is not in your library. It may have been removed, or the link is wrong.</Typography>
      </Container>
    );
  }

  if (!draft || !milestoneSong) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const ytId = draft.youtubeVideoId ? parseYoutubeVideoId(draft.youtubeVideoId) : null;
  const resourceTitle = draft.title.trim() || 'song';
  const resourceArtist = draft.artist.trim() || 'artist';
  const chartAttachments = effectiveSongAttachments(draft).filter((a) => a.kind === 'chart');

  return (
    <>
      <Container
        maxWidth={false}
        sx={{ px: encoreScreenPaddingX, pt: encorePagePaddingTop, pb: { xs: 10, sm: 6 }, ...encoreMaxWidthPage }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <IconButton aria-label="Back to library" onClick={handleBack} edge="start" size="small" sx={{ ml: -0.5 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="overline" color="primary" sx={{ fontWeight: 700, letterSpacing: '0.18em', lineHeight: 1.2 }}>
            {isNew ? 'New song' : 'Song'}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 3, sm: 4 },
            alignItems: { xs: 'center', sm: 'flex-start' },
            mb: 3,
          }}
        >
          {draft.albumArtUrl ? (
            <Box
              component="img"
              src={draft.albumArtUrl}
              alt=""
              sx={{
                width: { xs: 220, sm: 240 },
                height: { xs: 220, sm: 240 },
                objectFit: 'cover',
                borderRadius: encoreRadius,
                boxShadow: encoreShadowLift,
                flexShrink: 0,
              }}
            />
          ) : (
            <Box
              sx={{
                width: { xs: 220, sm: 240 },
                height: { xs: 220, sm: 240 },
                borderRadius: encoreRadius,
                boxShadow: encoreShadowLift,
                flexShrink: 0,
                ...encoreNoAlbumArtSurfaceSx(theme),
              }}
            >
              <MusicNoteIcon sx={{ ...encoreNoAlbumArtIconSx(theme), fontSize: 60 }} aria-hidden />
            </Box>
          )}
          <Box sx={{ flex: 1, minWidth: 0, width: 1, alignSelf: { xs: 'stretch', sm: 'flex-start' } }}>
            {isNew && spotifyLinked && clientId ? (
              <Autocomplete
                freeSolo
                sx={{ mb: 2 }}
                options={spotifyOptions}
                loading={spotifyLoading}
                getOptionLabel={(o) => (typeof o === 'string' ? o : trackLabel(o))}
                isOptionEqualToValue={(a, b) => typeof a !== 'string' && typeof b !== 'string' && a.id === b.id}
                value={null}
                inputValue={draft.title}
                onInputChange={(_, v, reason) => {
                  if (reason === 'reset') return;
                  setDraft((d) => (d ? { ...d, title: v } : d));
                }}
                onChange={(_, v) => {
                  if (v && typeof v === 'object' && 'id' in v) applySpotifyTrack(v as SpotifySearchTrack);
                }}
                filterOptions={(x) => x}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Title"
                    required
                    variant="standard"
                    helperText="Search Spotify as you type, pick a match, or type a title manually. Paste a track link to import it."
                    onBlur={() => void resolveSpotifyPaste(draft.title)}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <SpotifyBrandIcon sx={{ mr: 1, opacity: 0.85, fontSize: 22, alignSelf: 'center' }} />
                          {params.InputProps.startAdornment}
                        </>
                      ),
                      endAdornment: (
                        <>
                          {spotifyLoading ? <CircularProgress color="inherit" size={18} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            ) : (
              <TextField
                label="Title"
                value={draft.title}
                onChange={(e) => setDraft((d) => (d ? { ...d, title: e.target.value } : d))}
                fullWidth
                required
                variant="standard"
                sx={{ mb: 2 }}
                InputProps={{ sx: { fontSize: { xs: '1.5rem', sm: '1.75rem' }, fontWeight: 700, letterSpacing: '-0.02em' } }}
              />
            )}
            <TextField
              label="Artist"
              value={draft.artist}
              onChange={(e) => setDraft((d) => (d ? { ...d, artist: e.target.value } : d))}
              fullWidth
              variant="standard"
              sx={{ mb: 2 }}
            />

            <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center" useFlexGap sx={{ mb: 1.5 }}>
              <InlineSongTagsCell
                tags={draft.tags ?? []}
                suggestions={tagSuggestions}
                onCommit={(next) =>
                  setDraft((d) => (d ? { ...d, tags: next.length > 0 ? next : undefined } : d))
                }
              />
              <InlineChipSelect<string>
                value={draft.performanceKey ?? null}
                options={ENCORE_PERFORMANCE_KEY_OPTIONS}
                freeSolo
                clearable
                placeholder="Key"
                onChange={(v) =>
                  setDraft((d) => (d ? { ...d, performanceKey: v ?? undefined } : d))
                }
              />
              <FormControlLabel
                sx={{ alignItems: 'center', m: 0 }}
                control={
                  <Switch
                    checked={Boolean(draft.practicing)}
                    onChange={(e) => {
                      const ts = new Date().toISOString();
                      setDraft((d) => (d ? { ...d, practicing: e.target.checked, updatedAt: ts } : d));
                    }}
                    inputProps={{ 'aria-label': 'Working on this song' }}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    In rotation
                  </Typography>
                }
              />
            </Stack>

            {!clientId ? (
              <Alert severity="info" sx={{ mb: 1 }}>
                Set <code>VITE_SPOTIFY_CLIENT_ID</code> to link Spotify tracks.
              </Alert>
            ) : null}
            {clientId && !spotifyLinked ? (
              <EncoreSpotifyConnectionChip sx={{ mb: 1.5 }} description="Connect Spotify to search tracks and refresh metadata." />
            ) : null}
            {spotifyError ? <Alert severity="error" sx={{ mb: 1 }}>{spotifyError}</Alert> : null}
            {spotifyMetaMessage ? <Alert severity="success" sx={{ mb: 1 }}>{spotifyMetaMessage}</Alert> : null}

            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.06em', display: 'block', mb: 0.75 }}>
              Spotify & YouTube
            </Typography>
            <Stack spacing={1.25} sx={{ mb: 2 }}>
              {spotifyLinked && clientId && draft.spotifyTrackId && !showSpotifySearch ? (
                <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
                  <Chip
                    size="small"
                    icon={<SpotifyBrandIcon />}
                    label="Open in Spotify"
                    component="a"
                    href={`https://open.spotify.com/track/${encodeURIComponent(draft.spotifyTrackId)}`}
                    clickable
                    target="_blank"
                    rel="noreferrer"
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={spotifyMetaLoading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
                    disabled={spotifyMetaLoading}
                    onClick={() => void fillFromSpotify()}
                  >
                    Refresh from Spotify
                  </Button>
                  <Button size="small" variant="text" startIcon={<SwapHorizIcon />} onClick={() => setShowSpotifySearch(true)}>
                    Change track
                  </Button>
                </Stack>
              ) : null}
              {spotifyLinked && clientId && (showSpotifySearch || !draft.spotifyTrackId) && !isNew ? (
                <Autocomplete
                  options={spotifyOptions}
                  loading={spotifyLoading}
                  getOptionLabel={(o) => trackLabel(o)}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  value={null}
                  inputValue={spotifyQuery}
                  onInputChange={(_, v) => setSpotifyQuery(v)}
                  onChange={(_, v) => {
                    if (v && typeof v === 'object' && 'id' in v) applySpotifyTrack(v as SpotifySearchTrack);
                  }}
                  filterOptions={(x) => x}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      label={draft.spotifyTrackId ? 'Search Spotify for a replacement' : 'Find on Spotify'}
                      placeholder="Title, artist, or paste a track URL"
                      onBlur={() => void resolveSpotifyPaste()}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <SpotifyBrandIcon sx={{ mr: 0.75, fontSize: 20, alignSelf: 'center' }} />
                            {params.InputProps.startAdornment}
                          </>
                        ),
                        endAdornment: (
                          <>
                            {spotifyLoading ? <CircularProgress color="inherit" size={18} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              ) : null}
              {spotifyLinked && clientId && !draft.spotifyTrackId && !isNew ? (
                <Typography variant="caption" color="text.secondary">
                  No Spotify track linked — use the search field above.
                </Typography>
              ) : null}

              <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                <YouTubeBrandIcon sx={{ fontSize: 20, opacity: 0.9 }} />
                <TextField
                  label="YouTube URL or id"
                  value={draft.youtubeVideoId ?? ''}
                  onChange={(e) =>
                    setDraft((d) => (d ? { ...d, youtubeVideoId: e.target.value.trim() || undefined } : d))
                  }
                  onBlur={() => {
                    const raw = draft.youtubeVideoId ?? '';
                    const parsed = parseYoutubeVideoId(raw);
                    if (parsed && parsed !== raw.trim()) {
                      setDraft((d) => (d ? { ...d, youtubeVideoId: parsed } : d));
                    }
                  }}
                  size="small"
                  sx={{ flex: 1, minWidth: 200 }}
                  placeholder="Watch link or video id"
                  helperText={ytId ? `youtube.com/watch?v=${encodeURIComponent(ytId)}` : undefined}
                />
                {ytId ? (
                  <Chip
                    size="small"
                    icon={<YouTubeBrandIcon />}
                    label="Open"
                    component="a"
                    href={`https://www.youtube.com/watch?v=${encodeURIComponent(ytId)}`}
                    clickable
                    target="_blank"
                    rel="noreferrer"
                  />
                ) : null}
              </Stack>
            </Stack>

            {draft.title.trim().length > 0 ? (
              <Stack direction="row" flexWrap="wrap" gap={0.75} useFlexGap sx={{ mb: 2 }}>
                <Button
                  size="small"
                  variant="outlined"
                  endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                  href={encoreUltimateGuitarSearchUrl(resourceTitle, resourceArtist)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ultimate Guitar
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                  href={encoreGeniusSearchUrl(resourceTitle, resourceArtist)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Genius
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                  href={encoreYouTubeSearchUrl(resourceTitle, resourceArtist)}
                  target="_blank"
                  rel="noreferrer"
                >
                  YouTube search
                </Button>
              </Stack>
            ) : null}

            <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center" useFlexGap sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.06em' }}>
                Charts
              </Typography>
              {chartAttachments.map((a) => (
                <Chip
                  key={a.driveFileId}
                  size="small"
                  label={a.label ?? a.driveFileId.slice(0, 8)}
                  component="a"
                  href={driveFileWebUrl(a.driveFileId)}
                  target="_blank"
                  rel="noreferrer"
                  clickable
                  variant="outlined"
                />
              ))}
              <Button
                size="small"
                variant="text"
                disabled={!googleAccessToken || driveUploading}
                component="label"
              >
                Upload
                <input
                  type="file"
                  hidden
                  accept=".pdf,.xml,.musicxml,.mxl,image/*"
                  onChange={(e) => void handleDriveChartUpload(e.target.files?.[0])}
                />
              </Button>
              <Button size="small" variant="text" onClick={() => setChartPickerOpen(true)} disabled={!googleAccessToken}>
                Pick from Drive
              </Button>
            </Stack>
            {driveAttachMsg ? (
              <Typography variant="caption" color="text.secondary" display="block">
                {driveAttachMsg}
              </Typography>
            ) : null}
          </Box>
        </Box>

        {!isNew ? (
          <Tabs
            value={songTab}
            onChange={(_, v) => setSongTab(v)}
            sx={{ borderBottom: 1, borderColor: encoreHairline, mb: 2.5, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 } }}
          >
            <Tab label="Practice" id="encore-song-tab-practice" aria-controls="encore-song-panel-practice" />
            <Tab label="Performances" id="encore-song-tab-performances" aria-controls="encore-song-panel-performances" />
          </Tabs>
        ) : null}

        <Box
          role="tabpanel"
          id={!isNew ? (songTab === 0 ? 'encore-song-panel-practice' : 'encore-song-panel-performances') : undefined}
          hidden={!isNew && songTab !== 0}
          sx={{ display: !isNew && songTab !== 0 ? 'none' : 'block' }}
        >
          <Stack spacing={3}>
            <SongMilestoneChecklist
              song={milestoneSong}
              milestoneTemplate={repertoireExtras.milestoneTemplate}
              onChange={onMilestoneSongChange}
              onOpenGlobalMilestoneSettings={() => navigateEncore({ kind: 'repertoireSettings' })}
            />

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Practice journal
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                Markdown. Saves only when you click <strong>Save notes</strong>.
              </Typography>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
                <TextField
                  value={journalLocal}
                  onChange={(e) => setJournalLocal(e.target.value)}
                  fullWidth
                  multiline
                  minRows={8}
                  inputProps={{ 'aria-label': 'Practice journal markdown' }}
                  sx={{ flex: 1 }}
                />
                <Box
                  sx={{
                    flex: 1,
                    width: 1,
                    minHeight: 200,
                    p: 2,
                    borderRadius: 2,
                    border: 1,
                    borderColor: 'divider',
                    bgcolor: (t) => alpha(t.palette.primary.main, 0.03),
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.06em' }}>
                    Preview
                  </Typography>
                  <MarkdownPreview markdown={journalLocal} />
                </Box>
              </Stack>
              <Stack direction="row" alignItems="center" gap={2} sx={{ mt: 2 }}>
                <Button variant="contained" size="small" onClick={() => void handleSaveJournal()} disabled={journalSaving}>
                  {journalSaving ? 'Saving…' : 'Save notes'}
                </Button>
                {journalLocal !== committedJournal ? (
                  <Typography variant="caption" color="warning.main">
                    Unsaved journal changes
                  </Typography>
                ) : null}
              </Stack>
            </Box>
          </Stack>
        </Box>

        {!isNew ? (
          <Box
            role="tabpanel"
            id="encore-song-panel-performances"
            hidden={songTab !== 1}
            sx={{ display: songTab === 1 ? 'block' : 'none', pt: 1 }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" gap={1}>
                {songPerformances.length > 0 ? (
                  <Chip size="small" label={`${songPerformances.length} logged`} variant="outlined" sx={{ fontWeight: 600 }} />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No performances yet for this song.
                  </Typography>
                )}
              </Stack>
              <Button
                size="small"
                variant="contained"
                startIcon={<EventNoteIcon />}
                onClick={() => {
                  setPerfEditing(null);
                  setPerfOpen(true);
                }}
              >
                Add performance
              </Button>
            </Stack>
            {songPerformances.length > 0 ? (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                  gap: 2,
                }}
              >
                {songPerformances.map((p) => {
                  const url = performanceVideoOpenUrl(p);
                  return (
                    <Box
                      key={p.id}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: encoreRadius,
                        p: 1.5,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        minHeight: 120,
                        overflow: 'hidden',
                        transition: (t) => t.transitions.create(['box-shadow', 'border-color'], { duration: 200 }),
                        '&:hover': {
                          boxShadow: '0 4px 16px rgba(76, 29, 149, 0.06)',
                          borderColor: alpha(theme.palette.primary.main, 0.25),
                        },
                      }}
                    >
                      <PerformanceVideoThumb
                        performance={p}
                        fluid
                        alt={url ? `Video thumbnail for performance on ${p.date}` : `Performance on ${p.date}`}
                        googleAccessToken={googleAccessToken}
                      />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: 700, letterSpacing: '0.08em', fontVariantNumeric: 'tabular-nums' }}
                      >
                        {p.date}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {p.venueTag?.trim() || 'Venue'}
                      </Typography>
                      {p.notes ? (
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45 }}>
                          {p.notes.length > 140 ? `${p.notes.slice(0, 140)}…` : p.notes}
                        </Typography>
                      ) : null}
                      <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 'auto', pt: 0.5 }}>
                        {url ? (
                          <Button
                            size="small"
                            variant="outlined"
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            startIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
                          >
                            Open
                          </Button>
                        ) : null}
                        <Button
                          size="small"
                          variant="text"
                          startIcon={<EditIcon sx={{ fontSize: 16 }} />}
                          onClick={() => {
                            setPerfEditing(p);
                            setPerfOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                      </Stack>
                    </Box>
                  );
                })}
              </Box>
            ) : null}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Save this song (add a title — it saves automatically) to log performances.
          </Typography>
        )}
      </Container>

      <Box
        sx={{
          ...encoreFrostedSurfaceSx,
          position: 'sticky',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 8,
          borderTop: '1px solid',
          borderColor: 'divider',
          px: encoreScreenPaddingX,
          py: 2,
          display: 'flex',
          gap: 1.5,
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
      >
        {!isNew && (
          <Button color="error" onClick={() => void handleDelete()} sx={{ mr: 'auto' }}>
            Delete
          </Button>
        )}
        <Button onClick={handleBack}>Back</Button>
      </Box>

      <DriveFilePickerDialog
        open={chartPickerOpen}
        title="Pick a chart"
        folderId={chartsFolderId}
        googleAccessToken={googleAccessToken}
        pickerMimeTypes={ENCORE_DRIVE_CHART_MIME_TYPES}
        onClose={() => setChartPickerOpen(false)}
        onPick={(id, name) => {
          setDraft((d) => (d ? addSongAttachment(d, { kind: 'chart', driveFileId: id, label: name }) : d));
          setChartPickerOpen(false);
        }}
      />

      {!isNew && (
        <PerformanceEditorDialog
          open={perfOpen}
          performance={perfEditing}
          songId={draft.id}
          googleAccessToken={googleAccessToken}
          venueOptions={venueOptions}
          onClose={() => {
            setPerfOpen(false);
            setPerfEditing(null);
          }}
          onSave={async (p: EncorePerformance) => {
            await savePerformance(p);
          }}
        />
      )}
    </>
  );
}
