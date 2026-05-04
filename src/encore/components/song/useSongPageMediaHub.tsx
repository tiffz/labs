/**
 * Media hub for SongPage + SongResourcesEditDialog (reference, backing, Spotify source, charts, takes).
 * Slices copied from SongPage — refactor together when media flows change.
 */
/* eslint-disable react-refresh/only-export-components -- hook co-located with small section-heading helper */
import AddIcon from '@mui/icons-material/Add';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { driveUploadFileResumable } from '../../drive/driveFetch';
import { ensureEncoreDriveLayout } from '../../drive/bootstrapFolders';
import {
  resolveDriveUploadFolderId,
  type DriveUploadFolderLayout,
} from '../../drive/resolveDriveUploadFolder';
import { driveFileWebUrl, driveFolderWebUrl } from '../../drive/driveWebUrls';
import { ensureSpotifyAccessToken } from '../../spotify/pkce';
import { fetchSpotifyTrack, searchTracks, type SpotifySearchTrack } from '../../spotify/spotifyApi';
import { parseSpotifyTrackId } from '../../spotify/parseSpotifyTrackUrl';
import type { EncoreDriveUploadFolderOverrides, EncoreSong } from '../../types';
import { useEncoreBlockingJobs } from '../../context/EncoreBlockingJobContext';
import { songPageResourceRowShellSx } from '../../theme/encoreUiTokens';
import { GoogleDriveBrandIcon, SpotifyBrandIcon, YouTubeBrandIcon } from '../EncoreBrandIcon';
import {
  encoreGeniusSearchUrl,
  encoreUltimateGuitarSearchUrl,
  encoreYouTubeSearchUrl,
} from '../encoreSongResourceLinks';
import {
  addSongAttachment,
  effectiveSongAttachments,
  primaryChartAttachment,
  setPrimaryChartByDriveFileId,
} from '../../utils/songAttachments';
import {
  appendDriveBackingLink,
  appendDriveReferenceLink,
  appendSpotifyBackingLink,
  appendSpotifyReferenceLink,
  appendYoutubeBackingLink,
  appendYoutubeReferenceLink,
  applySpotifyDataSourcePick,
  mergeSpotifyTrackWebMetadata,
  removeMediaLinkById,
  setPrimaryBackingLinkId,
  setPrimaryReferenceLinkId,
  spotifyDataSourceTrackId,
} from '../../repertoire/songMediaLinks';
import { EncoreSpotifyConnectionChip } from '../../ui/EncoreSpotifyConnectionChip';
import { EncoreStreamingHoverCard } from '../EncoreStreamingHoverCard';
import { EncoreMediaLinkRow } from '../../ui/EncoreMediaLinkRow';
import { EncoreAudioResourceNotesWrapper } from '../../ui/EncoreAudioResourceNotesWrapper';
import { formatMediaLinkCaption, youtubeWatchUrlFromMediaLink } from '../../ui/encoreMediaLinkFormat';
import { EncoreSpotifySearchOrPasteField } from '../../ui/EncoreSpotifySearchOrPasteField';
import { EncoreYouTubePasteField } from '../../ui/EncoreYouTubePasteField';
import type { SongPageMediaSlots } from './SongPageMediaHubCards';
import type { SongMediaUploadSlot } from './songMediaUploadSlot';

