import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import VideocamIcon from '@mui/icons-material/Videocam';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import JSZip from 'jszip';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EncoreAppRoute } from '../routes/encoreAppHash';
import { navigateEncore } from '../routes/encoreAppHash';
import { ensureSpotifyAccessToken } from '../spotify/pkce';
import { fetchSpotifyGenresForTrack, fetchSpotifyTrack, searchTracks, type SpotifySearchTrack } from '../spotify/spotifyApi';
import { parseSpotifyTrackId } from '../spotify/parseSpotifyTrackUrl';
import type { EncorePerformance, EncoreSong } from '../types';
import { parseYoutubeVideoId } from '../youtube/parseYoutubeVideoUrl';
import { encoreNoAlbumArtIconSx, encoreNoAlbumArtSurfaceSx } from '../utils/encoreNoAlbumArtSurface';
import { useEncore } from '../context/EncoreContext';
import { encorePagePaddingTop, encoreScreenPaddingX, encoreSurfaceSectionSx } from '../theme/encoreM3Layout';
import { driveUploadFileResumable } from '../drive/driveFetch';
import { ensureEncoreDriveLayout } from '../drive/bootstrapFolders';
import { driveFileWebUrl } from '../drive/driveWebUrls';
import {
  ENCORE_DRIVE_CHART_MIME_TYPES,
  ENCORE_DRIVE_RECORDING_MIME_TYPES,
  openEncoreGoogleDrivePicker,
} from '../drive/googlePicker';
import { parseDriveFileIdFromUrlOrId } from '../drive/parseDriveFileUrl';
import { MarkdownPreview } from './MarkdownPreview';
import { PerformanceEditorDialog } from './PerformanceEditorDialog';
import { PerformanceVideoThumb } from './PerformanceVideoThumb';
import { DriveFilePickerDialog } from './DriveFilePickerDialog';
import { GoogleBrandIcon, SpotifyBrandIcon, YouTubeBrandIcon } from './EncoreBrandIcon';
import { encoreGeniusSearchUrl, encoreUltimateGuitarSearchUrl, encoreYouTubeSearchUrl } from './encoreSongResourceLinks';
import { performanceVideoOpenUrl } from '../utils/performanceVideoUrl';
import { addSongAttachment, effectiveSongAttachments, songWithSyncedLegacyDriveIds } from '../utils/songAttachments';
import { parseMidiKeyBpm } from '../utils/parseMidiKeyBpm';
import { parseMusicXmlKeyBpm } from '../utils/parseMusicXmlKeyBpm';

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
    googleAccessToken,
    spotifyLinked,
    connectSpotify,
  } = useEncore();
  const clientId = (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined)?.trim() ?? '';

  const [loadState, setLoadState] = useState<'pending' | 'ok' | 'missing'>(() =>
    route.kind === 'songNew' ? 'ok' : 'pending',
  );
  const [draft, setDraft] = useState<EncoreSong | null>(() => (route.kind === 'songNew' ? newSong() : null));
  const [journalTab, setJournalTab] = useState<'edit' | 'preview'>('edit');
  const [saving, setSaving] = useState(false);
  const [spotifyQuery, setSpotifyQuery] = useState('');
  const [spotifyOptions, setSpotifyOptions] = useState<SpotifySearchTrack[]>([]);
  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const [spotifyError, setSpotifyError] = useState<string | null>(null);
  const [spotifyMetaLoading, setSpotifyMetaLoading] = useState(false);
  const [spotifyMetaMessage, setSpotifyMetaMessage] = useState<string | null>(null);
  const [perfOpen, setPerfOpen] = useState(false);
  const [perfEditing, setPerfEditing] = useState<EncorePerformance | null>(null);
  const [showEmbeds, setShowEmbeds] = useState(false);
  const [driveFolders, setDriveFolders] = useState<{ charts: string | null; recordings: string | null }>({
    charts: null,
    recordings: null,
  });
  const [chartPickerOpen, setChartPickerOpen] = useState(false);
  const [backingPickerOpen, setBackingPickerOpen] = useState(false);
  const [recordingPickerOpen, setRecordingPickerOpen] = useState(false);
  const [driveAttachMsg, setDriveAttachMsg] = useState<string | null>(null);
  const [driveUploading, setDriveUploading] = useState(false);

  const venueOptions = performances.map((p) => p.venueTag);

  const openChartsFolderPicker = useCallback(() => {
    if (!googleAccessToken) return;
    void openEncoreGoogleDrivePicker({
      accessToken: googleAccessToken,
      title: 'Charts folder',
      parentFolderId: driveFolders.charts,
      mimeTypes: ENCORE_DRIVE_CHART_MIME_TYPES,
      onPicked: (files) => {
        const f = files[0];
        if (!f?.id) return;
        setDraft((d) => (d ? addSongAttachment(d, { kind: 'chart', driveFileId: f.id, label: f.name }) : d));
      },
      onError: (m) => setDriveAttachMsg(m),
    });
  }, [googleAccessToken, driveFolders.charts]);

  const openRecordingsFolderPicker = useCallback(() => {
    if (!googleAccessToken) return;
    void openEncoreGoogleDrivePicker({
      accessToken: googleAccessToken,
      title: 'Recordings folder',
      parentFolderId: driveFolders.recordings,
      mimeTypes: ENCORE_DRIVE_RECORDING_MIME_TYPES,
      onPicked: (files) => {
        const f = files[0];
        if (!f?.id) return;
        setDraft((d) => (d ? addSongAttachment(d, { kind: 'recording', driveFileId: f.id, label: f.name }) : d));
      },
      onError: (m) => setDriveAttachMsg(m),
    });
  }, [googleAccessToken, driveFolders.recordings]);

  const openMyDrivePicker = useCallback(() => {
    if (!googleAccessToken) return;
    void openEncoreGoogleDrivePicker({
      accessToken: googleAccessToken,
      title: 'Google Drive',
      onPicked: (files) => {
        const f = files[0];
        if (!f?.id) return;
        setDriveAttachMsg(
          `Picked “${f.name}” (${f.id}). Paste that id into a field above, or use Pick … from Drive in an Encore folder.`,
        );
      },
      onError: (m) => setDriveAttachMsg(m),
    });
  }, [googleAccessToken]);

  const isNew = route.kind === 'songNew';

  const songPerformances = useMemo(() => {
    if (!draft || isNew) return [];
    return performances.filter((p) => p.songId === draft.id).sort((a, b) => b.date.localeCompare(a.date));
  }, [draft, isNew, performances]);

  useEffect(() => {
    if (!googleAccessToken) {
      setDriveFolders({ charts: null, recordings: null });
      return;
    }
    void (async () => {
      try {
        const layout = await ensureEncoreDriveLayout(googleAccessToken);
        setDriveFolders({ charts: layout.sheetMusicFolderId, recordings: layout.recordingsFolderId });
      } catch {
        setDriveFolders({ charts: null, recordings: null });
      }
    })();
  }, [googleAccessToken]);

  useEffect(() => {
    setSpotifyError(null);
    setSpotifyMetaMessage(null);
    if (route.kind === 'songNew') {
      setDraft(newSong());
      setSpotifyQuery('');
      setJournalTab('edit');
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
      setSpotifyQuery(`${s.title} ${s.artist}`.trim());
      setJournalTab('edit');
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

  /** One-shot search when a saved song loads so results appear without typing. */
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
    void (async () => {
      if (!clientId) return;
      const token = await ensureSpotifyAccessToken(clientId);
      if (!token) return;
      try {
        const genres = await fetchSpotifyGenresForTrack(token, t);
        if (!genres.length) return;
        setDraft((d) =>
          d && d.spotifyTrackId === t.id ? { ...d, spotifyGenres: genres, updatedAt: new Date().toISOString() } : d,
        );
      } catch {
        /* genres are optional */
      }
    })();
  }, [clientId]);

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

  const fillFromSpotify = useCallback(
    async (mode: 'emptyOnly' | 'overwrite') => {
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
        let genres: string[] = [];
        try {
          genres = await fetchSpotifyGenresForTrack(token, track);
        } catch {
          genres = [];
        }
        setDraft((d) => {
          if (!d) return d;
          const next = { ...d, updatedAt: new Date().toISOString() };
          next.title = track.name?.trim() || next.title;
          next.artist = track.artists?.map((a) => a.name).join(', ').trim() || next.artist;
          next.albumArtUrl = track.album?.images?.[0]?.url ?? next.albumArtUrl;
          if (genres.length > 0) {
            next.spotifyGenres = genres;
          } else if (mode === 'overwrite') {
            next.spotifyGenres = undefined;
          }
          return next;
        });
        setSpotifyMetaMessage(
          genres.length > 0
            ? `Updated from Spotify: title, artist, artwork, and ${genres.length} genre tag(s) from artist metadata.`
            : 'Updated from Spotify: title, artist, and artwork.',
        );
      } catch (e) {
        setSpotifyError(e instanceof Error ? e.message : String(e));
      } finally {
        setSpotifyMetaLoading(false);
      }
    },
    [clientId, draft?.spotifyTrackId, spotifyLinked],
  );

  const readMusicXmlText = async (file: File): Promise<string | null> => {
    const lower = file.name.toLowerCase();
    if (lower.endsWith('.mxl')) {
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const name = Object.keys(zip.files).find((n) => /\.(xml|musicxml)$/i.test(n) && !zip.files[n]!.dir);
      if (!name) return null;
      return zip.files[name]?.async('string') ?? null;
    }
    if (lower.endsWith('.xml') || lower.endsWith('.musicxml')) return file.text();
    return null;
  };

  const applyNotationHints = (hints: { key?: string; bpm?: number }) => {
    setDraft((d) => {
      if (!d) return d;
      const next = { ...d, updatedAt: new Date().toISOString() };
      if (hints.bpm != null && next.originalBpm == null) next.originalBpm = hints.bpm;
      if (hints.key && !next.originalKey?.trim()) next.originalKey = hints.key;
      return next;
    });
  };

  const handleDriveUpload = async (kind: 'chart' | 'backing' | 'recording', file: File | undefined) => {
    if (!file) return;
    if (!googleAccessToken) {
      setDriveAttachMsg('Sign in to Google to upload files to Drive.');
      return;
    }
    const parent = kind === 'recording' ? driveFolders.recordings : driveFolders.charts;
    if (!parent) {
      setDriveAttachMsg('Drive folders are not ready yet. Try again after sync completes.');
      return;
    }
    setDriveUploading(true);
    setDriveAttachMsg(null);
    try {
      const created = await driveUploadFileResumable(googleAccessToken, file, [parent]);
      setDraft((d) => (d ? addSongAttachment(d, { kind, driveFileId: created.id, label: file.name }) : d));
      const lower = file.name.toLowerCase();
      if (lower.endsWith('.mid') || lower.endsWith('.midi')) {
        applyNotationHints(parseMidiKeyBpm(await file.arrayBuffer()));
      } else if (lower.match(/\.(xml|musicxml|mxl)$/)) {
        const xml = await readMusicXmlText(file);
        if (xml) applyNotationHints(parseMusicXmlKeyBpm(xml));
      }
      setDriveAttachMsg(`Uploaded to Drive (${kind}).`);
    } catch (e) {
      setDriveAttachMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setDriveUploading(false);
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const normalized = songWithSyncedLegacyDriveIds({
        ...draft,
        title: draft.title.trim() || 'Untitled',
        artist: draft.artist.trim() || 'Unknown artist',
        updatedAt: now,
        createdAt: draft.createdAt || now,
      });
      await saveSong(normalized);
      if (isNew) navigateEncore({ kind: 'song', id: draft.id });
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigateEncore({ kind: 'library' });
  };

  const handleDelete = async () => {
    if (!draft || isNew) return;
    if (!window.confirm(`Delete “${draft.title}” from your library?`)) return;
    await deleteSong(draft.id);
    navigateEncore({ kind: 'library' });
  };

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
        <Typography color="text.secondary">This id is not in your library. It may have been removed or the link is wrong.</Typography>
      </Container>
    );
  }

  if (!draft) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const ytId = draft.youtubeVideoId ? parseYoutubeVideoId(draft.youtubeVideoId) : null;
  const resourceTitle = draft.title.trim() || 'song';
  const resourceArtist = draft.artist.trim() || 'artist';

  return (
    <>
      <Container
        maxWidth="md"
        sx={{ px: encoreScreenPaddingX, pt: encorePagePaddingTop, pb: { xs: 14, sm: 6 } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <IconButton aria-label="Back to library" onClick={handleBack} edge="start" size="small" sx={{ ml: -0.5 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="overline" color="primary" sx={{ fontWeight: 800, letterSpacing: '0.12em', lineHeight: 1.2 }}>
            {isNew ? 'New song' : 'Song'}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 2, sm: 3 },
            alignItems: { sm: 'flex-start' },
            mb: 3,
          }}
        >
          {draft.albumArtUrl ? (
            <Box
              component="img"
              src={draft.albumArtUrl}
              alt=""
              sx={{
                width: { xs: '100%', sm: 160 },
                maxWidth: 220,
                aspectRatio: '1',
                objectFit: 'cover',
                borderRadius: 2,
                alignSelf: { xs: 'center', sm: 'flex-start' },
                boxShadow: '0 4px 20px rgba(15, 23, 42, 0.12)',
              }}
            />
          ) : (
            <Box
              sx={{
                width: { xs: '100%', sm: 160 },
                maxWidth: 220,
                aspectRatio: '1',
                alignSelf: { xs: 'center', sm: 'flex-start' },
                borderRadius: 2,
                ...encoreNoAlbumArtSurfaceSx(theme),
              }}
            >
              <MusicNoteIcon sx={{ ...encoreNoAlbumArtIconSx(theme), fontSize: 48 }} aria-hidden />
            </Box>
          )}
          <Box sx={{ flex: 1, minWidth: 0, width: 1 }}>
            {isNew && spotifyLinked && clientId ? (
              <Autocomplete
                freeSolo
                sx={{ mb: 1.5 }}
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
                    helperText="Search Spotify as you type, pick a match, or enter a title manually. Paste a track link and leave the field to import it."
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
                sx={{ mb: 1.5 }}
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
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, fontWeight: 700 }}>
              Key and tempo
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1.5} sx={{ mb: 2 }}>
              <TextField
                size="small"
                label="Original key"
                value={draft.originalKey ?? ''}
                onChange={(e) => setDraft((d) => (d ? { ...d, originalKey: e.target.value || undefined } : d))}
                sx={{ width: 140 }}
              />
              <TextField
                size="small"
                label="Original BPM"
                type="number"
                value={draft.originalBpm ?? ''}
                onChange={(e) =>
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          originalBpm: e.target.value === '' ? undefined : Number(e.target.value),
                        }
                      : d,
                  )
                }
                sx={{ width: 120 }}
              />
              <TextField
                size="small"
                label="Performance key"
                value={draft.performanceKey ?? ''}
                onChange={(e) => setDraft((d) => (d ? { ...d, performanceKey: e.target.value || undefined } : d))}
                sx={{ width: 140 }}
              />
              <TextField
                size="small"
                label="Performance BPM"
                type="number"
                value={draft.performanceBpm ?? ''}
                onChange={(e) =>
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          performanceBpm: e.target.value === '' ? undefined : Number(e.target.value),
                        }
                      : d,
                  )
                }
                sx={{ width: 140 }}
              />
            </Stack>
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
              {draft.spotifyTrackId ? (
                <Chip
                  size="small"
                  icon={<SpotifyBrandIcon sx={{ fontSize: '18px !important' }} />}
                  label="Spotify"
                  component="a"
                  href={`https://open.spotify.com/track/${encodeURIComponent(draft.spotifyTrackId)}`}
                  clickable
                  target="_blank"
                  rel="noreferrer"
                />
              ) : null}
              {ytId ? (
                <Chip
                  size="small"
                  icon={<YouTubeBrandIcon sx={{ fontSize: '18px !important' }} />}
                  label="YouTube"
                  component="a"
                  href={`https://www.youtube.com/watch?v=${encodeURIComponent(ytId)}`}
                  clickable
                  target="_blank"
                  rel="noreferrer"
                />
              ) : null}
            </Stack>
            {(draft.spotifyGenres ?? []).length > 0 ? (
              <Stack direction="row" flexWrap="wrap" gap={0.5} alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mr: 0.25 }}>
                  Spotify genres
                </Typography>
                {(draft.spotifyGenres ?? []).map((g) => (
                  <Chip key={g} size="small" variant="outlined" label={g} />
                ))}
              </Stack>
            ) : null}
          </Box>
        </Box>

        {!isNew ? (
          <Box sx={{ ...encoreSurfaceSectionSx }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
              <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                <VideocamIcon color="primary" fontSize="small" aria-hidden />
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Performance gallery
                </Typography>
                {songPerformances.length > 0 ? (
                  <Chip size="small" label={songPerformances.length} color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                ) : null}
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
            {songPerformances.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
                No performances yet. Add one to save the venue, date, and a link or Drive file for your performance video.
              </Typography>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                  gap: 1.5,
                }}
              >
                {songPerformances.map((p) => {
                  const url = performanceVideoOpenUrl(p);
                  return (
                    <Box
                      key={p.id}
                      sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 2,
                        p: 1.5,
                        bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        minHeight: 120,
                        overflow: 'hidden',
                      }}
                    >
                      <PerformanceVideoThumb
                        performance={p}
                        fluid
                        alt={url ? `Video thumbnail for performance on ${p.date}` : `Performance on ${p.date}`}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: '0.08em' }}>
                        {p.date}
                      </Typography>
                      <Chip
                        size="small"
                        label={p.venueTag?.trim() || 'Venue'}
                        sx={{ alignSelf: 'flex-start', fontWeight: 700 }}
                        color="primary"
                        variant="filled"
                      />
                      {p.notes ? (
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45 }}>
                          {p.notes.length > 140 ? `${p.notes.slice(0, 140)}…` : p.notes}
                        </Typography>
                      ) : null}
                      <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 'auto', pt: 0.5 }}>
                        {url ? (
                          <Button
                            size="small"
                            variant="contained"
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            startIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
                          >
                            Open video
                          </Button>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            No video link
                          </Typography>
                        )}
                        <Button
                          size="small"
                          variant="outlined"
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
            )}
          </Box>
        ) : (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Save the song first to add performances and attach videos.
          </Typography>
        )}

        {draft.title.trim().length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Look up this song
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap>
              <Button
                size="small"
                variant="outlined"
                endIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
                href={encoreUltimateGuitarSearchUrl(resourceTitle, resourceArtist)}
                target="_blank"
                rel="noreferrer"
              >
                Ultimate Guitar
              </Button>
              <Button
                size="small"
                variant="outlined"
                endIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
                href={encoreGeniusSearchUrl(resourceTitle, resourceArtist)}
                target="_blank"
                rel="noreferrer"
              >
                Genius
              </Button>
              <Button
                size="small"
                variant="outlined"
                endIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
                href={encoreYouTubeSearchUrl(resourceTitle, resourceArtist)}
                target="_blank"
                rel="noreferrer"
              >
                YouTube search
              </Button>
            </Stack>
          </Box>
        )}

        {(draft.spotifyTrackId || ytId) && (
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Listen here
              </Typography>
              <Button size="small" onClick={() => setShowEmbeds((v) => !v)}>
                {showEmbeds ? 'Hide players' : 'Show players'}
              </Button>
            </Stack>
            {showEmbeds ? (
              <Stack spacing={2}>
                {ytId ? (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <YouTubeBrandIcon fontSize="inherit" /> YouTube
                    </Typography>
                    <Box
                      sx={{
                        position: 'relative',
                        pb: '56.25%',
                        height: 0,
                        overflow: 'hidden',
                        borderRadius: 2,
                        bgcolor: 'action.hover',
                      }}
                    >
                      <Box
                        component="iframe"
                        title="YouTube preview"
                        src={`https://www.youtube.com/embed/${encodeURIComponent(ytId)}`}
                        sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </Box>
                  </Box>
                ) : null}
                {draft.spotifyTrackId ? (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <SpotifyBrandIcon fontSize="inherit" /> Spotify
                    </Typography>
                    <Box
                      component="iframe"
                      title="Spotify preview"
                      src={`https://open.spotify.com/embed/track/${encodeURIComponent(draft.spotifyTrackId)}?utm_source=generator`}
                      width="100%"
                      height="152"
                      style={{ border: 0, borderRadius: 12, maxWidth: '100%' }}
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                    />
                  </Box>
                ) : null}
              </Stack>
            ) : (
              <Typography variant="caption" color="text.secondary">
                Players load only when you expand them (saves bandwidth).
              </Typography>
            )}
          </Box>
        )}

        <Box sx={{ ...encoreSurfaceSectionSx }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            Recording links
          </Typography>
          {!clientId && <Alert severity="info">Set VITE_SPOTIFY_CLIENT_ID to search Spotify from this screen.</Alert>}
          {clientId && !spotifyLinked && (
            <Alert severity="info" action={<Button onClick={() => void connectSpotify()}>Connect Spotify</Button>}>
              Connect Spotify in the Account menu to search tracks and paste Spotify links.
            </Alert>
          )}
          {spotifyError && <Alert severity="error">{spotifyError}</Alert>}
          {spotifyMetaMessage && <Alert severity="success">{spotifyMetaMessage}</Alert>}
          {spotifyLinked && clientId && draft.spotifyTrackId && (
            <Box sx={{ mb: 1.5 }}>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={spotifyMetaLoading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
                  disabled={spotifyMetaLoading}
                  onClick={() => void fillFromSpotify('emptyOnly')}
                >
                  Refresh from Spotify
                </Button>
                <Button
                  size="small"
                  variant="text"
                  disabled={spotifyMetaLoading}
                  onClick={() => void fillFromSpotify('overwrite')}
                >
                  Overwrite from Spotify
                </Button>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75, lineHeight: 1.45 }}>
                Updates title, artist, cover art, and genre tags from Spotify. Key and tempo stay as you set them here (or from MusicXML / MIDI when you attach charts).
              </Typography>
            </Box>
          )}
          {spotifyLinked && clientId && !isNew && (
            <Autocomplete
              sx={{ mb: 1.5 }}
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
                  label="Find on Spotify"
                  helperText="Type title and artist, or paste a track URL and blur the field."
                  onBlur={() => void resolveSpotifyPaste()}
                  InputProps={{
                    ...params.InputProps,
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
          )}
          <TextField
            label="YouTube (video URL or id)"
            value={draft.youtubeVideoId ?? ''}
            onChange={(e) => setDraft((d) => (d ? { ...d, youtubeVideoId: e.target.value.trim() || undefined } : d))}
            onBlur={() => {
              const raw = draft.youtubeVideoId ?? '';
              const parsed = parseYoutubeVideoId(raw);
              if (parsed && parsed !== raw.trim()) {
                setDraft((d) => (d ? { ...d, youtubeVideoId: parsed } : d));
              }
            }}
            fullWidth
            InputProps={{
              startAdornment: <YouTubeBrandIcon sx={{ mr: 1, opacity: 0.85, fontSize: 22, alignSelf: 'center' }} />,
            }}
            helperText={
              ytId ? `Canonical: https://www.youtube.com/watch?v=${encodeURIComponent(ytId)}` : 'Watch URL, youtu.be, shorts, or 11-character id.'
            }
          />
        </Box>

        <Box sx={{ ...encoreSurfaceSectionSx }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            Charts and tracks (Google Drive)
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
            Upload PDFs, MusicXML, MIDI, or audio. MusicXML and MIDI can suggest key and tempo when those fields are
            empty. You can also pick files already in your Encore Drive folders.
          </Typography>
          {driveAttachMsg ? (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              {driveAttachMsg}
            </Typography>
          ) : null}
          <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
            <Button
              size="small"
              variant="outlined"
              component="label"
              disabled={!googleAccessToken || driveUploading}
            >
              Upload chart
              <input
                type="file"
                hidden
                accept=".pdf,.xml,.musicxml,.mxl,image/*"
                onChange={(e) => void handleDriveUpload('chart', e.target.files?.[0])}
              />
            </Button>
            <Button size="small" variant="outlined" onClick={() => setChartPickerOpen(true)} disabled={!googleAccessToken}>
              Pick chart from Drive
            </Button>
            <Button
              size="small"
              variant="outlined"
              component="label"
              disabled={!googleAccessToken || driveUploading}
            >
              Upload backing
              <input
                type="file"
                hidden
                accept="audio/*,.mp3,.wav,.m4a,.ogg"
                onChange={(e) => void handleDriveUpload('backing', e.target.files?.[0])}
              />
            </Button>
            <Button size="small" variant="outlined" onClick={() => setBackingPickerOpen(true)} disabled={!googleAccessToken}>
              Pick backing from Drive
            </Button>
            <Button
              size="small"
              variant="outlined"
              component="label"
              disabled={!googleAccessToken || driveUploading}
            >
              Upload recording
              <input
                type="file"
                hidden
                accept="audio/*,.mp3,.wav,.mid,.midi,.mxl,.xml,.musicxml,.pdf"
                onChange={(e) => void handleDriveUpload('recording', e.target.files?.[0])}
              />
            </Button>
            <Button size="small" variant="outlined" onClick={() => setRecordingPickerOpen(true)} disabled={!googleAccessToken}>
              Pick recording from Drive
            </Button>
          </Stack>
          {googleAccessToken ? (
            <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center" sx={{ mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary" component="span">
                Browse in Google Drive:
              </Typography>
              {driveFolders.charts ? (
                <Button size="small" variant="text" onClick={openChartsFolderPicker}>
                  Charts folder
                </Button>
              ) : null}
              {driveFolders.recordings ? (
                <Button size="small" variant="text" onClick={openRecordingsFolderPicker}>
                  Recordings folder
                </Button>
              ) : null}
              <Button size="small" variant="text" onClick={openMyDrivePicker}>
                My Drive
              </Button>
            </Stack>
          ) : null}
          <TextField
            label="Lead sheet or chart (Drive file id)"
            value={draft.sheetMusicDriveFileId ?? ''}
            onChange={(e) => setDraft((d) => (d ? { ...d, sheetMusicDriveFileId: e.target.value || undefined } : d))}
            fullWidth
            size="small"
            sx={{ mb: 1.5 }}
            InputProps={{ startAdornment: <GoogleBrandIcon sx={{ mr: 1, fontSize: 22, alignSelf: 'center' }} /> }}
            helperText={(() => {
              const fid = parseDriveFileIdFromUrlOrId((draft.sheetMusicDriveFileId ?? '').trim());
              return googleAccessToken && fid ? (
                <Button
                  size="small"
                  variant="text"
                  component="a"
                  href={driveFileWebUrl(fid)}
                  target="_blank"
                  rel="noreferrer"
                  startIcon={<OpenInNewIcon fontSize="small" />}
                  sx={{ p: 0, minWidth: 0, verticalAlign: 'baseline' }}
                >
                  Open this file in Drive
                </Button>
              ) : undefined;
            })()}
          />
          <TextField
            label="Backing track (Drive file id)"
            value={draft.backingTrackDriveFileId ?? ''}
            onChange={(e) => setDraft((d) => (d ? { ...d, backingTrackDriveFileId: e.target.value || undefined } : d))}
            fullWidth
            size="small"
            InputProps={{ startAdornment: <GoogleBrandIcon sx={{ mr: 1, fontSize: 22, alignSelf: 'center' }} /> }}
            helperText={(() => {
              const fid = parseDriveFileIdFromUrlOrId((draft.backingTrackDriveFileId ?? '').trim());
              return googleAccessToken && fid ? (
                <Button
                  size="small"
                  variant="text"
                  component="a"
                  href={driveFileWebUrl(fid)}
                  target="_blank"
                  rel="noreferrer"
                  startIcon={<OpenInNewIcon fontSize="small" />}
                  sx={{ p: 0, minWidth: 0, verticalAlign: 'baseline' }}
                >
                  Open this file in Drive
                </Button>
              ) : undefined;
            })()}
          />
          {effectiveSongAttachments(draft).length > 0 ? (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Linked files:{' '}
              {effectiveSongAttachments(draft)
                .map((a) => `${a.kind} ${a.label ?? a.driveFileId.slice(0, 8)}…`)
                .join(' · ')}
            </Typography>
          ) : null}
        </Box>

        <DriveFilePickerDialog
          open={chartPickerOpen}
          title="Pick a chart file"
          folderId={driveFolders.charts}
          googleAccessToken={googleAccessToken}
          pickerMimeTypes={ENCORE_DRIVE_CHART_MIME_TYPES}
          onClose={() => setChartPickerOpen(false)}
          onPick={(id, name) => {
            setDraft((d) => (d ? addSongAttachment(d, { kind: 'chart', driveFileId: id, label: name }) : d));
            setChartPickerOpen(false);
          }}
        />
        <DriveFilePickerDialog
          open={backingPickerOpen}
          title="Pick a backing track"
          folderId={driveFolders.charts}
          googleAccessToken={googleAccessToken}
          pickerMimeTypes={ENCORE_DRIVE_RECORDING_MIME_TYPES}
          onClose={() => setBackingPickerOpen(false)}
          onPick={(id, name) => {
            setDraft((d) => (d ? addSongAttachment(d, { kind: 'backing', driveFileId: id, label: name }) : d));
            setBackingPickerOpen(false);
          }}
        />
        <DriveFilePickerDialog
          open={recordingPickerOpen}
          title="Pick a recording"
          folderId={driveFolders.recordings}
          googleAccessToken={googleAccessToken}
          pickerMimeTypes={ENCORE_DRIVE_RECORDING_MIME_TYPES}
          onClose={() => setRecordingPickerOpen(false)}
          onPick={(id, name) => {
            setDraft((d) => (d ? addSongAttachment(d, { kind: 'recording', driveFileId: id, label: name }) : d));
            setRecordingPickerOpen(false);
          }}
        />

        <Accordion
          defaultExpanded
          disableGutters
          elevation={0}
          sx={{ border: 1, borderColor: 'divider', borderRadius: 2, mb: 0, '&:before': { display: 'none' } }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={700}>Practice journal (Markdown)</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Button size="small" variant={journalTab === 'edit' ? 'contained' : 'outlined'} onClick={() => setJournalTab('edit')}>
                Edit
              </Button>
              <Button size="small" variant={journalTab === 'preview' ? 'contained' : 'outlined'} onClick={() => setJournalTab('preview')}>
                Preview
              </Button>
            </Box>
            {journalTab === 'edit' ? (
              <TextField
                value={draft.journalMarkdown}
                onChange={(e) => setDraft((d) => (d ? { ...d, journalMarkdown: e.target.value } : d))}
                fullWidth
                multiline
                minRows={5}
                inputProps={{ 'aria-label': 'Journal markdown' }}
              />
            ) : (
              <MarkdownPreview markdown={draft.journalMarkdown} />
            )}
          </AccordionDetails>
        </Accordion>
      </Container>

      <Box
        sx={{
          position: 'sticky',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 8,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: (t) => alpha(t.palette.background.paper, 0.92),
          backdropFilter: 'saturate(160%) blur(12px)',
          WebkitBackdropFilter: 'saturate(160%) blur(12px)',
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
        <Button onClick={handleBack}>Cancel</Button>
        <Button variant="contained" onClick={() => void handleSave()} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </Box>

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