/** Dense subsection labels on the song page */
const songPageBlockTitleSx = {
  fontWeight: 600,
  fontSize: '0.8125rem',
  letterSpacing: '0.04em',
  textTransform: 'uppercase' as const,
  color: 'text.secondary',
  lineHeight: 1.4,
  mb: 1.25,
};
function SongPageSectionHeading(props: {
  title: string;
  tooltip: string;
  infoAriaLabel: string;
}): ReactElement {
  const { title, tooltip, infoAriaLabel } = props;
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={0.5}
      sx={{ mb: 0.35 }}
      data-encore-section-heading
    >
      <Typography
        component="h2"
        variant="body2"
        sx={{ ...songPageBlockTitleSx, mb: 0 }}
      >
        {title}
      </Typography>
      <Tooltip title={tooltip}>
        <IconButton
          size="small"
          aria-label={infoAriaLabel}
          sx={{ p: 0.25, color: 'text.secondary' }}
        >
          <InfoOutlinedIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

/** Inline icon buttons next to media links — keep visually quiet */
const extLinkIconBtnSx = {
  color: 'text.secondary',
  p: 0.25,
  '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
} as const;

/** Spotify track used for metadata, sync, and default art (may differ from the listening reference). */
const SONG_INFO_SOURCE_TOOLTIP =
  'This Spotify track is your song info source: playlist sync, Fill from Spotify, and default album art. It can differ from your primary listening reference.';

const SONG_INFO_SOURCE_ICON_ARIA = 'About song info source';

function trackLabel(t: SpotifySearchTrack): string {
  const artists = t.artists?.map((a) => a.name).join(', ') ?? '';
  return `${t.name} · ${artists}`;
}

/**
 * Primary line for the Spotify catalog row: prefer the Spotify **reference** caption for this track id
 * so swapped song-level title/artist (e.g. bad YouTube import) does not masquerade as Spotify metadata.
 */
function spotifyCatalogDisplayLabel(draft: EncoreSong, catalogTrackId: string): string {
  const idNorm = catalogTrackId.trim();
  const link = (draft.referenceLinks ?? []).find(
    (l) => l.source === 'spotify' && (l.spotifyTrackId ?? '').trim() === idNorm,
  );
  if (link) {
    const line = formatMediaLinkCaption(link);
    const max = 72;
    return line.length <= max ? line : `${line.slice(0, max - 1)}…`;
  }
  const id = idNorm;
  return id.length <= 14 ? `Spotify · ${id}` : `Spotify · ${id.slice(0, 6)}…`;
}

export type SongPageMediaHubBundle = {
  catalogStrip: ReactNode;
  spotifyAlerts: ReactNode;
  mediaSlots: SongPageMediaSlots;
  searchWebFooter: ReactNode;
  spotifyOptions: SpotifySearchTrack[];
  spotifyLoading: boolean;
  applySpotifyDataSourceFromTrack: (t: SpotifySearchTrack) => void;
  resolveSpotifyDataSourcePaste: (rawOverride?: string) => Promise<void>;
  /** Upload local files into Listen / Play / Charts / Takes (same as section file pickers). */
  uploadFilesToMediaSlot: (slot: SongMediaUploadSlot, files: File[]) => Promise<void>;
};

export type UseSongPageMediaHubArgs = {
  draft: EncoreSong | null;
  setDraft: React.Dispatch<React.SetStateAction<EncoreSong | null>>;
  isNew: boolean;
  routeKind: 'song' | 'songNew';
  routeSongId: string | null;
  songs: EncoreSong[];
  googleAccessToken: string | null;
  spotifyLinked: boolean;
  /** Optional Drive folder ids for new uploads (Repertoire settings). */
  driveUploadFolderOverrides?: EncoreDriveUploadFolderOverrides | null;
  persistAfterMetadataRefresh?: (song: EncoreSong) => Promise<void>;
};

export function useSongPageMediaHub(props: UseSongPageMediaHubArgs): SongPageMediaHubBundle {
  const {
    draft,
    setDraft,
    isNew,
    routeKind,
    routeSongId,
    songs,
    googleAccessToken,
    spotifyLinked,
    driveUploadFolderOverrides = null,
    persistAfterMetadataRefresh,
  } = props;
  const { withBlockingJob } = useEncoreBlockingJobs();
  const clientId =
    (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined)?.trim() ??
    '';
  const [spotifyQuery, setSpotifyQuery] = useState('');
  const [refSpotifyQuery, setRefSpotifyQuery] = useState('');
  const [spotifyOptions, setSpotifyOptions] = useState<SpotifySearchTrack[]>(
    []
  );
  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const [spotifyError, setSpotifyError] = useState<string | null>(null);
  /** When false and catalog id is set, show the linked track row instead of the search field. */
  const [spotifyCatalogSwapOpen, setSpotifyCatalogSwapOpen] = useState(false);
  const [spotifyMetaLoading, setSpotifyMetaLoading] = useState(false);
  const [spotifyMetaMessage, setSpotifyMetaMessage] = useState<string | null>(
    null
  );
  const [youtubeRefPaste, setYoutubeRefPaste] = useState('');
  const [youtubeBackPaste, setYoutubeBackPaste] = useState('');
  const [backingSpotifyQuery, setBackingSpotifyQuery] = useState('');
  const [chartAddAnchor, setChartAddAnchor] = useState<null | HTMLElement>(
    null
  );
  const chartFileInputRef = useRef<HTMLInputElement | null>(null);
  const [driveUploadLayout, setDriveUploadLayout] = useState<DriveUploadFolderLayout | null>(null);
  const referenceDriveInputRef = useRef<HTMLInputElement | null>(null);
  const takesDriveInputRef = useRef<HTMLInputElement | null>(null);
  const backingDriveInputRef = useRef<HTMLInputElement | null>(null);
  const [driveAttachMsg, setDriveAttachMsg] = useState<string | null>(null);
  const [driveUploading, setDriveUploading] = useState(false);
  const [referenceAddAnchor, setReferenceAddAnchor] = useState<null | HTMLElement>(null);
  const [referenceAddKind, setReferenceAddKind] = useState<'spotify' | 'youtube'>('spotify');
  const [backingAddAnchor, setBackingAddAnchor] = useState<null | HTMLElement>(null);
  const [backingAddKind, setBackingAddKind] = useState<'spotify' | 'youtube'>('spotify');
  const [referenceAddMenuAnchor, setReferenceAddMenuAnchor] = useState<HTMLElement | null>(null);
  const [backingAddMenuAnchor, setBackingAddMenuAnchor] = useState<HTMLElement | null>(null);
  const closeReferenceAdd = useCallback(() => {
    setReferenceAddAnchor(null);
    setRefSpotifyQuery('');
    setYoutubeRefPaste('');
  }, []);

  const closeBackingAdd = useCallback(() => {
    setBackingAddAnchor(null);
    setBackingSpotifyQuery('');
    setYoutubeBackPaste('');
  }, []);

  useEffect(() => {
    if (!draft) return;
    setSpotifyQuery(`${draft.title} ${draft.artist}`.trim());
    setSpotifyCatalogSwapOpen(false);
    // Intentionally key off song id only: avoid resetting the Spotify search field on every title/artist keystroke.
  }, [draft?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- reset when navigating between songs, not on each draft field edit

  useEffect(() => {
    if (!googleAccessToken) {
      setDriveUploadLayout(null);
      return;
    }
    void (async () => {
      try {
        const layout = await ensureEncoreDriveLayout(googleAccessToken);
        setDriveUploadLayout(layout);
      } catch {
        setDriveUploadLayout(null);
      }
    })();
  }, [googleAccessToken]);

  const chartUploadFolderId = useMemo(
    () =>
      driveUploadLayout
        ? resolveDriveUploadFolderId('charts', driveUploadLayout, driveUploadFolderOverrides) ?? null
        : null,
    [driveUploadLayout, driveUploadFolderOverrides],
  );
  const referenceUploadFolderId = useMemo(
    () =>
      driveUploadLayout
        ? resolveDriveUploadFolderId('referenceTracks', driveUploadLayout, driveUploadFolderOverrides) ??
          null
        : null,
    [driveUploadLayout, driveUploadFolderOverrides],
  );
  const backingUploadFolderId = useMemo(
    () =>
      driveUploadLayout
        ? resolveDriveUploadFolderId('backingTracks', driveUploadLayout, driveUploadFolderOverrides) ?? null
        : null,
    [driveUploadLayout, driveUploadFolderOverrides],
  );
  const takesUploadFolderId = useMemo(
    () =>
      driveUploadLayout
        ? resolveDriveUploadFolderId('takes', driveUploadLayout, driveUploadFolderOverrides) ?? null
        : null,
    [driveUploadLayout, driveUploadFolderOverrides],
  );
  const spotifySearchListQuery = useMemo(() => {
    if (isNew) {
      return `${draft?.title ?? ''} ${draft?.artist ?? ''}`.trim();
    }
    const catalogId = draft ? spotifyDataSourceTrackId(draft) : '';
    const catalogRowOnly = Boolean(catalogId) && !spotifyCatalogSwapOpen;
    const refOpen = Boolean(referenceAddAnchor);
    const backOpen = Boolean(backingAddAnchor);
    const candidates = [
      ...(refOpen ? [refSpotifyQuery.trim()] : []),
      ...(backOpen ? [backingSpotifyQuery.trim()] : []),
      ...(catalogRowOnly ? [] : [spotifyQuery.trim()]),
    ].filter((q) => q.length >= 2);
    if (candidates.length === 0) return '';
    return candidates.reduce((a, b) => (b.length > a.length ? b : a));
  }, [
    isNew,
    draft,
    spotifyQuery,
    refSpotifyQuery,
    backingSpotifyQuery,
    referenceAddAnchor,
    backingAddAnchor,
    spotifyCatalogSwapOpen,
  ]);
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
    if (isNew || !spotifyLinked || !clientId || routeKind !== 'song') return;
    const s = routeSongId ? songs.find((x) => x.id === routeSongId) : undefined;
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
  }, [routeKind, routeSongId, songs, isNew, spotifyLinked, clientId]);
  const applySpotifyDataSourceFromTrack = useCallback((t: SpotifySearchTrack) => {
    setSpotifyCatalogSwapOpen(false);
    setDraft((d) => {
      if (!d) return d;
      return applySpotifyDataSourcePick(d, t.id, {
        title: t.name?.trim() || d.title,
        artist:
          t.artists
            ?.map((a) => a.name)
            .join(', ')
            .trim() || d.artist,
        albumArtUrl: t.album?.images?.[0]?.url,
      });
    });
    setSpotifyQuery(trackLabel(t));
  }, [setDraft]);

  const appendReferenceSpotifyFromTrack = useCallback((t: SpotifySearchTrack) => {
    setDraft((d) => (d ? appendSpotifyReferenceLink(d, t.id, { label: trackLabel(t) }) : d));
    setRefSpotifyQuery(trackLabel(t));
  }, [setDraft]);

  const resolveSpotifyDataSourcePaste = useCallback(
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
        applySpotifyDataSourceFromTrack(t);
      } catch (e) {
        setSpotifyError(e instanceof Error ? e.message : String(e));
      } finally {
        setSpotifyLoading(false);
      }
    },
    [applySpotifyDataSourceFromTrack, clientId, draft, spotifyLinked, spotifyQuery],
  );

  const resolveRefSpotifyPaste = useCallback(async () => {
    if (!draft || !clientId || !spotifyLinked) return;
    const raw = refSpotifyQuery.trim();
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
      appendReferenceSpotifyFromTrack(t);
      closeReferenceAdd();
    } catch (e) {
      setSpotifyError(e instanceof Error ? e.message : String(e));
    } finally {
      setSpotifyLoading(false);
    }
  }, [appendReferenceSpotifyFromTrack, clientId, closeReferenceAdd, draft, spotifyLinked, refSpotifyQuery]);

  const appendBackingSpotifyFromTrack = useCallback((t: SpotifySearchTrack) => {
    setDraft((d) => (d ? appendSpotifyBackingLink(d, t.id, { label: trackLabel(t) }) : d));
    setBackingSpotifyQuery(trackLabel(t));
  }, [setDraft]);

  const resolveBackingSpotifyPaste = useCallback(async () => {
    if (!draft || !clientId || !spotifyLinked) return;
    const raw = backingSpotifyQuery.trim();
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
      appendBackingSpotifyFromTrack(t);
      closeBackingAdd();
    } catch (e) {
      setSpotifyError(e instanceof Error ? e.message : String(e));
    } finally {
      setSpotifyLoading(false);
    }
  }, [appendBackingSpotifyFromTrack, clientId, closeBackingAdd, draft, spotifyLinked, backingSpotifyQuery]);

  const fillFromSpotify = useCallback(async () => {
    setSpotifyMetaMessage(null);
    setSpotifyError(null);
    if (!spotifyLinked) {
      setSpotifyMetaMessage('Connect Spotify first (Account menu).');
      return;
    }
    if (!clientId) {
      setSpotifyMetaMessage('Spotify client id is not configured.');
      return;
    }
    const d = draft;
    if (!d) return;
    const pid = spotifyDataSourceTrackId(d);
    if (!pid) {
      setSpotifyMetaMessage('No song info source (Spotify) is set for this song.');
      return;
    }
    setSpotifyMetaLoading(true);
    try {
      const token = await ensureSpotifyAccessToken(clientId);
      if (!token) {
        setSpotifyMetaMessage('Connect Spotify first (Account menu).');
        return;
      }
      const track = await fetchSpotifyTrack(token, pid);
      const merged = mergeSpotifyTrackWebMetadata(d, track);
      setDraft(merged);
      await persistAfterMetadataRefresh?.(merged);
      setSpotifyMetaMessage(
        'Updated from Spotify: title, artist, artwork, and Spotify link labels.'
      );
    } catch (e) {
      setSpotifyError(e instanceof Error ? e.message : String(e));
    } finally {
      setSpotifyMetaLoading(false);
    }
  }, [clientId, draft, spotifyLinked, persistAfterMetadataRefresh, setDraft]);
  const uploadReferenceDriveFile = useCallback(
    async (file: File) => {
      if (!googleAccessToken) throw new Error('Sign in to Google to upload files to Drive.');
      if (!referenceUploadFolderId) {
        throw new Error('Drive folders are not ready yet. Try again after the first backup completes.');
      }
      const created = await driveUploadFileResumable(googleAccessToken, file, [referenceUploadFolderId]);
      setDraft((d) => (d ? appendDriveReferenceLink(d, created.id, { label: file.name }) : d));
    },
    [googleAccessToken, referenceUploadFolderId, setDraft],
  );

  const uploadBackingDriveFile = useCallback(
    async (file: File) => {
      if (!googleAccessToken) throw new Error('Sign in to Google to upload files to Drive.');
      if (!backingUploadFolderId) {
        throw new Error('Drive folders are not ready yet. Try again after the first backup completes.');
      }
      const created = await driveUploadFileResumable(googleAccessToken, file, [backingUploadFolderId]);
      setDraft((d) => (d ? appendDriveBackingLink(d, created.id, { label: file.name }) : d));
    },
    [googleAccessToken, backingUploadFolderId, setDraft],
  );

  const uploadTakeDriveFile = useCallback(
    async (file: File) => {
      if (!googleAccessToken) throw new Error('Sign in to Google to upload files to Drive.');
      if (!takesUploadFolderId) {
        throw new Error('Drive folders are not ready yet. Try again after the first backup completes.');
      }
      const created = await driveUploadFileResumable(googleAccessToken, file, [takesUploadFolderId]);
      setDraft((d) => {
        if (!d) return d;
        return addSongAttachment(d, {
          kind: 'recording',
          driveFileId: created.id,
          label: file.name,
        });
      });
    },
    [googleAccessToken, takesUploadFolderId, setDraft],
  );

  const uploadChartDriveFile = useCallback(
    async (file: File) => {
      if (!googleAccessToken) throw new Error('Sign in to Google to upload files to Drive.');
      if (!chartUploadFolderId) {
        throw new Error('Drive folders are not ready yet. Try again after the first backup completes.');
      }
      const created = await driveUploadFileResumable(googleAccessToken, file, [chartUploadFolderId]);
      setDraft((d) =>
        d
          ? addSongAttachment(d, {
              kind: 'chart',
              driveFileId: created.id,
              label: file.name,
            })
          : d,
      );
    },
    [googleAccessToken, chartUploadFolderId, setDraft],
  );

  const onReferenceDriveFile = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      setDriveUploading(true);
      setDriveAttachMsg(null);
      try {
        await withBlockingJob('Uploading reference file…', async () => {
          await uploadReferenceDriveFile(file);
          setDriveAttachMsg('Reference file linked.');
        });
      } catch (err) {
        setDriveAttachMsg(err instanceof Error ? err.message : String(err));
      } finally {
        setDriveUploading(false);
      }
    },
    [uploadReferenceDriveFile, withBlockingJob],
  );

  const onBackingDriveFile = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      setDriveUploading(true);
      setDriveAttachMsg(null);
      try {
        await withBlockingJob('Uploading backing file…', async () => {
          await uploadBackingDriveFile(file);
          setDriveAttachMsg('Backing file linked.');
        });
      } catch (err) {
        setDriveAttachMsg(err instanceof Error ? err.message : String(err));
      } finally {
        setDriveUploading(false);
      }
    },
    [uploadBackingDriveFile, withBlockingJob],
  );

  const onTakesDriveFile = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      setDriveUploading(true);
      setDriveAttachMsg(null);
      try {
        await withBlockingJob('Uploading take…', async () => {
          await uploadTakeDriveFile(file);
          setDriveAttachMsg('Take uploaded.');
        });
      } catch (err) {
        setDriveAttachMsg(err instanceof Error ? err.message : String(err));
      } finally {
        setDriveUploading(false);
      }
    },
    [uploadTakeDriveFile, withBlockingJob],
  );

  const handleDriveChartUpload = async (file: File | undefined) => {
    if (!file) return;
    setDriveUploading(true);
    setDriveAttachMsg(null);
    try {
      await withBlockingJob('Uploading chart to Google Drive…', async () => {
        await uploadChartDriveFile(file);
        setDriveAttachMsg('Chart linked.');
      });
    } catch (e) {
      setDriveAttachMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setDriveUploading(false);
    }
  };

  const uploadFilesToMediaSlot = useCallback(
    async (slot: SongMediaUploadSlot, files: File[]) => {
      const list = files.filter(Boolean);
      if (list.length === 0) return;
      setDriveUploading(true);
      setDriveAttachMsg(null);
      const jobLabel =
        list.length === 1
          ? slot === 'listen'
            ? 'Uploading reference file…'
            : slot === 'play'
              ? 'Uploading backing file…'
              : slot === 'charts'
                ? 'Uploading chart…'
                : 'Uploading take…'
          : `Uploading ${list.length} files…`;
      try {
        await withBlockingJob(jobLabel, async () => {
          for (const file of list) {
            switch (slot) {
              case 'listen':
                await uploadReferenceDriveFile(file);
                break;
              case 'play':
                await uploadBackingDriveFile(file);
                break;
              case 'charts':
                await uploadChartDriveFile(file);
                break;
              case 'takes':
                await uploadTakeDriveFile(file);
                break;
            }
          }
          setDriveAttachMsg(
            list.length === 1
              ? slot === 'listen'
                ? 'Reference file linked.'
                : slot === 'play'
                  ? 'Backing file linked.'
                  : slot === 'charts'
                    ? 'Chart linked.'
                    : 'Take uploaded.'
              : `${list.length} files uploaded.`,
          );
        });
      } catch (err) {
        setDriveAttachMsg(err instanceof Error ? err.message : String(err));
      } finally {
        setDriveUploading(false);
      }
    },
    [
      withBlockingJob,
      uploadReferenceDriveFile,
      uploadBackingDriveFile,
      uploadChartDriveFile,
      uploadTakeDriveFile,
    ],
  );

  if (!draft) {
    const emptySlots: SongPageMediaSlots = {
      referenceRecordings: null,
      backingTracks: null,
      charts: null,
      chartsFooter: null,
      takes: null,
    };
    return {
      catalogStrip: null,
      spotifyAlerts: null,
      mediaSlots: emptySlots,
      searchWebFooter: null,
      spotifyOptions,
      spotifyLoading,
      applySpotifyDataSourceFromTrack,
      resolveSpotifyDataSourcePaste,
      uploadFilesToMediaSlot: async () => {},
    };
  }

  const dataSpotifyId = spotifyDataSourceTrackId(draft);
  const primaryRefId =
    (draft.referenceLinks ?? []).find((r) => r.isPrimaryReference)?.id ??
    (draft.referenceLinks ?? [])[0]?.id ??
    '';
  const primaryBackingId =
    (draft.backingLinks ?? []).find((l) => l.isPrimaryBacking)?.id ??
    (draft.backingLinks ?? [])[0]?.id ??
    '';
  const resourceTitle = draft.title.trim() || 'song';
  const resourceArtist = draft.artist.trim() || 'artist';
  const primaryChartDriveFileId = primaryChartAttachment(draft)?.driveFileId ?? '';
  const chartAttachments = [...effectiveSongAttachments(draft).filter((a) => a.kind === 'chart')].sort((a, b) => {
    if (a.isPrimaryChart && !b.isPrimaryChart) return -1;
    if (!a.isPrimaryChart && b.isPrimaryChart) return 1;
    return 0;
  });
  const recordingAttachments = effectiveSongAttachments(draft).filter((a) => a.kind === 'recording');

  const songSpotifyAlerts =
    !clientId || (clientId && !spotifyLinked) || spotifyError || spotifyMetaMessage ? (
      <Stack spacing={1.5} sx={{ width: 1 }}>
        {!clientId ? (
          <Alert severity="info">
            Set <code>VITE_SPOTIFY_CLIENT_ID</code> to link Spotify tracks.
          </Alert>
        ) : null}
        {clientId && !spotifyLinked ? (
          <EncoreSpotifyConnectionChip description="Connect Spotify to search tracks and refresh metadata." />
        ) : null}
        {spotifyError ? <Alert severity="error">{spotifyError}</Alert> : null}
        {spotifyMetaMessage ? <Alert severity="success">{spotifyMetaMessage}</Alert> : null}
      </Stack>
    ) : null;

  const songCatalogLabelInline = (
    <Stack
      direction="row"
      alignItems="center"
      spacing={0.25}
      sx={{ flexShrink: 0, color: 'text.secondary' }}
    >
      <Typography
        component="span"
        variant="caption"
        sx={{ fontWeight: 700, letterSpacing: '0.06em', color: 'inherit' }}
      >
        Song info source
      </Typography>
      <Tooltip title={SONG_INFO_SOURCE_TOOLTIP} enterDelay={300}>
        <IconButton
          size="small"
          aria-label={SONG_INFO_SOURCE_ICON_ARIA}
          sx={{ color: 'text.secondary', p: 0.25 }}
        >
          <InfoOutlinedIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
    </Stack>
  );

  const songCatalogStrip = (
<>
                {/*
                  Single-line layout: label + info-tooltip live inline with the Spotify resource
                  chip (or empty-state caption / autocomplete). Previous layout stacked the label
                  on its own row above an oversized resource shell, eating two rows of vertical
                  space for what is conceptually one labeled value.
                */}
                {isNew && !dataSpotifyId ? (
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    flexWrap="wrap"
                    useFlexGap
                    sx={{ width: 1, minWidth: 0, py: 0.25 }}
                  >
                    {songCatalogLabelInline}
                    <Typography variant="caption" color="text.secondary">
                      None set. Use the Title field above.
                    </Typography>
                  </Stack>
                ) : null}
                {isNew && dataSpotifyId ? (
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    flexWrap="wrap"
                    useFlexGap
                    sx={{ width: 1, minWidth: 0, py: 0.25 }}
                  >
                    {songCatalogLabelInline}
                    <Typography variant="caption" color="text.secondary">
                      Linked from Title search.
                    </Typography>
                    <Tooltip title="Open song info source in Spotify">
                      <IconButton
                        size="small"
                        component="a"
                        href={`https://open.spotify.com/track/${encodeURIComponent(dataSpotifyId)}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Open song info source in Spotify"
                        sx={extLinkIconBtnSx}
                      >
                        <SpotifyBrandIcon sx={{ fontSize: 18, opacity: 0.9 }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                ) : null}

                {spotifyLinked && clientId && !isNew ? (
                  dataSpotifyId && !spotifyCatalogSwapOpen ? (
                    <Stack
                      direction="row"
                      alignItems="center"
                      flexWrap="wrap"
                      columnGap={1}
                      rowGap={0.75}
                      useFlexGap
                      sx={{ width: 1, minWidth: 0, py: 0.25 }}
                    >
                      {songCatalogLabelInline}
                      <Box sx={(t) => songPageResourceRowShellSx(t, false)}>
                        <Stack
                          direction="row"
                          alignItems="center"
                          flexWrap="nowrap"
                          columnGap={0.75}
                          sx={{ minWidth: 0 }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'row',
                              alignItems: 'center',
                              minWidth: 0,
                              flex: '1 1 200px',
                            }}
                          >
                            <EncoreStreamingHoverCard
                              kind="spotify"
                              spotifyTrackId={dataSpotifyId}
                              fallbackTitle={spotifyCatalogDisplayLabel(draft, dataSpotifyId)}
                              fallbackSubtitle={draft.artist?.trim() ?? ''}
                              clientId={clientId}
                              spotifyLinked={spotifyLinked}
                            >
                              <Box
                                component="a"
                                href={`https://open.spotify.com/track/${encodeURIComponent(dataSpotifyId)}`}
                                target="_blank"
                                rel="noreferrer"
                                aria-label="Open song info source in Spotify"
                                sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                  minWidth: 0,
                                  maxWidth: '100%',
                                  textDecoration: 'none',
                                  color: 'inherit',
                                  cursor: 'pointer',
                                }}
                              >
                                <SpotifyBrandIcon sx={{ fontSize: 15, flexShrink: 0, opacity: 0.88 }} aria-hidden />
                                <Typography
                                  variant="caption"
                                  noWrap
                                  sx={{
                                    minWidth: 0,
                                    flex: '1 1 auto',
                                    fontWeight: 600,
                                    fontSize: '0.8125rem',
                                  }}
                                  title={spotifyCatalogDisplayLabel(draft, dataSpotifyId)}
                                >
                                  {spotifyCatalogDisplayLabel(draft, dataSpotifyId)}
                                </Typography>
                              </Box>
                            </EncoreStreamingHoverCard>
                          </Box>
                          <Tooltip title="Refresh title, artist, and artwork from the song info source">
                            <span>
                              <IconButton
                                size="small"
                                aria-label="Refresh from song info source"
                                disabled={spotifyMetaLoading}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => void fillFromSpotify()}
                                sx={extLinkIconBtnSx}
                              >
                                {spotifyMetaLoading ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <RefreshIcon sx={{ fontSize: 16 }} />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Change song info source">
                            <IconButton
                              size="small"
                              aria-label="Change song info source"
                              onClick={() => {
                                setSpotifyCatalogSwapOpen(true);
                                setSpotifyQuery(`${draft.title} ${draft.artist}`.trim());
                              }}
                              sx={extLinkIconBtnSx}
                            >
                              <SwapHorizIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Box>
                    </Stack>
                  ) : (
                    <Stack spacing={1} sx={{ width: 1 }}>
                      {dataSpotifyId && spotifyCatalogSwapOpen ? (
                        <Stack direction="row" justifyContent="flex-end" alignItems="center">
                          <Button
                            size="small"
                            onClick={() => setSpotifyCatalogSwapOpen(false)}
                            sx={{ textTransform: "none" }}
                          >
                            Cancel
                          </Button>
                        </Stack>
                      ) : null}
                      <EncoreSpotifySearchOrPasteField
                        options={spotifyOptions}
                        loading={spotifyLoading}
                        inputValue={spotifyQuery}
                        onInputChange={setSpotifyQuery}
                        getOptionLabel={trackLabel}
                        onPickTrack={applySpotifyDataSourceFromTrack}
                        onPasteResolve={() => void resolveSpotifyDataSourcePaste()}
                        label="Set song info source (Spotify)"
                        inputEndAdornment={
                          dataSpotifyId ? (
                            <>
                              <Tooltip title="Open song info source in Spotify">
                                <IconButton
                                  size="small"
                                  component="a"
                                  href={`https://open.spotify.com/track/${encodeURIComponent(dataSpotifyId)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  aria-label="Open song info source in Spotify"
                                  sx={{ ...extLinkIconBtnSx, mr: 0.5 }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <SpotifyBrandIcon sx={{ fontSize: 18, opacity: 0.9 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Refresh title, artist, and artwork from the song info source">
                                <span>
                                  <IconButton
                                    size="small"
                                    aria-label="Refresh from song info source"
                                    disabled={spotifyMetaLoading}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void fillFromSpotify();
                                    }}
                                    sx={{ ...extLinkIconBtnSx, mr: 0.5 }}
                                  >
                                    {spotifyMetaLoading ? (
                                      <CircularProgress size={16} />
                                    ) : (
                                      <RefreshIcon fontSize="small" />
                                    )}
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </>
                          ) : null
                        }
                      />
                    </Stack>
                  )
                ) : null}

</>
  );

  const songMediaSlotReference = (
<>
              <Stack spacing={0.7} sx={{ width: 1 }}>
                <SongPageSectionHeading
                  title="Reference recordings"
                  tooltip="Study and comparison tracks. Pick one primary reference (Spotify or YouTube). When a song info source is set, that Spotify track also appears here."
                  infoAriaLabel="About reference recordings"
                />

                <Stack
                  direction="row"
                  flexWrap="wrap"
                  alignItems="center"
                  gap={0.5}
                  rowGap={0.5}
                  useFlexGap
                  sx={{ width: 1 }}
                >
                  {(draft.referenceLinks ?? []).length === 0 ? (
                    <Typography variant="caption" color="text.secondary">
                      None yet.
                    </Typography>
                  ) : null}
                  {(draft.referenceLinks ?? []).map((link) => {
                    const isPrimary = link.id === primaryRefId;
                    const isCatalog =
                      link.source === 'spotify' &&
                      dataSpotifyId &&
                      link.spotifyTrackId?.trim() === dataSpotifyId;
                    const openUrl =
                      link.source === 'spotify' && link.spotifyTrackId
                        ? `https://open.spotify.com/track/${encodeURIComponent(link.spotifyTrackId)}`
                        : link.source === 'youtube'
                          ? (youtubeWatchUrlFromMediaLink(link) ?? undefined)
                          : undefined;
                    const openAria =
                      link.source === 'spotify' ? 'Open in Spotify' : 'Open in YouTube';
                    const hoverStripWrapper =
                      link.source === 'spotify' && link.spotifyTrackId?.trim()
                        ? (inner: ReactElement) => (
                            <EncoreStreamingHoverCard
                              kind="spotify"
                              spotifyTrackId={link.spotifyTrackId}
                              fallbackTitle={link.label?.trim() || formatMediaLinkCaption(link)}
                              clientId={clientId}
                              spotifyLinked={spotifyLinked}
                            >
                              {inner}
                            </EncoreStreamingHoverCard>
                          )
                        : link.source === 'youtube'
                          ? (inner: ReactElement) => (
                              <EncoreStreamingHoverCard
                                kind="youtube"
                                youtubeWatchUrl={youtubeWatchUrlFromMediaLink(link)}
                                fallbackTitle={link.label?.trim() || formatMediaLinkCaption(link)}
                                clientId={clientId}
                                spotifyLinked={spotifyLinked}
                              >
                                {inner}
                              </EncoreStreamingHoverCard>
                            )
                          : undefined;
                    return (
                      <EncoreAudioResourceNotesWrapper
                        key={link.id}
                        notes={link.notes ?? ''}
                        resourceLabel="Notes for this reference"
                        onNotesChange={(value) =>
                          setDraft((d) => {
                            if (!d) return d;
                            const next = (d.referenceLinks ?? []).map((x) =>
                              x.id === link.id ? { ...x, notes: value || undefined } : x,
                            );
                            return { ...d, referenceLinks: next };
                          })
                        }
                      >
                        <EncoreMediaLinkRow
                          link={link}
                          slot="reference"
                          isPrimary={isPrimary}
                          onMakePrimary={() =>
                            setDraft((d) => (d ? setPrimaryReferenceLinkId(d, link.id) : d))
                          }
                          openUrl={openUrl}
                          openAriaLabel={openAria}
                          onRemove={() =>
                            setDraft((d) => (d ? removeMediaLinkById(d, link.id) : d))
                          }
                          trailing={
                            isCatalog ? (
                              <Tooltip title={SONG_INFO_SOURCE_TOOLTIP}>
                                <IconButton
                                  size="small"
                                  aria-label={SONG_INFO_SOURCE_ICON_ARIA}
                                  sx={{
                                    color: 'text.secondary',
                                    p: 0.125,
                                    ml: 0.125,
                                    minWidth: 26,
                                    height: 26,
                                    '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
                                  }}
                                >
                                  <InfoOutlinedIcon sx={{ fontSize: 15 }} />
                                </IconButton>
                              </Tooltip>
                            ) : null
                          }
                          hoverStripWrapper={hoverStripWrapper}
                        />
                      </EncoreAudioResourceNotesWrapper>
                    );
                  })}
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    startIcon={<AddIcon sx={{ fontSize: 17 }} />}
                    onClick={(e) => setReferenceAddMenuAnchor(e.currentTarget)}
                    sx={{ flexShrink: 0, textTransform: 'none', borderColor: 'divider', fontSize: '0.8125rem' }}
                  >
                    Add audio
                  </Button>
                  <Menu
                    open={Boolean(referenceAddMenuAnchor)}
                    anchorEl={referenceAddMenuAnchor}
                    onClose={() => setReferenceAddMenuAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                  >
                    <MenuItem
                      onClick={() => {
                        const el = referenceAddMenuAnchor;
                        setReferenceAddMenuAnchor(null);
                        setReferenceAddKind('spotify');
                        const seed = `${draft?.title ?? ''} ${draft?.artist ?? ''}`.trim();
                        setRefSpotifyQuery((q) => (q.trim() ? q : seed));
                        if (el) queueMicrotask(() => setReferenceAddAnchor(el));
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <SpotifyBrandIcon sx={{ fontSize: 18 }} aria-hidden />
                      </ListItemIcon>
                      <ListItemText primary="Spotify" secondary="Search or paste URL" />
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        const el = referenceAddMenuAnchor;
                        setReferenceAddMenuAnchor(null);
                        setReferenceAddKind('youtube');
                        if (el) queueMicrotask(() => setReferenceAddAnchor(el));
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <YouTubeBrandIcon sx={{ fontSize: 18 }} aria-hidden />
                      </ListItemIcon>
                      <ListItemText primary="YouTube" secondary="Paste watch URL or id" />
                    </MenuItem>
                    <MenuItem
                      disabled={!googleAccessToken || !referenceUploadFolderId || driveUploading}
                      onClick={() => {
                        setReferenceAddMenuAnchor(null);
                        referenceDriveInputRef.current?.click();
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <CloudUploadIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Upload file" secondary="Audio or video" />
                    </MenuItem>
                  </Menu>
                  <input
                    ref={referenceDriveInputRef}
                    type="file"
                    hidden
                    accept="audio/*,video/*"
                    onChange={(ev) => void onReferenceDriveFile(ev)}
                  />
                </Stack>

                <Popover
                  open={Boolean(referenceAddAnchor)}
                  anchorEl={referenceAddAnchor}
                  onClose={closeReferenceAdd}
                  anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                  transformOrigin={{ vertical: "top", horizontal: "left" }}
                  PaperProps={{
                    sx: {
                      mt: 0.75,
                      p: 2,
                      width: { xs: "min(calc(100vw - 24px), 380px)", sm: 380 },
                    },
                  }}
                >
                  <Typography variant="subtitle2" sx={{ mb: 1.25, fontWeight: 700 }}>
                    Add reference track
                  </Typography>
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={referenceAddKind}
                    onChange={(_, v) => {
                      if (v) setReferenceAddKind(v);
                    }}
                    aria-label="Track source"
                    sx={{ mb: 1.25 }}
                  >
                    <ToggleButton value="spotify" sx={{ textTransform: "none" }}>
                      Spotify
                    </ToggleButton>
                    <ToggleButton value="youtube" sx={{ textTransform: "none" }}>
                      YouTube
                    </ToggleButton>
                  </ToggleButtonGroup>
                  {referenceAddKind === "spotify" ? (
                    spotifyLinked && clientId ? (
                      <EncoreSpotifySearchOrPasteField
                        options={spotifyOptions}
                        loading={spotifyLoading}
                        inputValue={refSpotifyQuery}
                        onInputChange={setRefSpotifyQuery}
                        getOptionLabel={trackLabel}
                        onPickTrack={(t) => {
                          appendReferenceSpotifyFromTrack(t);
                          closeReferenceAdd();
                        }}
                        onPasteResolve={() => void resolveRefSpotifyPaste()}
                        label="Find on Spotify"
                        placeholder="Title, artist, or paste URL"
                      />
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Connect Spotify to search tracks.
                      </Typography>
                    )
                  ) : (
                    <EncoreYouTubePasteField
                      value={youtubeRefPaste}
                      onChange={setYoutubeRefPaste}
                      trailingAction={
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => {
                            if (!draft) return;
                            const raw = youtubeRefPaste.trim();
                            if (!raw) return;
                            const n = appendYoutubeReferenceLink(draft, raw);
                            if (!n) return;
                            setDraft(n);
                            closeReferenceAdd();
                          }}
                          sx={{ flexShrink: 0, mt: 0.5 }}
                        >
                          Add
                        </Button>
                      }
                    />
                  )}
                </Popover>
              </Stack>
</>
  );

  const songMediaSlotBacking = (
<>
              <Stack spacing={0.7} sx={{ width: 1 }}>
                <SongPageSectionHeading
                  title="Backing tracks"
                  tooltip="Karaoke or practice playback, separate from reference listening. Pick one primary backing when the app needs a default practice track."
                  infoAriaLabel="About backing tracks"
                />

                <Stack
                  direction="row"
                  flexWrap="wrap"
                  alignItems="center"
                  gap={0.5}
                  rowGap={0.5}
                  useFlexGap
                  sx={{ width: 1 }}
                >
                  {(draft.backingLinks ?? []).length === 0 ? (
                    <Typography variant="caption" color="text.secondary">
                      None yet.
                    </Typography>
                  ) : null}
                  {(draft.backingLinks ?? []).map((link) => {
                    const isPrimary = link.id === primaryBackingId;
                    const openUrl =
                      link.source === 'spotify' && link.spotifyTrackId
                        ? `https://open.spotify.com/track/${encodeURIComponent(link.spotifyTrackId)}`
                        : link.source === 'youtube'
                          ? (youtubeWatchUrlFromMediaLink(link) ?? undefined)
                          : undefined;
                    const openAria =
                      link.source === 'spotify' ? 'Open backing in Spotify' : 'Open backing in YouTube';
                    const hoverStripWrapper =
                      link.source === 'spotify' && link.spotifyTrackId?.trim()
                        ? (inner: ReactElement) => (
                            <EncoreStreamingHoverCard
                              kind="spotify"
                              spotifyTrackId={link.spotifyTrackId}
                              fallbackTitle={link.label?.trim() || formatMediaLinkCaption(link)}
                              clientId={clientId}
                              spotifyLinked={spotifyLinked}
                            >
                              {inner}
                            </EncoreStreamingHoverCard>
                          )
                        : link.source === 'youtube'
                          ? (inner: ReactElement) => (
                              <EncoreStreamingHoverCard
                                kind="youtube"
                                youtubeWatchUrl={youtubeWatchUrlFromMediaLink(link)}
                                fallbackTitle={link.label?.trim() || formatMediaLinkCaption(link)}
                                clientId={clientId}
                                spotifyLinked={spotifyLinked}
                              >
                                {inner}
                              </EncoreStreamingHoverCard>
                            )
                          : undefined;
                    return (
                      <EncoreAudioResourceNotesWrapper
                        key={link.id}
                        notes={link.notes ?? ''}
                        resourceLabel="Notes for this backing track"
                        onNotesChange={(value) =>
                          setDraft((d) => {
                            if (!d) return d;
                            const next = (d.backingLinks ?? []).map((x) =>
                              x.id === link.id ? { ...x, notes: value || undefined } : x,
                            );
                            return { ...d, backingLinks: next };
                          })
                        }
                      >
                        <EncoreMediaLinkRow
                          link={link}
                          slot="backing"
                          isPrimary={isPrimary}
                          onMakePrimary={() =>
                            setDraft((d) => (d ? setPrimaryBackingLinkId(d, link.id) : d))
                          }
                          openUrl={openUrl}
                          openAriaLabel={openAria}
                          onRemove={() =>
                            setDraft((d) => (d ? removeMediaLinkById(d, link.id) : d))
                          }
                          hoverStripWrapper={hoverStripWrapper}
                        />
                      </EncoreAudioResourceNotesWrapper>
                    );
                  })}
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    startIcon={<AddIcon sx={{ fontSize: 17 }} />}
                    onClick={(e) => setBackingAddMenuAnchor(e.currentTarget)}
                    sx={{ flexShrink: 0, textTransform: 'none', borderColor: 'divider', fontSize: '0.8125rem' }}
                  >
                    Add audio
                  </Button>
                  <Menu
                    open={Boolean(backingAddMenuAnchor)}
                    anchorEl={backingAddMenuAnchor}
                    onClose={() => setBackingAddMenuAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                  >
                    <MenuItem
                      onClick={() => {
                        const el = backingAddMenuAnchor;
                        setBackingAddMenuAnchor(null);
                        setBackingAddKind('spotify');
                        const seed = `${draft?.title ?? ''} ${draft?.artist ?? ''}`.trim();
                        setBackingSpotifyQuery((q) => (q.trim() ? q : seed));
                        if (el) queueMicrotask(() => setBackingAddAnchor(el));
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <SpotifyBrandIcon sx={{ fontSize: 18 }} aria-hidden />
                      </ListItemIcon>
                      <ListItemText primary="Spotify" secondary="Search or paste URL" />
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        const el = backingAddMenuAnchor;
                        setBackingAddMenuAnchor(null);
                        setBackingAddKind('youtube');
                        if (el) queueMicrotask(() => setBackingAddAnchor(el));
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <YouTubeBrandIcon sx={{ fontSize: 18 }} aria-hidden />
                      </ListItemIcon>
                      <ListItemText primary="YouTube" secondary="Paste watch URL or id" />
                    </MenuItem>
                    <MenuItem
                      disabled={!googleAccessToken || !backingUploadFolderId || driveUploading}
                      onClick={() => {
                        setBackingAddMenuAnchor(null);
                        backingDriveInputRef.current?.click();
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <CloudUploadIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Upload file" secondary="Audio or video" />
                    </MenuItem>
                  </Menu>
                  <input
                    ref={backingDriveInputRef}
                    type="file"
                    hidden
                    accept="audio/*,video/*"
                    onChange={(ev) => void onBackingDriveFile(ev)}
                  />
                </Stack>

                <Popover
                  open={Boolean(backingAddAnchor)}
                  anchorEl={backingAddAnchor}
                  onClose={closeBackingAdd}
                  anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                  transformOrigin={{ vertical: "top", horizontal: "left" }}
                  PaperProps={{
                    sx: {
                      mt: 0.75,
                      p: 2,
                      width: { xs: "min(calc(100vw - 24px), 380px)", sm: 380 },
                    },
                  }}
                >
                  <Typography variant="subtitle2" sx={{ mb: 1.25, fontWeight: 700 }}>
                    Add backing track
                  </Typography>
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={backingAddKind}
                    onChange={(_, v) => {
                      if (v) setBackingAddKind(v);
                    }}
                    aria-label="Backing track source"
                    sx={{ mb: 1.25 }}
                  >
                    <ToggleButton value="spotify" sx={{ textTransform: "none" }}>
                      Spotify
                    </ToggleButton>
                    <ToggleButton value="youtube" sx={{ textTransform: "none" }}>
                      YouTube
                    </ToggleButton>
                  </ToggleButtonGroup>
                  {backingAddKind === "spotify" ? (
                    spotifyLinked && clientId ? (
                      <EncoreSpotifySearchOrPasteField
                        options={spotifyOptions}
                        loading={spotifyLoading}
                        inputValue={backingSpotifyQuery}
                        onInputChange={setBackingSpotifyQuery}
                        getOptionLabel={trackLabel}
                        onPickTrack={(t) => {
                          appendBackingSpotifyFromTrack(t);
                          closeBackingAdd();
                        }}
                        onPasteResolve={() => void resolveBackingSpotifyPaste()}
                        label="Find on Spotify"
                        placeholder="Title, artist, or paste URL"
                      />
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Connect Spotify to search tracks.
                      </Typography>
                    )
                  ) : (
                    <EncoreYouTubePasteField
                      value={youtubeBackPaste}
                      onChange={setYoutubeBackPaste}
                      trailingAction={
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => {
                            if (!draft) return;
                            const raw = youtubeBackPaste.trim();
                            if (!raw) return;
                            const n = appendYoutubeBackingLink(draft, raw);
                            if (!n) return;
                            setDraft(n);
                            closeBackingAdd();
                          }}
                          sx={{ flexShrink: 0, mt: 0.5 }}
                        >
                          Add
                        </Button>
                      }
                    />
                  )}
                </Popover>
              </Stack>
</>
  );

  const songMediaSlotCharts = (
<>
              <Stack spacing={0.7} sx={{ width: 1 }}>
                <SongPageSectionHeading
                  title="Charts"
                  tooltip="Pick one primary chart for Practice quick links and default sheet export."
                  infoAriaLabel="About charts"
                />
                <Stack
                  direction="row"
                  flexWrap="wrap"
                  gap={0.5}
                  rowGap={0.5}
                  alignItems="center"
                  useFlexGap
                  sx={{ width: 1 }}
                >
                  {chartAttachments.map((a) => {
                    const isPrimary = Boolean(primaryChartDriveFileId && a.driveFileId === primaryChartDriveFileId);
                    const caption = a.label ?? a.driveFileId.slice(0, 8);
                    return (
                      <EncoreAudioResourceNotesWrapper
                        key={a.driveFileId}
                        notes={a.notes ?? ''}
                        resourceLabel="Notes for this chart"
                        onNotesChange={(value) =>
                          setDraft((d) => {
                            if (!d) return d;
                            const next = (d.attachments ?? []).map((x) =>
                              x.kind === 'chart' && x.driveFileId === a.driveFileId
                                ? { ...x, notes: value || undefined }
                                : x,
                            );
                            return { ...d, attachments: next };
                          })
                        }
                      >
                        <EncoreMediaLinkRow
                          slot="chart"
                          isPrimary={isPrimary}
                          caption={caption}
                          fullCaption={a.label ?? a.driveFileId}
                          onMakePrimary={() =>
                            setDraft((d) => (d ? setPrimaryChartByDriveFileId(d, a.driveFileId) : d))
                          }
                          openUrl={driveFileWebUrl(a.driveFileId)}
                          openAriaLabel="Open chart in new tab"
                        />
                      </EncoreAudioResourceNotesWrapper>
                    );
                  })}
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    startIcon={<AddIcon sx={{ fontSize: 17 }} />}
                    disabled={!googleAccessToken || !chartUploadFolderId || driveUploading}
                    onClick={(e) => setChartAddAnchor(e.currentTarget)}
                    sx={{
                      textTransform: 'none',
                      borderColor: 'divider',
                      fontSize: '0.8125rem',
                    }}
                  >
                    Add chart
                  </Button>
                  <Menu
                    anchorEl={chartAddAnchor}
                    open={Boolean(chartAddAnchor)}
                    onClose={() => setChartAddAnchor(null)}
                  >
                    <MenuItem
                      onClick={() => {
                        setChartAddAnchor(null);
                        queueMicrotask(() =>
                          chartFileInputRef.current?.click()
                        );
                      }}
                      disabled={driveUploading || !chartUploadFolderId}
                    >
                      <ListItemIcon>
                        <CloudUploadIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Upload file…" />
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        setChartAddAnchor(null);
                        if (chartUploadFolderId) {
                          window.open(driveFolderWebUrl(chartUploadFolderId), '_blank', 'noopener,noreferrer');
                        }
                      }}
                      disabled={!chartUploadFolderId}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <GoogleDriveBrandIcon sx={{ fontSize: 20 }} aria-hidden />
                      </ListItemIcon>
                      <ListItemText
                        primary="Open charts folder in Drive"
                        secondary="Add a chart by pasting a file link, or use Upload file"
                      />
                    </MenuItem>
                  </Menu>
                  <input
                    ref={chartFileInputRef}
                    type="file"
                    hidden
                    accept=".pdf,.xml,.musicxml,.mxl,image/*"
                    onChange={(e) => {
                      void handleDriveChartUpload(e.target.files?.[0]);
                      setChartAddAnchor(null);
                      e.target.value = '';
                    }}
                  />
                </Stack>
              </Stack>
</>
  );

  const songMediaSlotChartsFooter = (
<>
              {driveAttachMsg ? (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  sx={{ lineHeight: 1.55 }}
                >
                  {driveAttachMsg}
                </Typography>
              ) : null}

</>
  );

  const songMediaSlotTakes = (
<>
              <Stack spacing={0.7} sx={{ width: 1 }}>
                <SongPageSectionHeading
                  title="Takes"
                  tooltip="Audio or video you uploaded from practice (stored in Drive). Same attachments as on the Practice screen."
                  infoAriaLabel="About takes"
                />
                <Stack
                  direction="row"
                  flexWrap="wrap"
                  alignItems="center"
                  gap={0.5}
                  rowGap={0.5}
                  useFlexGap
                  sx={{ width: 1 }}
                >
                  {recordingAttachments.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">
                      None yet.
                    </Typography>
                  ) : null}
                  {recordingAttachments.map((a) => (
                    <EncoreAudioResourceNotesWrapper
                      key={a.driveFileId}
                      notes={a.notes ?? ''}
                      resourceLabel="Notes for this take"
                      onNotesChange={(value) =>
                        setDraft((d) => {
                          if (!d) return d;
                          const next = (d.attachments ?? []).map((x) =>
                            x.kind === 'recording' && x.driveFileId === a.driveFileId
                              ? { ...x, notes: value || undefined }
                              : x,
                          );
                          return { ...d, attachments: next };
                        })
                      }
                    >
                      <EncoreMediaLinkRow
                        slot="chart"
                        source="drive"
                        isPrimary={false}
                        caption={a.label ?? 'Take'}
                        fullCaption={a.label ?? a.driveFileId}
                        openUrl={driveFileWebUrl(a.driveFileId)}
                        openAriaLabel="Open take in new tab"
                      />
                    </EncoreAudioResourceNotesWrapper>
                  ))}
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    startIcon={<AddIcon sx={{ fontSize: 17 }} />}
                    disabled={!googleAccessToken || !takesUploadFolderId || driveUploading}
                    onClick={() => takesDriveInputRef.current?.click()}
                    sx={{
                      textTransform: 'none',
                      borderColor: 'divider',
                      fontSize: '0.8125rem',
                    }}
                  >
                    Upload take
                  </Button>
                  <input
                    ref={takesDriveInputRef}
                    type="file"
                    hidden
                    accept="audio/*,video/*"
                    onChange={(ev) => void onTakesDriveFile(ev)}
                  />
                </Stack>
              </Stack>
</>
  );

  const songSearchWebFooter =
    draft.title.trim().length > 0 ? (
      <Stack
        direction="row"
        flexWrap="wrap"
        alignItems="baseline"
        columnGap={1}
        rowGap={0.25}
        useFlexGap
        sx={{ width: 1, minWidth: 0 }}
      >
        {/*
          Single-line layout: label, then text-only links separated by middots. YouTube renders as
          plain text (not a logo) so the row reads as a uniform list of search providers and packs
          tighter into the album-art column.
        */}
        <Typography
          component="span"
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 700, letterSpacing: '0.08em', mr: 0.5 }}
        >
          Search the web
        </Typography>
        <Link
          href={encoreUltimateGuitarSearchUrl(resourceTitle, resourceArtist)}
          target="_blank"
          rel="noreferrer"
          underline="hover"
          variant="caption"
          color="text.secondary"
          aria-label="Search Ultimate Guitar for this song"
          sx={{ fontWeight: 500 }}
        >
          Ultimate Guitar
        </Link>
        <Typography variant="caption" color="text.disabled" aria-hidden>
          ·
        </Typography>
        <Link
          href={encoreGeniusSearchUrl(resourceTitle, resourceArtist)}
          target="_blank"
          rel="noreferrer"
          underline="hover"
          variant="caption"
          color="text.secondary"
          aria-label="Search Genius for this song"
          sx={{ fontWeight: 500 }}
        >
          Genius
        </Link>
        <Typography variant="caption" color="text.disabled" aria-hidden>
          ·
        </Typography>
        <Link
          href={encoreYouTubeSearchUrl(resourceTitle, resourceArtist)}
          target="_blank"
          rel="noreferrer"
          underline="hover"
          variant="caption"
          color="text.secondary"
          aria-label="Search YouTube for this song"
          sx={{ fontWeight: 500 }}
        >
          YouTube
        </Link>
      </Stack>
    ) : null;

  const songMediaSlots: SongPageMediaSlots = {
    referenceRecordings: songMediaSlotReference,
    backingTracks: songMediaSlotBacking,
    charts: songMediaSlotCharts,
    chartsFooter: songMediaSlotChartsFooter,
    takes: songMediaSlotTakes,
  };

  return {
    catalogStrip: songCatalogStrip,
    spotifyAlerts: songSpotifyAlerts,
    mediaSlots: songMediaSlots,
    searchWebFooter: songSearchWebFooter,
    spotifyOptions,
    spotifyLoading,
    applySpotifyDataSourceFromTrack,
    resolveSpotifyDataSourcePaste,
    uploadFilesToMediaSlot,
  };
}
