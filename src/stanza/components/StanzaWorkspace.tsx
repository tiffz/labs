import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import CloseIcon from '@mui/icons-material/Close';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VolumeOffOutlinedIcon from '@mui/icons-material/VolumeOffOutlined';
import VolumeUpOutlinedIcon from '@mui/icons-material/VolumeUpOutlined';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import AppLinearVolumeSlider from '../../shared/components/AppLinearVolumeSlider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import { alpha, type Theme } from '@mui/material/styles';
import AppTooltip from '../../shared/components/AppTooltip';
import MetronomeToggleButton from '../../shared/components/MetronomeToggleButton';
import { useLabsUndo } from '../../shared/undo/LabsUndoContext';
import {
  stanzaDb,
  type StanzaSegmentMetronomeCalibration,
  type StanzaSong,
  type StanzaStemTrack,
  type StanzaTake,
} from '../db/stanzaDb';
import {
  buildLocalAudioStanzaSong,
  isAudioFileForStanza,
  isStanzaBlobLikeVideo,
  stanzaSongTitleFromFileName,
} from '../db/stanzaLocalAudioImport';
import {
  readStanzaLastSelectedSongId,
  writeStanzaLastSelectedSongId,
} from '../db/stanzaLastSelectedSong';
import { useStanzaFileDrop } from '../hooks/useStanzaFileDrop';
import { canResolveYoutubePaste, resolveYoutubePaste } from '../utils/youtubePasteImport';
import {
  areContiguousSegmentIndices,
  deletableBoundaryMarkerAtTime,
  deriveSegments,
  ensureMarkerIds,
  findSegmentIndexAtTime,
  STANZA_TIME_EPS,
} from '../utils/segments';
import {
  applySectionSelectionExtend,
  computeLoopHull,
  STANZA_LOOP_EPS,
  suggestMusicalLoopPadSec,
  type StanzaPlaybackLoopMode,
  type StanzaSectionSelectionExtend,
} from '../utils/stanzaPlaybackLoop';
import { useStanzaLocalPlaybackObjectUrls } from '../hooks/useStanzaLocalPlaybackObjectUrls';
import {
  stanzaPrimaryLocalBlobKey,
  stanzaStemBlobIdentityKeySorted,
  stanzaStemUrlKeyFromSong,
} from '../utils/stanzaPlaybackBlobUrlKeys';
import { readPositiveFiniteMediaDurationSec } from '../utils/stanzaMediaDuration';
import { primaryPlaybackMuted, stanzaSanitizeLinearBusGain, stemPlaybackMuted } from '../utils/stanzaPlaybackMute';
import { migrateStanzaSongSegmentKeysIfNeeded } from '../utils/stanzaSegmentMigration';
import {
  probeFileAudioDurationSeconds,
  STANZA_STEM_DURATION_MATCH_EPS_SEC,
} from '../utils/probeFileAudioDuration';
import {
  backfillStanzaVideoThumbnailIfNeeded,
  pickThumbnailSeekSec,
} from '../utils/stanzaVideoThumbnail';
import { fetchYoutubeOEmbedTitle, youtubeMqThumbnailUrl } from '../utils/stanzaYoutubeMeta';
import { loadDriveFileAsStanzaLocalBlob } from '../drive/loadDriveSourceForStanza';
import { LabsGoogleInteractiveAuthRequiredError, LABS_GOOGLE_INTERACTIVE_DRIVE_AUTH_HINT } from '../../shared/google/labsGoogleDriveAccess';
import {
  hasStanzaDriveDeepLinkQuery,
  readStanzaDriveBootstrapFromLocation,
  replaceStanzaPlaybackUrlSearchParams,
} from '../utils/stanzaDriveUrlParams';
import { readYoutubeVFromLocation, stripStanzaYoutubeSearchParamPreservingDrive } from '../utils/stanzaUrlYoutube';
import type { GuidedRegimen } from '../utils/conductorRegimen';
import StanzaYouTubePlayer, { type StanzaYouTubeController } from './StanzaYouTubePlayer';
import StanzaAccountMenu from './StanzaAccountMenu';
import StanzaTimeline from './StanzaTimeline';
import { clampStanzaPlaybackRate } from '../utils/stanzaPlaybackRateLimits';
import ConductorOverlay from './ConductorOverlay';
import StanzaSectionMetronomeRail from './StanzaSectionMetronomeRail';
import StanzaRepeatMark from './StanzaRepeatMark';
import { useMetronomeSync } from '../hooks/useMetronomeSync';
import { useStanzaLocalStemMixer } from '../hooks/useStanzaLocalStemMixer';

/** Drag-reorder stem rows (not OS file drops). */
const STANZA_STEM_REORDER_MIME = 'text/x-stanza-stem-reorder';

const STANZA_EMPTY_STEMS: StanzaStemTrack[] = [];

function reorderStemsById(stems: StanzaStemTrack[], fromId: string, toId: string): StanzaStemTrack[] {
  const list = [...stems];
  const from = list.findIndex((s) => s.id === fromId);
  const to = list.findIndex((s) => s.id === toId);
  if (from < 0 || to < 0 || from === to) return stems;
  const [moved] = list.splice(from, 1);
  list.splice(to, 0, moved);
  return list;
}

/** Only seek stems when drift exceeds this (avoids micro-seeks that sound like jitter). */
const STANZA_STEM_ALIGN_DRIFT_SEC = 0.32;
/** Mix rail: narrow drag / spacer so label + mute stay compact and sliders get flex space. */
const STANZA_MIX_DRAG_COL_PX = 22;
/** Main row trailing spacer — balances stem “remove” IconButton column for slider alignment. */
const STANZA_MIX_TRAIL_BALANCE_PX = 32;
/** Cap layer name width so the Slider can grow on dense practice rails. */
const STANZA_MIX_LABEL_MAX_WIDTH = '6.75rem';

function stanzaMixTrackLabelSurfaceSx(theme: Theme) {
  return {
    fontFamily: theme.typography.fontFamily,
    fontSize: '0.6875rem',
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: '0.01em',
    color: theme.palette.text.primary,
  };
}

function songHasPractice(s: StanzaSong): boolean {
  return (s.markers?.length ?? 0) > 0 || Object.keys(s.stats ?? {}).length > 0;
}

function describeYoutubePlayerError(code: number): string {
  if (code === 101 || code === 150) {
    return 'This video cannot be played inside Stanza because the publisher has disabled embedding on other sites.';
  }
  if (code === 100) {
    return 'This video is unavailable (removed, private, or not found).';
  }
  if (code === 5) {
    return 'YouTube reported a playback error in the embedded player.';
  }
  if (code === 2) {
    return 'YouTube reported invalid playback parameters.';
  }
  return `YouTube reported playback error ${code}.`;
}

function StanzaLibraryJpegThumb({
  songId,
  blob,
  onInvalidate,
}: {
  songId: string;
  blob: Blob;
  onInvalidate: () => void;
}) {
  const thumbKey = `${songId}:${blob.size}:${blob.type}`;
  const [url, setUrl] = useState(() => URL.createObjectURL(blob));
  useLayoutEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return u;
    });
    // No returned cleanup: Strict Mode would revoke `u` while `<img>` still references it.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `blob` reference churns; `thumbKey` encodes identity
  }, [thumbKey]);

  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const onErr = () => {
      onInvalidate();
      void (async () => {
        const row = await stanzaDb.songs.get(songId);
        if (!row?.localVideoThumbnailBlob) return;
        const { localVideoThumbnailBlob, ...rest } = row;
        void localVideoThumbnailBlob;
        await stanzaDb.songs.put({ ...rest, updatedAt: Date.now() });
      })();
    };
    el.addEventListener('error', onErr);
    return () => el.removeEventListener('error', onErr);
  }, [url, songId, onInvalidate]);

  return <img ref={imgRef} className="stanza-library-card-thumb" src={url} alt="" loading="lazy" />;
}

function StanzaLibraryVideoPosterThumb({ songId, videoBlob }: { songId: string; videoBlob: Blob }) {
  const [failed, setFailed] = useState(false);
  const posterKey = `${songId}:${videoBlob.size}:${videoBlob.type}`;
  const [url, setUrl] = useState(() => URL.createObjectURL(videoBlob));
  useLayoutEffect(() => {
    const u = URL.createObjectURL(videoBlob);
    setUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return u;
    });
    // No returned cleanup: Strict Mode would revoke `u` while `<video>` still references it.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `videoBlob` reference churns; `posterKey` encodes identity
  }, [posterKey]);
  useEffect(() => {
    setFailed(false);
  }, [songId, videoBlob.size, videoBlob.type]);

  if (failed) {
    return (
      <Box
        className="stanza-library-card-thumb"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.400',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Video
        </Typography>
      </Box>
    );
  }

  return (
    <video
      className="stanza-library-card-thumb"
      src={url}
      muted
      playsInline
      preload="metadata"
      aria-hidden
      onError={() => setFailed(true)}
      onLoadedMetadata={(e) => {
        const v = e.currentTarget;
        v.currentTime = pickThumbnailSeekSec(v, 0.5);
      }}
    />
  );
}

function StanzaLibraryLocalThumb({ song }: { song: StanzaSong }) {
  const [jpegBad, setJpegBad] = useState(false);
  useEffect(() => {
    setJpegBad(false);
  }, [song.id, song.localVideoThumbnailBlob]);

  const thumb = song.localVideoThumbnailBlob;
  const media = song.localAudioBlob;
  const isVideo = Boolean(media && isStanzaBlobLikeVideo(media, song.title));

  if (thumb && !jpegBad) {
    return <StanzaLibraryJpegThumb songId={song.id} blob={thumb} onInvalidate={() => setJpegBad(true)} />;
  }
  if (isVideo && media) {
    return <StanzaLibraryVideoPosterThumb songId={song.id} videoBlob={media} />;
  }
  return (
    <Box
      className="stanza-library-card-thumb"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.300',
      }}
    >
      <Typography variant="caption" color="text.secondary">
        Audio
      </Typography>
    </Box>
  );
}

export default function StanzaWorkspace() {
  const songs = useLiveQuery(() => stanzaDb.songs.orderBy('updatedAt').reverse().toArray(), []);
  const { push: pushUndo, isReplayingRef } = useLabsUndo();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;
  const [ytPaste, setYtPaste] = useState('');
  const [loopMode, setLoopMode] = useState<StanzaPlaybackLoopMode>('through');
  const [selectedSegmentIndices, setSelectedSegmentIndices] = useState<number[]>([]);
  /** Selected time span vs marker-defined section edges (markers unchanged). */
  const [sectionSelectionExtend, setSectionSelectionExtend] = useState<StanzaSectionSelectionExtend>({
    startDelta: 0,
    endDelta: 0,
  });
  /** Anchor for Shift+click range selection (last non-Shift section click). */
  const [segmentSelectionAnchor, setSegmentSelectionAnchor] = useState<number | null>(null);
  const [lastClickedSegmentIndex, setLastClickedSegmentIndex] = useState<number | null>(null);
  const [playback, setPlayback] = useState({
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    playbackRate: 1,
  });
  const ytControllerRef = useRef<StanzaYouTubeController | null>(null);
  const pendingYoutubeBootstrapRef = useRef<{ songId: string; seekSec?: number; rate?: number } | null>(null);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const stemAudioRefs = useRef(new Map<string, HTMLAudioElement>());
  const stemFileInputRef = useRef<HTMLInputElement | null>(null);
  const libraryUploadInputRef = useRef<HTMLInputElement | null>(null);
  const timeRef = useRef(0);
  const durationRef = useRef(0);
  const playingRef = useRef(false);
  const seekDisplayRafRef = useRef(0);
  const seekDisplayPendingRef = useRef<number | null>(null);
  const isYoutubeForSeekRef = useRef(false);
  const [metronomeSectionHint, setMetronomeSectionHint] = useState<string | null>(null);
  const metronomeHintDismissedSegRef = useRef<string | null>(null);
  const [conductorOpen, setConductorOpen] = useState(false);
  const [regimen, setRegimen] = useState<GuidedRegimen>('accuracy');
  const [guidedSegmentIndex, setGuidedSegmentIndex] = useState(0);
  const [guidedSinceCp, setGuidedSinceCp] = useState(0);
  const [recState, setRecState] = useState<'idle' | 'recording'>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<Blob[]>([]);
  const recStreamRef = useRef<MediaStream | null>(null);
  const [removeConfirmSong, setRemoveConfirmSong] = useState<StanzaSong | null>(null);
  /** Pending OS drop: length matched current track — user must confirm stem import. */
  const [stemDropConfirm, setStemDropConfirm] = useState<{
    songId: string;
    files: File[];
    rows: { name: string; durationSec: number }[];
    refSec: number;
  } | null>(null);
  /** Inline mix-rail label edit (stem id + draft value). */
  const [stemInlineEdit, setStemInlineEdit] = useState<{ stemId: string; value: string } | null>(null);
  const [stemReorderDragId, setStemReorderDragId] = useState<string | null>(null);
  const [stemReorderOverId, setStemReorderOverId] = useState<string | null>(null);
  const [libraryMenu, setLibraryMenu] = useState<{ anchor: HTMLElement; songId: string } | null>(null);
  const oembedAttemptedRef = useRef(new Set<string>());
  const urlBootstrapDoneRef = useRef(false);
  const driveDeepLinkAttemptedRef = useRef(false);
  const [driveDeepLinkError, setDriveDeepLinkError] = useState<string | null>(null);
  const [driveDeepLinkNeedsGesture, setDriveDeepLinkNeedsGesture] = useState<{
    fileId: string;
    title: string | null;
  } | null>(null);
  const [driveDeepLinkBusy, setDriveDeepLinkBusy] = useState(false);
  const [youtubePlayerErrorCode, setYoutubePlayerErrorCode] = useState<number | null>(null);
  const lastPlaybackUrlSyncKey = useRef<string | undefined>(undefined);

  const selected = useMemo(() => songs?.find((s) => s.id === selectedId) ?? null, [songs, selectedId]);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const isYoutube = Boolean(selected?.ytId);
  isYoutubeForSeekRef.current = isYoutube;

  useEffect(() => {
    setStemInlineEdit(null);
    setStemReorderDragId(null);
    setStemReorderOverId(null);
  }, [selectedId]);

  useEffect(() => {
    setStemDropConfirm((cur) => {
      if (!cur) return null;
      if (selectedId !== cur.songId) return null;
      return cur;
    });
  }, [selectedId]);

  const isLocalVideo = Boolean(
    selected?.localAudioBlob && isStanzaBlobLikeVideo(selected.localAudioBlob, selected.title),
  );

  useEffect(() => {
    setYoutubePlayerErrorCode(null);
  }, [selected?.ytId]);

  useEffect(() => {
    if (!selectedId || !songs) return;
    const row = songs.find((s) => s.id === selectedId);
    if (!row?.localAudioBlob || !isStanzaBlobLikeVideo(row.localAudioBlob, row.title)) return;
    if (row.localVideoThumbnailBlob) return;
    void backfillStanzaVideoThumbnailIfNeeded(selectedId);
  }, [selectedId, songs]);

  type UrlSyncState =
    | 'none'
    | 'pending'
    | { kind: 'yt'; youtubeId: string }
    | { kind: 'local'; driveFileId: string | null; driveTitle: string | null };

  const urlSyncState = useMemo((): UrlSyncState => {
    if (!selectedId) return 'none';
    if (!songs) return 'pending';
    const row = songs.find((s) => s.id === selectedId);
    if (!row) return 'pending';
    if (row.ytId) return { kind: 'yt', youtubeId: row.ytId };
    const driveFileId = row.driveSourceFileId ?? null;
    return {
      kind: 'local',
      driveFileId,
      driveTitle: driveFileId ? row.title : null,
    };
  }, [selectedId, songs]);

  const sortedLibrarySongs = useMemo(() => {
    if (!songs?.length) return [];
    const copy = [...songs];
    copy.sort((a, b) => {
      const pa = songHasPractice(a) ? 1 : 0;
      const pb = songHasPractice(b) ? 1 : 0;
      if (pb !== pa) return pb - pa;
      return b.updatedAt - a.updatedAt;
    });
    return copy;
  }, [songs]);

  const ensureYoutubeSongByVideoId = useCallback(async (videoId: string): Promise<string> => {
    const existing = await stanzaDb.songs.where('ytId').equals(videoId).first();
    if (existing) return existing.id;
    const rowId = crypto.randomUUID();
    const row: StanzaSong = {
      id: rowId,
      ytId: videoId,
      title: `YouTube · ${videoId}`,
      markers: [],
      stats: {},
      updatedAt: Date.now(),
    };
    await stanzaDb.songs.put(row);
    if (!isReplayingRef.current) {
      const id = rowId;
      const snap = structuredClone(row);
      pushUndo({
        undo: async () => {
          await stanzaDb.takes.where('songId').equals(id).delete();
          await stanzaDb.songs.delete(id);
          setSelectedId((cur) => (cur === id ? null : cur));
        },
        redo: async () => {
          await stanzaDb.songs.put(structuredClone(snap));
        },
      });
    }
    void (async () => {
      const t = await fetchYoutubeOEmbedTitle(videoId);
      if (!t) return;
      const latest = await stanzaDb.songs.get(rowId);
      if (!latest) return;
      await stanzaDb.songs.put({ ...latest, title: t, updatedAt: Date.now() });
    })();
    return rowId;
  }, [isReplayingRef, pushUndo]);

  const commitDriveDeepLinkImport = useCallback(
    async (opts: { fileId: string; suggestedTitle: string | null; interactiveOAuth: boolean }) => {
      const existingByLink = await stanzaDb.songs.where('driveSourceFileId').equals(opts.fileId).first();
      if (existingByLink) {
        setSelectedId(existingByLink.id);
        setDriveDeepLinkError(null);
        setDriveDeepLinkNeedsGesture(null);
        void backfillStanzaVideoThumbnailIfNeeded(existingByLink.id);
        return;
      }
      const { blob, title, driveSourceFileId } = await loadDriveFileAsStanzaLocalBlob(opts);
      const existing = await stanzaDb.songs.where('driveSourceFileId').equals(driveSourceFileId).first();
      if (existing) {
        setSelectedId(existing.id);
        setDriveDeepLinkError(null);
        setDriveDeepLinkNeedsGesture(null);
        void backfillStanzaVideoThumbnailIfNeeded(existing.id);
        return;
      }
      const rowId = crypto.randomUUID();
      const row: StanzaSong = {
        id: rowId,
        ytId: null,
        title,
        markers: [],
        stats: {},
        updatedAt: Date.now(),
        localAudioBlob: blob,
        driveSourceFileId,
      };
      await stanzaDb.songs.put(row);
      setSelectedId(rowId);
      setDriveDeepLinkError(null);
      setDriveDeepLinkNeedsGesture(null);
      void backfillStanzaVideoThumbnailIfNeeded(rowId);
    },
    [],
  );

  const completeGestureDriveImport = useCallback(async () => {
    const pending = driveDeepLinkNeedsGesture;
    const fromUrl = readStanzaDriveBootstrapFromLocation();
    const fileId = pending?.fileId ?? fromUrl.driveFileId;
    const suggestedTitle = pending?.title ?? fromUrl.driveTitle;
    if (!fileId) return;
    setDriveDeepLinkBusy(true);
    setDriveDeepLinkError(null);
    try {
      await commitDriveDeepLinkImport({
        fileId,
        suggestedTitle,
        interactiveOAuth: true,
      });
    } catch (e) {
      setDriveDeepLinkError(e instanceof Error ? e.message : String(e));
      setDriveDeepLinkNeedsGesture(null);
    } finally {
      setDriveDeepLinkBusy(false);
    }
  }, [driveDeepLinkNeedsGesture, commitDriveDeepLinkImport]);

  useEffect(() => {
    if (urlBootstrapDoneRef.current) return;
    urlBootstrapDoneRef.current = true;
    const vid = readYoutubeVFromLocation();
    if (!vid) return;
    void ensureYoutubeSongByVideoId(vid).then((id) => setSelectedId(id));
  }, [ensureYoutubeSongByVideoId]);

  useLayoutEffect(() => {
    if (driveDeepLinkAttemptedRef.current) return;
    const { youtubeId, driveFileId, driveTitle } = readStanzaDriveBootstrapFromLocation();
    if (youtubeId) return;

    if (!hasStanzaDriveDeepLinkQuery()) return;

    if (!driveFileId) {
      driveDeepLinkAttemptedRef.current = true;
      setDriveDeepLinkError(
        'This Google Drive link is not valid for Stanza (the file id in the URL is missing or malformed). Try opening it again from Encore.',
      );
      return;
    }

    driveDeepLinkAttemptedRef.current = true;
    setDriveDeepLinkBusy(true);

    void (async () => {
      try {
        await commitDriveDeepLinkImport({
          fileId: driveFileId,
          suggestedTitle: driveTitle,
          interactiveOAuth: false,
        });
      } catch (e) {
        if (e instanceof LabsGoogleInteractiveAuthRequiredError) {
          setDriveDeepLinkNeedsGesture({ fileId: driveFileId, title: driveTitle });
          setDriveDeepLinkError(null);
          return;
        }
        setDriveDeepLinkError(e instanceof Error ? e.message : String(e));
      } finally {
        setDriveDeepLinkBusy(false);
      }
    })();
  }, [commitDriveDeepLinkImport]);

  /**
   * Auto-resume the last opened song on reload. URL `?v=…` always wins, so this only kicks in
   * when there's no YouTube deep link. Without this, even though the audio blob is sitting in
   * IndexedDB, the user lands on the empty hero screen and feels like Stanza forgot the upload.
   */
  const lastSelectedRestoreAttemptedRef = useRef(false);
  useEffect(() => {
    if (lastSelectedRestoreAttemptedRef.current) return;
    if (selectedId) {
      // URL bootstrap (or some other path) already selected something; lock in this session.
      lastSelectedRestoreAttemptedRef.current = true;
      return;
    }
    if (!songs) return; // live query still hydrating
    if (readYoutubeVFromLocation()) return; // URL deep link will handle selection
    if (hasStanzaDriveDeepLinkQuery()) return; // `?df=` present — wait for Drive bootstrap / error UI
    lastSelectedRestoreAttemptedRef.current = true;
    const savedId = readStanzaLastSelectedSongId();
    if (!savedId) return;
    if (songs.some((s) => s.id === savedId)) {
      setSelectedId(savedId);
    } else {
      // Stale id (song was deleted in another tab / earlier session) — drop it so we don't keep
      // trying to restore something that's gone.
      writeStanzaLastSelectedSongId(null);
    }
  }, [songs, selectedId]);

  /** Persist `selectedId` so a fresh load can resume it (see `lastSelectedRestoreAttemptedRef`). */
  useEffect(() => {
    writeStanzaLastSelectedSongId(selectedId);
  }, [selectedId]);

  useEffect(() => {
    const onPop = () => {
      const vid = readYoutubeVFromLocation();
      if (!vid) {
        setSelectedId(null);
        return;
      }
      void ensureYoutubeSongByVideoId(vid).then((id) => setSelectedId(id));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [ensureYoutubeSongByVideoId]);

  useEffect(() => {
    if (urlSyncState === 'pending') return;
    if (urlSyncState === 'none') {
      const key = '__none_strip_youtube_only__';
      if (lastPlaybackUrlSyncKey.current === key) return;
      lastPlaybackUrlSyncKey.current = key;
      stripStanzaYoutubeSearchParamPreservingDrive();
      return;
    }
    let youtubeId: string | null = null;
    let driveFileId: string | null = null;
    let driveTitle: string | null = null;
    if (urlSyncState.kind === 'yt') {
      youtubeId = urlSyncState.youtubeId;
    } else {
      driveFileId = urlSyncState.driveFileId;
      driveTitle = urlSyncState.driveTitle;
    }
    const key = `${youtubeId ?? ''}\0${driveFileId ?? ''}\0${driveTitle ?? ''}`;
    if (lastPlaybackUrlSyncKey.current === key) return;
    lastPlaybackUrlSyncKey.current = key;
    replaceStanzaPlaybackUrlSearchParams({ youtubeId, driveFileId, driveTitle });
  }, [urlSyncState]);

  useEffect(() => {
    const p = pendingYoutubeBootstrapRef.current;
    if (p && selectedId != null && p.songId !== selectedId) pendingYoutubeBootstrapRef.current = null;
  }, [selectedId]);

  useEffect(() => {
    setSelectedSegmentIndices([]);
    setSegmentSelectionAnchor(null);
    setLastClickedSegmentIndex(null);
    setLoopMode('through');
  }, [selectedId]);

  /** Stable key for the primary local file blob — id + size only; MIME can flip after Drive/Dexie hydrate. */
  const primaryLocalBlobKey = useMemo(
    () => stanzaPrimaryLocalBlobKey(selected),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Dexie churns `selected` reference; key uses stable id/size/yt.
    [selected?.id, selected?.ytId, selected?.localAudioBlob?.size],
  );

  /** Sorted id:size list — stable across stem row order from Dexie / UI reorder. */
  const stemBlobIdentityKey = stanzaStemBlobIdentityKeySorted(selected?.stems);
  const stemUrlKey = useMemo(
    () => stanzaStemUrlKeyFromSong(selected),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `stemBlobIdentityKey` captures stem bytes identity; avoids stems[] ref churn.
    [selected?.id, selected?.ytId, stemBlobIdentityKey],
  );

  /**
   * Sync `blob:` URLs for primary + stems; revoke only after commit (see hook) to avoid `ERR_FILE_NOT_FOUND`.
   * First paint still gets valid `src` from synchronous `useMemo` inside the hook.
   */
  const { localUrl, stemUrlById } = useStanzaLocalPlaybackObjectUrls({
    primaryLocalBlobKey,
    stemUrlKey,
    selectedRef,
  });

  /** New song or new primary blob — avoid carrying the previous track's duration into `timeupdate` NaN windows. */
  useEffect(() => {
    setPlayback({
      currentTime: 0,
      duration: 0,
      isPlaying: false,
      playbackRate: 1,
    });
  }, [selectedId, primaryLocalBlobKey]);

  const primaryMixKey = `${primaryPlaybackMuted(selected) ? 1 : 0}:${stanzaSanitizeLinearBusGain(selected?.primaryGain)}`;
  const stemMixKey =
    selected?.stems
      ?.map((s) => `${s.id}:${stemPlaybackMuted(s) ? 1 : 0}:${stanzaSanitizeLinearBusGain(s.gain)}`)
      .join('|') ?? '';

  const stemWebAudioEnabled = Boolean(
    selected && !selected.ytId && (selected.stems?.length ?? 0) > 0 && Boolean(stemUrlKey),
  );

  /** If Web Audio graph setup fails (or is abandoned), restore audible levels on the underlying media elements. */
  const restoreHtmlStemVolumes = useCallback(() => {
    if (!selected || selected.ytId) return;
    const main = localAudioRef.current ?? localVideoRef.current;
    if (main) {
      main.volume = stanzaSanitizeLinearBusGain(selected.primaryGain);
      main.muted = primaryPlaybackMuted(selected);
    }
    for (const stem of selected.stems ?? []) {
      const el = stemAudioRefs.current.get(stem.id);
      if (!el) continue;
      el.volume = stanzaSanitizeLinearBusGain(stem.gain);
      el.muted = stemPlaybackMuted(stem);
    }
  }, [selected]);

  const { webAudioMixReady, prepareStemMixerForPlaySync, finalizeStemMixerResume, abandonWebAudioMix } =
    useStanzaLocalStemMixer({
      enabled: stemWebAudioEnabled,
      stemUrlKey,
      expectedStemCount: selected?.stems?.length ?? 0,
      primaryMuted: primaryPlaybackMuted(selected),
      primaryGain: stanzaSanitizeLinearBusGain(selected?.primaryGain),
      stems: selected?.stems ?? STANZA_EMPTY_STEMS,
      localVideoRef,
      localAudioRef,
      stemAudioRefs,
      onMixResumeFailed: restoreHtmlStemVolumes,
    });

  useEffect(() => {
    if (!selected || selected.ytId) return;
    const main = localAudioRef.current ?? localVideoRef.current;
    if (!main) return;

    const viaWebAudio = stemWebAudioEnabled && webAudioMixReady;

    if (viaWebAudio) {
      // See StanzaLocalStemMixer: MEA follows element volume — keep at 1; mix/mute via Web Audio only.
      main.volume = 1;
      main.muted = false;
    } else {
      main.volume = stanzaSanitizeLinearBusGain(selected.primaryGain);
      main.muted = primaryPlaybackMuted(selected);
    }

    if (!selected.stems?.length) return;
    if (!viaWebAudio) {
      for (const stem of selected.stems) {
        const el = stemAudioRefs.current.get(stem.id);
        if (!el) continue;
        el.volume = stanzaSanitizeLinearBusGain(stem.gain);
        el.muted = stemPlaybackMuted(stem);
      }
    } else {
      for (const stem of selected.stems) {
        const el = stemAudioRefs.current.get(stem.id);
        if (!el) continue;
        // Chromium: MEA taps post-element-gain; keep at 1 and mute only in the Web Audio graph.
        el.volume = 1;
        el.muted = false;
      }
    }
  }, [primaryMixKey, stemMixKey, selected, stemWebAudioEnabled, webAudioMixReady]);

  useEffect(() => {
    if (isYoutube || !stemUrlKey) return;
    const main = localAudioRef.current ?? localVideoRef.current;
    if (!main) return;
    const t = main.currentTime;
    const shouldPlay = !main.paused;
    const raf = window.requestAnimationFrame(() => {
      stemAudioRefs.current.forEach((a) => {
        try {
          a.currentTime = t;
        } catch {
          /* ignore */
        }
        if (shouldPlay) void a.play().catch(() => {});
        else a.pause();
      });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [stemUrlKey, isYoutube]);

  useEffect(() => {
    timeRef.current = playback.currentTime;
    durationRef.current = playback.duration;
    playingRef.current = playback.isPlaying;
  }, [playback]);

  useEffect(() => {
    return () => {
      if (seekDisplayRafRef.current !== 0) {
        window.cancelAnimationFrame(seekDisplayRafRef.current);
        seekDisplayRafRef.current = 0;
      }
      seekDisplayPendingRef.current = null;
    };
  }, [selectedId]);

  const selectedSegmentsKey = selectedSegmentIndices.join(',');
  useEffect(() => {
    setSectionSelectionExtend({ startDelta: 0, endDelta: 0 });
  }, [selectedSegmentsKey]);

  const segments = useMemo(
    () => deriveSegments(selected?.markers ?? [], playback.duration),
    [selected?.markers, playback.duration],
  );

  const segmentSelectionLoopHull = useMemo(
    () => computeLoopHull(segments, selectedSegmentIndices),
    [segments, selectedSegmentIndices],
  );

  const effectiveSelectionSpan = useMemo(() => {
    if (!segmentSelectionLoopHull || !(playback.duration > 0)) return null;
    return applySectionSelectionExtend(
      segmentSelectionLoopHull,
      sectionSelectionExtend,
      playback.duration,
    );
  }, [segmentSelectionLoopHull, sectionSelectionExtend, playback.duration]);

  const playbackSegIdx = useMemo(
    () => (segments.length > 0 ? findSegmentIndexAtTime(segments, playback.currentTime) : null),
    [segments, playback.currentTime],
  );
  const playbackMetSeg = playbackSegIdx != null ? segments[playbackSegIdx]! : null;
  const playbackMetCal =
    playbackMetSeg && selected ? selected.metronomeBySegmentId?.[playbackMetSeg.id] : undefined;

  const railCalibSegIdx = useMemo(() => {
    if (segments.length === 0) return null;
    if (lastClickedSegmentIndex != null) return lastClickedSegmentIndex;
    if (selectedSegmentIndices.length > 0) return Math.min(...selectedSegmentIndices);
    return playbackSegIdx ?? 0;
  }, [segments, lastClickedSegmentIndex, selectedSegmentIndices, playbackSegIdx]);

  const railCalibSeg = railCalibSegIdx != null ? segments[railCalibSegIdx]! : null;

  useEffect(() => {
    if (!selectedId || playback.duration <= 0 || !songs) return;
    const song = songs.find((s) => s.id === selectedId);
    if (!song) return;
    void migrateStanzaSongSegmentKeysIfNeeded(song, playback.duration);
  }, [selectedId, playback.duration, songs]);

  useEffect(() => {
    if (!songs?.length) return;
    for (const s of songs) {
      if (!s.ytId) continue;
      if (s.title !== `YouTube · ${s.ytId}`) continue;
      if (oembedAttemptedRef.current.has(s.id)) continue;
      oembedAttemptedRef.current.add(s.id);
      void (async () => {
        const t = await fetchYoutubeOEmbedTitle(s.ytId!);
        if (!t) return;
        const row = await stanzaDb.songs.get(s.id);
        if (!row || row.title !== `YouTube · ${row.ytId}`) return;
        await stanzaDb.songs.put({ ...row, title: t, updatedAt: Date.now() });
      })();
    }
  }, [songs]);

  const persistSong = useCallback(
    async (patch: Partial<StanzaSong> & Pick<StanzaSong, 'id'>, opts?: { recordUndo?: boolean }) => {
      const row = await stanzaDb.songs.get(patch.id);
      if (!row) return;
      const recordUndo = opts?.recordUndo !== false && !isReplayingRef.current;
      const prevSnap = recordUndo ? structuredClone(row) : null;
      const nextMarkers = patch.markers != null ? ensureMarkerIds(patch.markers) : row.markers;
      const next: StanzaSong = { ...row, ...patch, markers: nextMarkers, updatedAt: Date.now() };
      await stanzaDb.songs.put(next);
      if (recordUndo && prevSnap) {
        const nextSnap = structuredClone(next);
        pushUndo({
          undo: async () => {
            await stanzaDb.songs.put(prevSnap);
          },
          redo: async () => {
            await stanzaDb.songs.put(nextSnap);
          },
        });
      }
    },
    [isReplayingRef, pushUndo],
  );

  const finishStemInlineEdit = useCallback(
    async (stemId: string, raw: string, fallbackLabel: string) => {
      if (!selectedId) return;
      const trimmed = raw.trim();
      const nextLabel = trimmed.length > 0 ? trimmed : fallbackLabel;
      setStemInlineEdit(null);
      const row = await stanzaDb.songs.get(selectedId);
      if (!row) return;
      await persistSong({
        id: row.id,
        stems: (row.stems ?? []).map((s) => (s.id === stemId ? { ...s, label: nextLabel } : s)),
      });
    },
    [persistSong, selectedId],
  );

  const reorderStemsPersist = useCallback(
    async (fromId: string, toId: string) => {
      if (!selectedId) return;
      const row = await stanzaDb.songs.get(selectedId);
      if (!row?.stems?.length) return;
      const next = reorderStemsById(row.stems, fromId, toId);
      await persistSong({ id: row.id, stems: next });
    },
    [persistSong, selectedId],
  );

  const addStemFromFile = useCallback(
    async (file: File) => {
      if (!selected) return;
      if (!isAudioFileForStanza(file)) return;
      const blob = new Blob([await file.arrayBuffer()], { type: file.type || 'audio/mpeg' });
      const stem: StanzaStemTrack = {
        id: crypto.randomUUID(),
        label: stanzaSongTitleFromFileName(file.name),
        localBlob: blob,
        gain: 1,
        muted: false,
      };
      await persistSong({ id: selected.id, stems: [...(selected.stems ?? []), stem] });
    },
    [selected, persistSong],
  );

  const appendStemsFromFiles = useCallback(
    async (songId: string, files: File[]) => {
      const row = await stanzaDb.songs.get(songId);
      if (!row) return;
      const newStems: StanzaStemTrack[] = [];
      for (const file of files) {
        if (!isAudioFileForStanza(file)) continue;
        const blob = new Blob([await file.arrayBuffer()], { type: file.type || 'audio/mpeg' });
        newStems.push({
          id: crypto.randomUUID(),
          label: stanzaSongTitleFromFileName(file.name),
          localBlob: blob,
          gain: 1,
          muted: false,
        });
      }
      if (newStems.length === 0) return;
      await persistSong({ id: songId, stems: [...(row.stems ?? []), ...newStems] });
    },
    [persistSong],
  );

  const addYoutubeSong = useCallback(async () => {
    const imp = resolveYoutubePaste(ytPaste);
    if (!imp) return;
    const rowId = crypto.randomUUID();
    const boot: { songId: string; seekSec?: number; rate?: number } = { songId: rowId };
    if (imp.seekSec != null) boot.seekSec = imp.seekSec;
    if (imp.playbackRate != null && Math.abs(imp.playbackRate - 1) > 0.0001) boot.rate = imp.playbackRate;
    pendingYoutubeBootstrapRef.current = boot.seekSec != null || boot.rate != null ? boot : null;

    const row: StanzaSong = {
      id: rowId,
      ytId: imp.videoId,
      title: `YouTube · ${imp.videoId}`,
      markers: ensureMarkerIds(imp.markers),
      stats: {},
      updatedAt: Date.now(),
    };
    await stanzaDb.songs.put(row);
    setSelectedId(row.id);
    setYtPaste('');
    if (!isReplayingRef.current) {
      const id = rowId;
      const snap = structuredClone(row);
      pushUndo({
        undo: async () => {
          await stanzaDb.takes.where('songId').equals(id).delete();
          await stanzaDb.songs.delete(id);
          setSelectedId((cur) => (cur === id ? null : cur));
        },
        redo: async () => {
          await stanzaDb.songs.put(structuredClone(snap));
          setSelectedId(id);
        },
      });
    }
    void (async () => {
      const t = await fetchYoutubeOEmbedTitle(imp.videoId);
      if (!t) return;
      const latest = await stanzaDb.songs.get(rowId);
      if (!latest) return;
      void persistSong({ id: latest.id, title: t }, { recordUndo: false });
    })();
  }, [ytPaste, isReplayingRef, pushUndo, persistSong]);

  const addLocalSong = useCallback(async (file: File) => {
    const row = await buildLocalAudioStanzaSong(file);
    await stanzaDb.songs.put(row);
    setSelectedId(row.id);
    if (!isReplayingRef.current) {
      const id = row.id;
      const snap = structuredClone(row);
      pushUndo({
        undo: async () => {
          await stanzaDb.takes.where('songId').equals(id).delete();
          await stanzaDb.songs.delete(id);
          setSelectedId((cur) => (cur === id ? null : cur));
        },
        redo: async () => {
          await stanzaDb.songs.put(structuredClone(snap));
          setSelectedId(id);
        },
      });
    }
  }, [isReplayingRef, pushUndo]);

  /**
   * Drag-and-drop: OS files onto the Stanza surface import as a new library song, or — when a
   * piece is already open and each file's metadata duration matches the loaded track (±0.28s) —
   * attach as stem layer(s). `useStanzaFileDrop` uses capture so nested controls never block drops.
   */
  const handleDroppedAudioFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      const sid = selectedIdRef.current;
      const refDur = durationRef.current;
      const row = sid ? await stanzaDb.songs.get(sid) : null;
      const canTryStemHeuristic = Boolean(row && refDur > 0.25);

      if (!canTryStemHeuristic) {
        await addLocalSong(files[0]);
        return;
      }

      const eps = STANZA_STEM_DURATION_MATCH_EPS_SEC;
      const probed = await Promise.all(
        files.map(async (file) => ({
          file,
          dur: await probeFileAudioDurationSeconds(file),
        })),
      );
      const matching = probed.filter((p) => p.dur != null && Math.abs(p.dur - refDur) <= eps);

      if (matching.length === 0) {
        await addLocalSong(files[0]);
        return;
      }

      setStemDropConfirm({
        songId: row!.id,
        files: matching.map((m) => m.file),
        rows: matching.map((m) => ({ name: m.file.name, durationSec: m.dur! })),
        refSec: refDur,
      });
    },
    [addLocalSong],
  );

  const fileDropDisabled = Boolean(stemDropConfirm);

  const { isDragging: isFileDragging } = useStanzaFileDrop({
    onAudioFiles: handleDroppedAudioFiles,
    disabled: fileDropDisabled,
  });

  const removeSongById = useCallback(
    async (id: string) => {
      const row = await stanzaDb.songs.get(id);
      if (!row) return;
      const prevSnap = structuredClone(row);
      const prevTakes = (await stanzaDb.takes.where('songId').equals(id).toArray()).map((t) => structuredClone(t));
      const wasSelected = selectedId === id;
      await stanzaDb.takes.where('songId').equals(id).delete();
      await stanzaDb.songs.delete(id);
      if (wasSelected) setSelectedId(null);
      if (!isReplayingRef.current) {
        pushUndo({
          undo: async () => {
            await stanzaDb.songs.put(prevSnap);
            for (const t of prevTakes) {
              await stanzaDb.takes.put(t);
            }
            if (wasSelected) setSelectedId(prevSnap.id);
          },
          redo: async () => {
            await stanzaDb.takes.where('songId').equals(id).delete();
            await stanzaDb.songs.delete(id);
            if (wasSelected) setSelectedId(null);
          },
        });
      }
    },
    [selectedId, isReplayingRef, pushUndo],
  );

  const applyPlaybackRate = useCallback(
    (rate: number) => {
      const clamped = clampStanzaPlaybackRate(rate);
      if (isYoutube) {
        ytControllerRef.current?.setPlaybackRate(clamped);
      } else {
        const el = localAudioRef.current ?? localVideoRef.current;
        if (el) el.playbackRate = clamped;
        stemAudioRefs.current.forEach((a) => {
          a.playbackRate = clamped;
        });
      }
      setPlayback((p) => ({ ...p, playbackRate: clamped }));
    },
    [isYoutube],
  );

  const scheduleSeekFrame = useCallback(() => {
    if (seekDisplayRafRef.current !== 0) return;
    seekDisplayRafRef.current = window.requestAnimationFrame(() => {
      seekDisplayRafRef.current = 0;
      const tt = seekDisplayPendingRef.current;
      seekDisplayPendingRef.current = null;
      if (tt == null || !Number.isFinite(tt)) return;
      if (isYoutubeForSeekRef.current) {
        ytControllerRef.current?.seekTo(tt);
      }
      setPlayback((p) => (p.currentTime === tt ? p : { ...p, currentTime: tt }));
    });
  }, []);

  const readLiveTransportTime = useCallback((): number => {
    if (isYoutube) {
      try {
        const fn = ytControllerRef.current?.getCurrentTime;
        if (typeof fn === 'function') {
          const x = fn();
          if (Number.isFinite(x)) return Math.max(0, x);
        }
      } catch {
        /* ignore */
      }
    } else {
      const el = localAudioRef.current ?? localVideoRef.current;
      if (el && Number.isFinite(el.currentTime)) return el.currentTime;
    }
    return timeRef.current;
  }, [isYoutube]);

  const seekUnified = useCallback(
    (tRaw: number, opts?: { flushPlaybackState?: boolean }) => {
      const flush = opts?.flushPlaybackState === true;
      const d = durationRef.current;
      const t =
        d > 0 && Number.isFinite(tRaw) ? Math.max(0, Math.min(d - STANZA_TIME_EPS * 0.5, tRaw)) : Math.max(0, tRaw);
      timeRef.current = t;

      if (flush) {
        if (seekDisplayRafRef.current !== 0) {
          window.cancelAnimationFrame(seekDisplayRafRef.current);
          seekDisplayRafRef.current = 0;
        }
        seekDisplayPendingRef.current = null;
      } else {
        seekDisplayPendingRef.current = t;
      }

      if (isYoutube) {
        if (flush) {
          ytControllerRef.current?.seekTo(t);
          setPlayback((p) => (p.currentTime === t ? p : { ...p, currentTime: t }));
        } else {
          scheduleSeekFrame();
        }
        return;
      }
      const el = localAudioRef.current ?? localVideoRef.current;
      if (el) {
        el.currentTime = t;
      }
      stemAudioRefs.current.forEach((a) => {
        try {
          a.currentTime = t;
        } catch {
          /* ignore */
        }
      });
      if (flush) {
        setPlayback((p) => (p.currentTime === t ? p : { ...p, currentTime: t }));
      } else {
        scheduleSeekFrame();
      }
    },
    [isYoutube, scheduleSeekFrame],
  );

  const pauseStemAudios = useCallback(() => {
    stemAudioRefs.current.forEach((a) => {
      a.pause();
    });
  }, []);

  /** Hard-sync stem clocks to the main element and start playback (call after `main.play()` has settled). */
  const snapStemsToMainAndPlay = useCallback(() => {
    const main = localAudioRef.current ?? localVideoRef.current;
    if (!main) return;
    const mt = main.currentTime;
    if (!Number.isFinite(mt)) return;
    stemAudioRefs.current.forEach((a) => {
      try {
        a.currentTime = mt;
      } catch {
        /* ignore */
      }
      void a.play().catch(() => {
        /* ignore autoplay / decode races */
      });
    });
  }, []);

  /**
   * While the main track is playing: resume paused stems and correct large clock drift only.
   * Do **not** pause stems from here — `pauseUnified` / `onPause` on the main element handle that. A deferred pass
   * could otherwise read `main.paused` during a transient state and mute stems mid-playback.
   */
  const alignStemAudiosToMain = useCallback(() => {
    const main = localAudioRef.current ?? localVideoRef.current;
    if (!main || main.paused) return;
    const mt = main.currentTime;
    if (!Number.isFinite(mt)) return;

    stemAudioRefs.current.forEach((a) => {
      if (a.paused) void a.play().catch(() => {});
      try {
        if (Math.abs(a.currentTime - mt) > STANZA_STEM_ALIGN_DRIFT_SEC) a.currentTime = mt;
      } catch {
        /* ignore */
      }
    });
  }, []);

  /** Deferred drift pass after transport (main clock stable). */
  const scheduleAlignStemAudiosToMain = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        alignStemAudiosToMain();
      });
    });
  }, [alignStemAudiosToMain]);

  const playUnified = useCallback(() => {
    const t = readLiveTransportTime();
    timeRef.current = t;
    const d = durationRef.current;
    if (loopMode === 'loopAll' && d > 0) {
      if (t < 0 || t > d - STANZA_LOOP_EPS) seekUnified(0, { flushPlaybackState: true });
    } else if (loopMode === 'loopSelection' && effectiveSelectionSpan) {
      if (t < effectiveSelectionSpan.start - 0.05 || t > effectiveSelectionSpan.end - STANZA_LOOP_EPS) {
        seekUnified(effectiveSelectionSpan.start, { flushPlaybackState: true });
      }
    }
    if (isYoutube) ytControllerRef.current?.play();
    else {
      const main = localAudioRef.current ?? localVideoRef.current;
      if (!main) return;
      let stemMixerPrepared = false;
      if (stemWebAudioEnabled) {
        stemMixerPrepared = prepareStemMixerForPlaySync();
        if (!stemMixerPrepared) {
          restoreHtmlStemVolumes();
        }
      }
      const pr = main.play();
      if (stemWebAudioEnabled && stemMixerPrepared) {
        finalizeStemMixerResume();
      }
      // Same synchronous turn as the user gesture (transport / keyboard) so stem.play() keeps activation.
      snapStemsToMainAndPlay();
      const afterMainPlaying = () => {
        snapStemsToMainAndPlay();
        scheduleAlignStemAudiosToMain();
      };
      if (pr !== undefined && typeof (pr as Promise<void>).then === 'function') {
        void (pr as Promise<void>).then(afterMainPlaying).catch(() => {
          pauseStemAudios();
          if (stemWebAudioEnabled && stemMixerPrepared) {
            abandonWebAudioMix();
            restoreHtmlStemVolumes();
          }
        });
      } else {
        scheduleAlignStemAudiosToMain();
      }
    }
  }, [
    abandonWebAudioMix,
    finalizeStemMixerResume,
    isYoutube,
    loopMode,
    effectiveSelectionSpan,
    readLiveTransportTime,
    pauseStemAudios,
    prepareStemMixerForPlaySync,
    restoreHtmlStemVolumes,
    seekUnified,
    snapStemsToMainAndPlay,
    scheduleAlignStemAudiosToMain,
    stemWebAudioEnabled,
  ]);

  const pauseUnified = useCallback(() => {
    if (isYoutube) ytControllerRef.current?.pause();
    else {
      (localAudioRef.current ?? localVideoRef.current)?.pause();
      pauseStemAudios();
    }
  }, [isYoutube, pauseStemAudios]);

  const getTime = useCallback(() => timeRef.current, []);
  const getDuration = useCallback(() => durationRef.current, []);

  const transport = useMemo(
    () => ({
      play: playUnified,
      pause: pauseUnified,
      seek: seekUnified,
      setRate: applyPlaybackRate,
      getTime,
      getDuration,
    }),
    [applyPlaybackRate, getDuration, getTime, pauseUnified, playUnified, seekUnified],
  );

  useEffect(() => {
    if (loopMode === 'through') return;
    let raf = 0;
    const tick = () => {
      if (!playingRef.current) {
        raf = window.requestAnimationFrame(tick);
        return;
      }
      const tLive = readLiveTransportTime();
      timeRef.current = tLive;
      const d = durationRef.current;
      if (loopMode === 'loopAll' && d > 0) {
        if (tLive >= d - STANZA_LOOP_EPS) {
          seekUnified(0, { flushPlaybackState: true });
        }
      } else if (loopMode === 'loopSelection' && effectiveSelectionSpan) {
        if (tLive >= effectiveSelectionSpan.end - STANZA_LOOP_EPS) {
          seekUnified(effectiveSelectionSpan.start, { flushPlaybackState: true });
        } else if (tLive < effectiveSelectionSpan.start - STANZA_LOOP_EPS) {
          seekUnified(effectiveSelectionSpan.start, { flushPlaybackState: true });
        }
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [loopMode, effectiveSelectionSpan, readLiveTransportTime, seekUnified]);

  useEffect(() => {
    if (!selected) return;
    const id = window.setInterval(() => {
      if (!document.hasFocus()) return;
      if (!playingRef.current) return;
      const t = timeRef.current;
      const idx = findSegmentIndexAtTime(segments, t);
      if (idx === null) return;
      const seg = segments[idx];
      if (!seg) return;
      void (async () => {
        const row = await stanzaDb.songs.get(selected.id);
        if (!row) return;
        const prev = row.stats[seg.id]?.totalMs ?? 0;
        const stats = {
          ...row.stats,
          [seg.id]: {
            totalMs: prev + 1000,
            lastPracticed: Date.now(),
          },
        };
        void persistSong(
          {
            id: selected.id,
            stats,
          },
          { recordUndo: false },
        );
      })();
    }, 1000);
    return () => window.clearInterval(id);
  }, [selected, segments, persistSong]);

  useEffect(() => {
    if (!selected || conductorOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyM') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, [contenteditable=true], button')) return;
      e.preventDefault();
      const at = timeRef.current;
      const n = (selected.markers?.length ?? 0) + 1;
      const markers = [
        ...ensureMarkerIds(selected.markers ?? []),
        { id: crypto.randomUUID(), time: at, label: `Marker ${n}` },
      ];
      void persistSong({ id: selected.id, markers });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, conductorOpen, persistSong]);

  const addMarkerAtCurrentTime = useCallback(() => {
    if (!selected) return;
    const at = timeRef.current;
    const n = (selected.markers?.length ?? 0) + 1;
    const markers = [
      ...ensureMarkerIds(selected.markers ?? []),
      { id: crypto.randomUUID(), time: at, label: `Marker ${n}` },
    ];
    void persistSong({ id: selected.id, markers });
  }, [selected, persistSong]);

  const handleSelectSegments = useCallback(
    (i: number, event: React.MouseEvent) => {
      const seg = segments[i];
      if (!seg) return;
      setLastClickedSegmentIndex(i);
      if (event.shiftKey) {
        const anchor = segmentSelectionAnchor ?? i;
        const lo = Math.min(anchor, i);
        const hi = Math.max(anchor, i);
        setSelectedSegmentIndices(Array.from({ length: hi - lo + 1 }, (_, k) => lo + k));
      } else {
        setSegmentSelectionAnchor(i);
        setSelectedSegmentIndices([i]);
        seekUnified(seg.start);
      }
    },
    [segmentSelectionAnchor, segments, seekUnified],
  );

  const clearSegmentSelection = useCallback(() => {
    setSelectedSegmentIndices([]);
    setSegmentSelectionAnchor(null);
    setSectionSelectionExtend({ startDelta: 0, endDelta: 0 });
  }, []);

  const nudgeSectionSelectionExtend = useCallback((axis: 'start' | 'end', deltaSec: number) => {
    setSectionSelectionExtend((prev) =>
      axis === 'start'
        ? { ...prev, startDelta: prev.startDelta + deltaSec }
        : { ...prev, endDelta: prev.endDelta + deltaSec },
    );
  }, []);

  const applyMusicalSelectionPad = useCallback(() => {
    const pad = suggestMusicalLoopPadSec(selectedSegmentIndices, segments, selected?.metronomeBySegmentId);
    setSectionSelectionExtend((prev) => ({
      startDelta: prev.startDelta - pad,
      endDelta: prev.endDelta + pad,
    }));
  }, [selected?.metronomeBySegmentId, selectedSegmentIndices, segments]);

  const resetSectionSelectionExtend = useCallback(() => {
    setSectionSelectionExtend({ startDelta: 0, endDelta: 0 });
  }, []);

  const onLoopModeChange = useCallback(
    (m: StanzaPlaybackLoopMode) => {
      setLoopMode(m);
      if (m === 'loopSelection' && segments.length > 0) {
        setSelectedSegmentIndices((prev) => {
          if (prev.length > 0) return prev;
          const idx = findSegmentIndexAtTime(segments, timeRef.current) ?? 0;
          return [idx];
        });
      }
    },
    [segments],
  );

  const deleteMarkerById = useCallback(
    (markerId: string) => {
      if (!selected) return;
      void persistSong({
        id: selected.id,
        markers: ensureMarkerIds(selected.markers ?? []).filter((m) => m.id !== markerId),
      });
    },
    [persistSong, selected],
  );

  const joinSelectedContiguousSections = useCallback(() => {
    if (!selected || !areContiguousSegmentIndices(selectedSegmentIndices)) return;
    const d = playback.duration;
    if (!(d > 0)) return;
    const markers = ensureMarkerIds(selected.markers ?? []);
    const sorted = [...new Set(selectedSegmentIndices)].sort((a, b) => a - b);
    const i0 = sorted[0]!;
    const i1 = sorted[sorted.length - 1]!;
    if (i1 <= i0) return;
    const eps = STANZA_TIME_EPS * 3;
    const removeIds = new Set<string>();
    for (let k = i0; k < i1; k++) {
      const boundary = segments[k + 1]?.start;
      if (boundary == null) continue;
      for (const m of markers) {
        if (m.id && Math.abs(m.time - boundary) < eps) removeIds.add(m.id);
      }
    }
    const next = markers.filter((m) => m.id && !removeIds.has(m.id));
    void persistSong({ id: selected.id, markers: next });
    setSelectedSegmentIndices([i0]);
    setSegmentSelectionAnchor(i0);
  }, [persistSong, playback.duration, segments, selected, selectedSegmentIndices]);

  useEffect(() => {
    if (!selected || conductorOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.repeat) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest('input, textarea, [contenteditable="true"], button')) return;
      if (selectedSegmentIndices.length === 0) return;
      const d = playback.duration;
      if (!(d > 0)) return;
      const i = Math.min(...selectedSegmentIndices);
      const seg = segments[i];
      if (!seg) return;
      const m = deletableBoundaryMarkerAtTime(seg.start, ensureMarkerIds(selected.markers ?? []), d);
      if (!m?.id) return;
      e.preventDefault();
      const next = ensureMarkerIds(selected.markers ?? []).filter((x) => x.id !== m.id);
      void persistSong({ id: selected.id, markers: next });
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [
    conductorOpen,
    persistSong,
    playback.duration,
    segments,
    selected,
    selectedSegmentIndices,
  ]);

  const renameSectionFromLabel = useCallback(
    (segmentIndex: number, label: string) => {
      if (!selected) return;
      const seg = segments[segmentIndex];
      if (!seg) return;
      const sorted = [...ensureMarkerIds(selected.markers ?? [])].sort((a, b) => a.time - b.time);
      const at = sorted.find((m) => Math.abs(m.time - seg.start) < STANZA_TIME_EPS);
      if (at) {
        void persistSong({
          id: selected.id,
          markers: sorted.map((m) => (m.id === at.id ? { ...m, label } : m)),
        });
        return;
      }
      if (seg.start < STANZA_TIME_EPS) {
        void persistSong({
          id: selected.id,
          markers: [{ id: crypto.randomUUID(), time: 0, label }, ...sorted.filter((m) => m.time > STANZA_TIME_EPS)],
        });
        return;
      }
      void persistSong({
        id: selected.id,
        markers: [...sorted, { id: crypto.randomUUID(), time: seg.start, label }].sort((a, b) => a.time - b.time),
      });
    },
    [persistSong, selected, segments],
  );

  const skipToLoopStart = useCallback(() => {
    if (loopMode === 'through' || loopMode === 'loopAll') seekUnified(0);
    else if (effectiveSelectionSpan) seekUnified(effectiveSelectionSpan.start);
  }, [effectiveSelectionSpan, loopMode, seekUnified]);

  const skipToLoopEnd = useCallback(() => {
    const d = durationRef.current;
    if (!(d > 0)) return;
    if (loopMode === 'through' || loopMode === 'loopAll') {
      seekUnified(Math.max(0, d - STANZA_TIME_EPS));
    } else if (effectiveSelectionSpan) {
      seekUnified(Math.max(effectiveSelectionSpan.start, effectiveSelectionSpan.end - STANZA_TIME_EPS));
    }
  }, [effectiveSelectionSpan, loopMode, seekUnified]);

  useMetronomeSync(
    Boolean(selected?.metronomeEnabled && playbackMetCal?.bpm && playbackMetCal.bpm > 0),
    playbackMetCal?.bpm,
    playbackMetCal?.anchorMediaTime,
    getTime,
    playback.isPlaying,
    true,
  );

  const beatPeriod =
    playbackMetCal?.bpm && playbackMetCal.bpm > 0 ? `${60 / playbackMetCal.bpm}s` : '1s';

  useEffect(() => {
    if (!selected?.metronomeEnabled || !playback.isPlaying || !playbackMetSeg) {
      setMetronomeSectionHint(null);
      return;
    }
    if (playbackMetCal) {
      setMetronomeSectionHint(null);
      metronomeHintDismissedSegRef.current = null;
      return;
    }
    if (metronomeHintDismissedSegRef.current === playbackMetSeg.id) {
      setMetronomeSectionHint(null);
      return;
    }
    const id = window.setTimeout(() => {
      setMetronomeSectionHint('Calibrate this section (Metronome below) to hear synced clicks here.');
    }, 1200);
    return () => window.clearTimeout(id);
  }, [selected?.metronomeEnabled, playback.isPlaying, playbackMetSeg, playbackMetCal]);

  const saveSegmentMetronome = useCallback(
    (segmentId: string, cal: StanzaSegmentMetronomeCalibration) => {
      if (!selected) return;
      const prev = selected.metronomeBySegmentId ?? {};
      void persistSong({
        id: selected.id,
        metronomeBySegmentId: { ...prev, [segmentId]: cal },
        metronomeEnabled: true,
      });
    },
    [persistSong, selected],
  );

  const clearSegmentMetronome = useCallback(
    (segmentId: string) => {
      if (!selected) return;
      const prev = selected.metronomeBySegmentId ?? {};
      const rest = { ...prev };
      delete rest[segmentId];
      void persistSong({
        id: selected.id,
        metronomeBySegmentId: Object.keys(rest).length > 0 ? rest : undefined,
      });
    },
    [persistSong, selected],
  );

  const startFreeformRecord = useCallback(async () => {
    if (!selected || segments.length === 0) return;
    const idx =
      lastClickedSegmentIndex ??
      (selectedSegmentIndices.length > 0 ? Math.min(...selectedSegmentIndices) : null) ??
      findSegmentIndexAtTime(segments, timeRef.current) ??
      0;
    const seg = segments[idx];
    if (!seg) return;
    recChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recStreamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const rec = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = rec;
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) recChunksRef.current.push(ev.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        recStreamRef.current = null;
        mediaRecorderRef.current = null;
        const blob = new Blob(recChunksRef.current, { type: mime });
        recChunksRef.current = [];
        const take: StanzaTake = {
          id: crypto.randomUUID(),
          songId: selected.id,
          segmentId: seg.id,
          blob,
          isGuided: false,
          createdAt: Date.now(),
        };
        await stanzaDb.takes.add(take);
        if (!isReplayingRef.current) {
          const snap = structuredClone(take);
          pushUndo({
            undo: async () => {
              await stanzaDb.takes.delete(snap.id);
            },
            redo: async () => {
              await stanzaDb.takes.put(snap);
            },
          });
        }
        setRecState('idle');
      };
      rec.start();
      setRecState('recording');
    } catch (err) {
      console.error('Stanza: record failed', err);
    }
  }, [lastClickedSegmentIndex, selectedSegmentIndices, segments, selected, isReplayingRef, pushUndo]);

  const stopFreeformRecord = useCallback(() => {
    const r = mediaRecorderRef.current;
    if (r && r.state !== 'inactive') r.stop();
  }, []);

  const saveGuidedTake = useCallback(
    async (blob: Blob, segmentId: string) => {
      if (!selected) return;
      const take: StanzaTake = {
        id: crypto.randomUUID(),
        songId: selected.id,
        segmentId,
        blob,
        isGuided: true,
        createdAt: Date.now(),
      };
      await stanzaDb.takes.add(take);
      if (!isReplayingRef.current) {
        const snap = structuredClone(take);
        pushUndo({
          undo: async () => {
            await stanzaDb.takes.delete(snap.id);
          },
          redo: async () => {
            await stanzaDb.takes.put(snap);
          },
        });
      }
    },
    [selected, isReplayingRef, pushUndo],
  );

  const safeGuidedIndex =
    segments.length === 0 ? 0 : Math.min(guidedSegmentIndex, Math.max(0, segments.length - 1));
  const conductorSegment = segments[safeGuidedIndex];

  const prevConductorOpen = useRef(false);
  useEffect(() => {
    if (conductorOpen && !prevConductorOpen.current) {
      setGuidedSinceCp(0);
    }
    prevConductorOpen.current = conductorOpen;
  }, [conductorOpen]);

  const goHome = useCallback(() => {
    setSelectedId(null);
    replaceStanzaPlaybackUrlSearchParams({ youtubeId: null, driveFileId: null, driveTitle: null });
  }, []);

  const renderLibraryGrid = (variant: 'landing' | 'footer') => (
    <Box
      className="stanza-library-grid"
      sx={variant === 'landing' ? { maxHeight: { xs: 360, sm: 400 } } : { maxHeight: { xs: 280, sm: 360 } }}
    >
      {sortedLibrarySongs.length === 0 ? (
        <Box sx={{ gridColumn: '1 / -1', py: 3, px: 1, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '28rem', mx: 'auto', lineHeight: 1.55 }}>
            No items yet. Paste a YouTube link or upload audio above to add your first piece.
          </Typography>
        </Box>
      ) : (
        sortedLibrarySongs.map((s) => (
        <Box key={s.id} sx={{ position: 'relative' }}>
          <button
            type="button"
            className={`stanza-library-card${s.id === selectedId ? ' stanza-library-card--selected' : ''}`}
            onClick={() => setSelectedId(s.id)}
            aria-current={s.id === selectedId ? 'true' : undefined}
          >
            {s.ytId ? (
              <img className="stanza-library-card-thumb" src={youtubeMqThumbnailUrl(s.ytId)} alt="" loading="lazy" />
            ) : (
              <StanzaLibraryLocalThumb song={s} />
            )}
            <Box sx={{ p: 1, pt: 0.75 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {s.title}
              </Typography>
              {!songHasPractice(s) && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                  Not started
                </Typography>
              )}
            </Box>
          </button>
          <IconButton
            type="button"
            size="small"
            aria-label={`More actions for ${s.title}`}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setLibraryMenu({ anchor: e.currentTarget, songId: s.id });
            }}
            sx={{ position: 'absolute', right: 2, top: 2, bgcolor: 'rgba(255,253,250,0.92)', '&:hover': { bgcolor: 'rgba(255,253,250,1)' } }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>
        ))
      )}
    </Box>
  );

  const libraryMenuSong = libraryMenu ? songs?.find((x) => x.id === libraryMenu.songId) : null;

  const renderDriveDeepLinkAlerts = (): ReactNode => {
    const showLoading = driveDeepLinkBusy && !driveDeepLinkError && !driveDeepLinkNeedsGesture;
    if (!driveDeepLinkError && !driveDeepLinkNeedsGesture && !showLoading) return null;
    return (
      <>
        {showLoading ? (
          <Alert severity="info" sx={{ maxWidth: 560, mx: 'auto', mb: 2, width: '100%' }}>
            <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
              Fetching audio from Google Drive…
            </Typography>
          </Alert>
        ) : null}
        {driveDeepLinkNeedsGesture && !driveDeepLinkError ? (
          <Alert
            severity="info"
            sx={{ maxWidth: 560, mx: 'auto', mb: 2, width: '100%' }}
            action={
              <Button
                color="inherit"
                size="small"
                disabled={driveDeepLinkBusy}
                onClick={() => void completeGestureDriveImport()}
              >
                {driveDeepLinkBusy ? '…' : 'Continue'}
              </Button>
            }
          >
            <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
              {LABS_GOOGLE_INTERACTIVE_DRIVE_AUTH_HINT}
            </Typography>
          </Alert>
        ) : null}
        {driveDeepLinkError ? (
          <Alert
            severity="error"
            sx={{
              maxWidth: 560,
              mx: 'auto',
              mb: 2,
              width: '100%',
              '& .MuiAlert-message': { width: '100%' },
            }}
            onClose={() => setDriveDeepLinkError(null)}
            action={
              /popup|Allow popups|sign-in window|blocked/i.test(driveDeepLinkError) ? (
                <Button
                  color="inherit"
                  size="small"
                  disabled={driveDeepLinkBusy}
                  onClick={() => void completeGestureDriveImport()}
                >
                  Retry
                </Button>
              ) : undefined
            }
          >
            <Stack spacing={1}>
              <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                {driveDeepLinkError}
              </Typography>
              {/popup|Allow popups|sign-in window|blocked/i.test(driveDeepLinkError) ? (
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                  Popups blocked here are common even when your email shows in the account menu — that menu only remembers who you last signed in as in Encore.{' '}
                  <Link href="/encore/" target="_blank" rel="noopener noreferrer">
                    Open Encore
                  </Link>
                  , finish Google sign-in from the account menu if asked, then come back and Retry (keep this tab).
                </Typography>
              ) : null}
            </Stack>
          </Alert>
        ) : null}
      </>
    );
  };

  return (
    <Box
      className={`stanza-root${selected ? ' stanza-viewer-root' : ''}`}
      sx={{
        maxWidth: selected ? 960 : 'none',
        mx: 'auto',
        display: selected ? 'flex' : 'block',
        flexDirection: selected ? 'column' : undefined,
        minHeight: selected ? '100dvh' : undefined,
        bgcolor: 'transparent',
      }}
    >
      {/* Window-level drop overlay. Shown only while the user is dragging files into the page;
          `pointer-events: none` lets the drop event continue through to the window listener in
          `useStanzaFileDrop`. Decorative (`aria-hidden`) — drag-and-drop is mouse-only UX and
          the keyboard upload buttons remain available below. */}
      {isFileDragging ? (
        <Box
          aria-hidden
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(168, 85, 247, 0.12)',
            backdropFilter: 'blur(4px)',
            transition: 'opacity 80ms ease-out',
          }}
        >
          <Box
            sx={{
              border: '2px dashed rgba(168, 85, 247, 0.6)',
              borderRadius: 3,
              px: 4,
              py: 3,
              bgcolor: 'rgba(255, 255, 255, 0.92)',
              boxShadow: '0 18px 48px rgba(76, 29, 149, 0.18)',
              maxWidth: 420,
              textAlign: 'center',
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#4c1d95', mb: 0.5 }}>
              {selected ? 'Drop to add audio' : 'Drop to load audio'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#5b21b6', lineHeight: 1.5 }}>
              {selected
                ? "Files that match this track's length attach as stems. Otherwise Stanza adds a new library song from the first file."
                : 'Stanza saves to your local library and selects the piece. With a song open, matching-length files become stems.'}
            </Typography>
          </Box>
        </Box>
      ) : null}
      {!selected && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: { xs: 1.5, sm: 2 }, pt: { xs: 1, sm: 1.25 } }}>
            <StanzaAccountMenu />
          </Box>
          <Box sx={{ px: { xs: 1.5, sm: 2 } }}>{renderDriveDeepLinkAlerts()}</Box>
          <Box className="stanza-hero">
            <Box className="stanza-hero-inner">
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <StanzaRepeatMark size={80} />
              </Box>
              <Typography
                variant="h3"
                component="h1"
                className="stanza-hero-title"
                sx={{ mb: 1, fontSize: { xs: '2.35rem', sm: '2.75rem' } }}
              >
                Stanza
              </Typography>
              <Typography
                variant="h6"
                component="p"
                className="stanza-hero-lede"
                sx={{ mb: 3, maxWidth: '36ch', mx: 'auto' }}
              >
                Practice songs in sections — loop, record, and let the Conductor guide your next pass.
              </Typography>
              <TextField
                className="stanza-hero-url"
                fullWidth
                label="Paste a YouTube link or video ID"
                value={ytPaste}
                onChange={(e) => setYtPaste(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=…"
                autoComplete="url"
                inputProps={{ enterKeyHint: 'go' }}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  if (canResolveYoutubePaste(ytPaste)) void addYoutubeSong();
                }}
              />
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                sx={{ mt: 2.5, justifyContent: 'center', alignItems: 'stretch' }}
              >
                <Button
                  variant="contained"
                  size="large"
                  className="stanza-btn-pill"
                  onClick={() => void addYoutubeSong()}
                  disabled={!canResolveYoutubePaste(ytPaste)}
                  aria-label="Load YouTube video"
                  sx={{ minHeight: 52, px: 3 }}
                >
                  Load video
                </Button>
                <Button
                  component="label"
                  variant="outlined"
                  size="large"
                  className="stanza-btn-soft-outline"
                  sx={{ minHeight: 52, px: 3 }}
                >
                  Upload audio file
                  <input
                    hidden
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void addLocalSong(f);
                      e.target.value = '';
                    }}
                  />
                </Button>
              </Stack>
              {/* Discovery hint for the window-level drop zone. Kept understated — power users
                  will notice once they try; it's not blocking the keyboard / button paths. */}
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  textAlign: 'center',
                  mt: 1.5,
                  color: 'rgba(76, 29, 149, 0.55)',
                  fontWeight: 500,
                  letterSpacing: '0.01em',
                }}
              >
                or drop an audio file anywhere on the page
              </Typography>
            </Box>
          </Box>
          {(songs?.length ?? 0) > 0 && (
            <Paper className="stanza-panel" elevation={0} sx={{ maxWidth: '56rem', mx: 'auto', mt: 1, mb: 3, px: 2, py: 2 }}>
              <Typography variant="subtitle2" className="stanza-whisper-title" sx={{ mb: 1.5 }}>
                Your library
              </Typography>
              {renderLibraryGrid('landing')}
            </Paper>
          )}
        </>
      )}

      {selected && (
        <Box className="stanza-viewer-shell" sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Box sx={{ px: { xs: 1.5, sm: 2 }, pt: 1, flexShrink: 0 }}>{renderDriveDeepLinkAlerts()}</Box>
          <Box
            className="stanza-viewer-header"
            sx={{
              px: { xs: 1.5, sm: 2 },
              pt: { xs: 1.25, sm: 1.5 },
              pb: 1,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            <StanzaRepeatMark size={40} />
            <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
              <Typography variant="h5" component="h1" className="stanza-display-title">
                {selected.title}
              </Typography>
              <button type="button" className="stanza-link-quiet" onClick={goHome} aria-label="Back to library" style={{ marginTop: 6 }}>
                ← Back to library
              </button>
            </Box>
            <Box sx={{ flexShrink: 0, ml: 'auto', alignSelf: 'flex-start' }}>
              <StanzaAccountMenu />
            </Box>
          </Box>

          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', px: { xs: 1.5, sm: 2 }, pt: { md: 0.5 }, pb: { xs: 1.25, md: 1.75 } }}>
            <Box
              className="stanza-viewer-body-grid"
              sx={{
                display: 'grid',
                width: '100%',
                maxWidth: { md: 1280 },
                mx: 'auto',
                alignContent: 'start',
                alignItems: { xs: 'start', md: 'stretch' },
                rowGap: { xs: 1.25, md: 1.75 },
                columnGap: { xs: 1.25, md: 2 },
                gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(308px, 360px)' },
                gridTemplateAreas: {
                  xs: '"media" "timeline" "rail"',
                  md: '"media rail" "timeline timeline"',
                },
              }}
            >
              <Box
                className="stanza-viewer-media-stack"
                sx={{
                  gridArea: 'media',
                  minWidth: 0,
                  width: { xs: '100%', md: 'min(100%, 600px)' },
                  maxWidth: { md: 600 },
                  justifySelf: { md: 'end' },
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  justifyContent: 'flex-start',
                  minHeight: { md: '100%' },
                }}
              >
                <Box className="stanza-video-column">
                  {isYoutube && selected.ytId && youtubePlayerErrorCode != null && (
                    <Alert severity="warning" sx={{ mb: 1.5 }}>
                      <Typography variant="body2" sx={{ mb: 0.75 }}>
                        {describeYoutubePlayerError(youtubePlayerErrorCode)}
                      </Typography>
                      <Link
                        href={`https://www.youtube.com/watch?v=${encodeURIComponent(selected.ytId)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="body2"
                        underline="hover"
                      >
                        Open this video on YouTube
                      </Link>
                    </Alert>
                  )}
                  <Box
                    className={selected.metronomeEnabled ? 'stanza-metronome-pulse stanza-metronome-pulse--on' : 'stanza-metronome-pulse'}
                    sx={{ '--stanza-beat': beatPeriod } as React.CSSProperties}
                  >
                    {isYoutube && selected.ytId && (
                      <StanzaYouTubePlayer
                        videoId={selected.ytId}
                        onPlayerError={setYoutubePlayerErrorCode}
                        onControllerReady={(c) => {
                          ytControllerRef.current = c;
                          if (!c) return;
                          const p = pendingYoutubeBootstrapRef.current;
                          if (p && p.songId === selected.id) {
                            if (p.seekSec != null) c.seekTo(p.seekSec);
                            if (p.rate != null) c.setPlaybackRate(p.rate);
                            pendingYoutubeBootstrapRef.current = null;
                            if (p.seekSec != null || p.rate != null) {
                              setPlayback((prev) => ({
                                ...prev,
                                currentTime: p.seekSec ?? prev.currentTime,
                                playbackRate: p.rate ?? prev.playbackRate,
                              }));
                            }
                          }
                        }}
                        onStateChange={(s) => {
                          setPlayback(s);
                        }}
                      />
                    )}
                    {!isYoutube && localUrl && (
                      <>
                        {isLocalVideo ? (
                          /* eslint-disable-next-line jsx-a11y/media-has-caption -- user recording; no captions */
                          <video
                            ref={localVideoRef}
                            className="stanza-local-video"
                            src={localUrl}
                            playsInline
                            aria-label="Local video track. Click to play or pause."
                            onClick={() => {
                              const v = localVideoRef.current;
                              if (!v) return;
                              if (v.paused) playUnified();
                              else pauseUnified();
                            }}
                            onTimeUpdate={() => {
                              const el = localVideoRef.current;
                              if (!el) return;
                              const fd = readPositiveFiniteMediaDurationSec(el);
                              setPlayback((p) => ({
                                currentTime: el.currentTime,
                                duration: fd ?? p.duration,
                                isPlaying: !el.paused,
                                playbackRate: el.playbackRate,
                              }));
                            }}
                            onLoadedMetadata={() => {
                              const el = localVideoRef.current;
                              if (!el) return;
                              const fd = readPositiveFiniteMediaDurationSec(el);
                              setPlayback((p) => ({
                                ...p,
                                duration: fd ?? p.duration,
                                playbackRate: el.playbackRate,
                              }));
                            }}
                            onDurationChange={() => {
                              const el = localVideoRef.current;
                              if (!el) return;
                              const fd = readPositiveFiniteMediaDurationSec(el);
                              if (fd == null) return;
                              setPlayback((p) => (p.duration === fd ? p : { ...p, duration: fd }));
                            }}
                            onPlay={() => {
                              snapStemsToMainAndPlay();
                              scheduleAlignStemAudiosToMain();
                              setPlayback((p) => ({ ...p, isPlaying: true }));
                            }}
                            onPause={() => {
                              pauseStemAudios();
                              setPlayback((p) => ({ ...p, isPlaying: false }));
                            }}
                          />
                        ) : (
                          /* eslint-disable-next-line jsx-a11y/media-has-caption -- user-supplied audio; no captions */
                          <audio
                            ref={localAudioRef}
                            className="stanza-local-audio"
                            src={localUrl}
                            style={{ width: '100%', marginTop: 8, borderRadius: 8 }}
                            aria-label="Local audio track"
                            onTimeUpdate={() => {
                              const el = localAudioRef.current;
                              if (!el) return;
                              const fd = readPositiveFiniteMediaDurationSec(el);
                              setPlayback((p) => ({
                                currentTime: el.currentTime,
                                duration: fd ?? p.duration,
                                isPlaying: !el.paused,
                                playbackRate: el.playbackRate,
                              }));
                            }}
                            onLoadedMetadata={() => {
                              const el = localAudioRef.current;
                              if (!el) return;
                              const fd = readPositiveFiniteMediaDurationSec(el);
                              setPlayback((p) => ({
                                ...p,
                                duration: fd ?? p.duration,
                                playbackRate: el.playbackRate,
                              }));
                            }}
                            onDurationChange={() => {
                              const el = localAudioRef.current;
                              if (!el) return;
                              const fd = readPositiveFiniteMediaDurationSec(el);
                              if (fd == null) return;
                              setPlayback((p) => (p.duration === fd ? p : { ...p, duration: fd }));
                            }}
                            onPlay={() => {
                              snapStemsToMainAndPlay();
                              scheduleAlignStemAudiosToMain();
                              setPlayback((p) => ({ ...p, isPlaying: true }));
                            }}
                            onPause={() => {
                              pauseStemAudios();
                              setPlayback((p) => ({ ...p, isPlaying: false }));
                            }}
                          />
                        )}
                        {!isYoutube &&
                          (selected.stems ?? []).map((stem) => {
                            const src = stemUrlById[stem.id];
                            if (!src) return null;
                            return (
                              <Fragment key={stem.id}>
                                {/* eslint-disable-next-line jsx-a11y/media-has-caption -- user-provided stem; no captions */}
                                <audio
                                  ref={(el) => {
                                    const m = stemAudioRefs.current;
                                    if (el) m.set(stem.id, el);
                                    else m.delete(stem.id);
                                  }}
                                  src={src}
                                  preload="auto"
                                  aria-hidden
                                  style={{ display: 'none' }}
                                />
                              </Fragment>
                            );
                          })}
                      </>
                    )}
                  </Box>
                </Box>
              </Box>

              <Paper
                className="stanza-panel stanza-practice-rail stanza-practice-rail--dense"
                elevation={0}
                sx={{
                  gridArea: 'rail',
                  width: { xs: '100%', md: '100%' },
                  maxWidth: { md: 360 },
                  justifySelf: { md: 'stretch' },
                  alignSelf: { md: 'stretch' },
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                  height: { md: '100%' },
                  p: { xs: 1.1, md: 1.25 },
                }}
              >
                <Typography component="p" className="stanza-rail-section-label" sx={{ mb: 0.35, flexShrink: 0 }}>
                  Practice
                </Typography>
                <Stack spacing={0.65} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.25 }}>
                  <Box>
                    <Typography className="stanza-rail-section-label stanza-rail-section-label--minor">Metronome</Typography>
                    {metronomeSectionHint && (
                      <Alert
                        severity="info"
                        sx={{ mt: 0.35, mb: 0.35, py: 0.25 }}
                        onClose={() => {
                          if (playbackMetSeg) metronomeHintDismissedSegRef.current = playbackMetSeg.id;
                          setMetronomeSectionHint(null);
                        }}
                      >
                        <Typography variant="body2">{metronomeSectionHint}</Typography>
                      </Alert>
                    )}
                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.15 }}>
                      <AppTooltip
                        title={
                          selected.metronomeEnabled
                            ? 'Clicks play only in sections you calibrate below.'
                            : 'Turn on to hear synced clicks while playing calibrated sections.'
                        }
                      >
                        <MetronomeToggleButton
                          enabled={Boolean(selected.metronomeEnabled)}
                          onToggle={() =>
                            void persistSong({ id: selected.id, metronomeEnabled: !selected.metronomeEnabled })
                          }
                          className="stanza-metronome-toggle stanza-metronome-toggle--rail"
                          includeNativeTitle={false}
                          includeDataTooltip={false}
                          ariaLabel="Toggle metronome"
                        />
                      </AppTooltip>
                    </Stack>
                    {railCalibSeg && (
                      <StanzaSectionMetronomeRail
                        segment={railCalibSeg}
                        calibration={selected.metronomeBySegmentId?.[railCalibSeg.id]}
                        canAnalyze={!isYoutube && Boolean(selected.localAudioBlob && localUrl)}
                        analyzeDisabledReason={
                          isYoutube
                            ? 'Automatic tempo detection is available only for uploaded audio or video files.'
                            : !selected.localAudioBlob
                              ? 'Add a local audio or video file to use analysis.'
                              : undefined
                        }
                        localAudioBlob={selected.localAudioBlob}
                        localSongTitle={selected.title}
                        mediaUrl={localUrl ?? ''}
                        isLocalVideo={isLocalVideo}
                        getMediaTime={getTime}
                        playbackIsPlaying={playback.isPlaying}
                        onSaveCalibration={(cal) => saveSegmentMetronome(railCalibSeg.id, cal)}
                        onClearCalibration={() => clearSegmentMetronome(railCalibSeg.id)}
                      />
                    )}
                  </Box>
                  <Box>
                    <Typography className="stanza-rail-section-label stanza-rail-section-label--minor">Conductor</Typography>
                    <Stack direction="row" spacing={0.5} alignItems="stretch" sx={{ mt: 0.2 }}>
                      <AppTooltip title="Listen, record, and review for the current loop section. Regimen sets the emphasis.">
                        <Button
                          variant="contained"
                          size="small"
                          className="stanza-btn-pill stanza-rail-compact-btn"
                          sx={{ flex: 1, minWidth: 0, py: 0.45, fontWeight: 600, fontSize: '0.75rem' }}
                          disabled={segments.length === 0}
                          onClick={() => {
                            setGuidedSegmentIndex(lastClickedSegmentIndex ?? selectedSegmentIndices[0] ?? 0);
                            setConductorOpen(true);
                          }}
                        >
                          Guided
                        </Button>
                      </AppTooltip>
                      <Select
                        size="small"
                        value={regimen}
                        onChange={(e) => setRegimen(e.target.value as GuidedRegimen)}
                        aria-label="Guided regimen"
                        sx={{
                          flex: '0 0 108px',
                          fontSize: '0.75rem',
                          borderRadius: 1.5,
                          '& .MuiSelect-select': { py: 0.45, pl: 1, pr: 2 },
                        }}
                      >
                        <MenuItem value="rhythm">Rhythm</MenuItem>
                        <MenuItem value="accuracy">Accuracy</MenuItem>
                        <MenuItem value="performance">Performance</MenuItem>
                      </Select>
                    </Stack>
                  </Box>
                  <Box>
                    <Typography className="stanza-rail-section-label stanza-rail-section-label--minor">Takes</Typography>
                    <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.15 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        className="stanza-btn-soft-outline stanza-rail-compact-btn"
                        sx={{ minHeight: 30, py: 0.25, fontSize: '0.75rem' }}
                        onClick={() => (recState === 'recording' ? stopFreeformRecord() : void startFreeformRecord())}
                        aria-label={recState === 'recording' ? 'Stop recording' : 'Record take'}
                      >
                        {recState === 'recording' ? 'Stop' : 'Record'}
                      </Button>
                      <button
                        type="button"
                        className="stanza-link-quiet"
                        style={{ fontSize: '0.75rem' }}
                        onClick={() => {
                          clearSegmentSelection();
                          setLoopMode('through');
                        }}
                        aria-label="Clear section selection"
                      >
                        Clear
                      </button>
                    </Stack>
                  </Box>
                  {!isYoutube ? (
                    <Box className="stanza-mix-block" sx={{ pt: 0.15 }}>
                      <Typography className="stanza-rail-section-label stanza-rail-section-label--minor" sx={{ mb: 0.25 }}>
                        Mix
                      </Typography>
                      <Stack spacing={0.2} className="stanza-mix-rows">
                        <Box
                          className="stanza-mix-row"
                          sx={{ display: 'flex', alignItems: 'center', gap: 0.25, minHeight: 32 }}
                        >
                          <Box sx={{ width: STANZA_MIX_DRAG_COL_PX, flexShrink: 0 }} aria-hidden />
                          <AppTooltip title={primaryPlaybackMuted(selected) ? 'Unmute main track' : 'Mute main track'}>
                            <IconButton
                              size="small"
                              aria-label={primaryPlaybackMuted(selected) ? 'Unmute main track' : 'Mute main track'}
                              onClick={() =>
                                void persistSong({
                                  id: selected.id,
                                  primaryMuted: !primaryPlaybackMuted(selected),
                                })
                              }
                              sx={{ p: 0.35, alignSelf: 'center' }}
                            >
                              {primaryPlaybackMuted(selected) ? (
                                <VolumeOffOutlinedIcon sx={{ fontSize: 18 }} />
                              ) : (
                                <VolumeUpOutlinedIcon sx={{ fontSize: 18 }} />
                              )}
                            </IconButton>
                          </AppTooltip>
                          <Typography
                            component="span"
                            noWrap
                            title="Main file"
                            sx={(theme) => ({
                              ...stanzaMixTrackLabelSurfaceSx(theme),
                              flex: '0 1 auto',
                              minWidth: 0,
                              maxWidth: STANZA_MIX_LABEL_MAX_WIDTH,
                              alignSelf: 'center',
                            })}
                          >
                            Main
                          </Typography>
                          <AppLinearVolumeSlider
                            value={stanzaSanitizeLinearBusGain(selected.primaryGain)}
                            onChange={(_, v) =>
                              void persistSong({
                                id: selected.id,
                                primaryGain: stanzaSanitizeLinearBusGain(v as number),
                              })
                            }
                            aria-label="Main track level"
                            sx={{
                              alignSelf: 'center',
                              opacity: primaryPlaybackMuted(selected) ? 0.42 : 1,
                              transition: 'opacity 0.15s ease',
                            }}
                          />
                          <Box sx={{ width: STANZA_MIX_TRAIL_BALANCE_PX, flexShrink: 0 }} aria-hidden />
                        </Box>
                        {(selected.stems ?? []).map((stem) => (
                          <Box
                            key={stem.id}
                            className="stanza-mix-row"
                            onDragOver={(e) => {
                              if (!Array.from(e.dataTransfer.types).includes(STANZA_STEM_REORDER_MIME)) return;
                              e.preventDefault();
                              e.stopPropagation();
                              e.dataTransfer.dropEffect = 'move';
                              setStemReorderOverId(stem.id);
                            }}
                            onDragLeave={(e) => {
                              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                              setStemReorderOverId((id) => (id === stem.id ? null : id));
                            }}
                            onDrop={(e) => {
                              if (!Array.from(e.dataTransfer.types).includes(STANZA_STEM_REORDER_MIME)) return;
                              e.preventDefault();
                              e.stopPropagation();
                              const fromId = e.dataTransfer.getData(STANZA_STEM_REORDER_MIME);
                              setStemReorderDragId(null);
                              setStemReorderOverId(null);
                              if (!fromId || fromId === stem.id) return;
                              void reorderStemsPersist(fromId, stem.id);
                            }}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.25,
                              minHeight: 32,
                              borderRadius: 0.75,
                              outline:
                                stemReorderOverId === stem.id && stemReorderDragId && stemReorderDragId !== stem.id
                                  ? '1px dashed rgba(232, 72, 160, 0.55)'
                                  : 'none',
                              outlineOffset: 1,
                            }}
                          >
                            <Box
                              sx={{
                                width: STANZA_MIX_DRAG_COL_PX,
                                flexShrink: 0,
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}
                            >
                              <AppTooltip title="Drag to reorder">
                                <Box
                                  component="span"
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData(STANZA_STEM_REORDER_MIME, stem.id);
                                    e.dataTransfer.effectAllowed = 'move';
                                    setStemReorderDragId(stem.id);
                                  }}
                                  onDragEnd={() => {
                                    setStemReorderDragId(null);
                                    setStemReorderOverId(null);
                                  }}
                                  sx={{
                                    cursor: 'grab',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    touchAction: 'none',
                                    color: 'text.secondary',
                                    '&:active': { cursor: 'grabbing' },
                                  }}
                                >
                                  <DragIndicatorIcon sx={{ fontSize: 18 }} aria-hidden />
                                </Box>
                              </AppTooltip>
                            </Box>
                            <AppTooltip title={stemPlaybackMuted(stem) ? 'Unmute layer' : 'Mute layer'}>
                              <IconButton
                                size="small"
                                aria-label={stemPlaybackMuted(stem) ? `Unmute ${stem.label}` : `Mute ${stem.label}`}
                                onClick={() =>
                                  void persistSong({
                                    id: selected.id,
                                    stems: (selected.stems ?? []).map((s) =>
                                      s.id === stem.id ? { ...s, muted: !stemPlaybackMuted(s) } : s,
                                    ),
                                  })
                                }
                                sx={{ p: 0.35, alignSelf: 'center' }}
                              >
                                {stemPlaybackMuted(stem) ? (
                                  <VolumeOffOutlinedIcon sx={{ fontSize: 18 }} />
                                ) : (
                                  <VolumeUpOutlinedIcon sx={{ fontSize: 18 }} />
                                )}
                              </IconButton>
                            </AppTooltip>
                            <Box
                              sx={{
                                flex: '0 1 auto',
                                minWidth: 0,
                                maxWidth: STANZA_MIX_LABEL_MAX_WIDTH,
                                display: 'flex',
                                alignItems: 'center',
                                minHeight: 30,
                              }}
                            >
                              {stemInlineEdit?.stemId === stem.id ? (
                                <TextField
                                  hiddenLabel
                                  size="small"
                                  fullWidth={false}
                                  value={stemInlineEdit.value}
                                  onChange={(e) => setStemInlineEdit({ stemId: stem.id, value: e.target.value })}
                                  onBlur={(e) =>
                                    void finishStemInlineEdit(stem.id, (e.target as HTMLInputElement).value, stem.label)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                      e.preventDefault();
                                      setStemInlineEdit(null);
                                    }
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      void finishStemInlineEdit(
                                        stem.id,
                                        (e.target as HTMLInputElement).value,
                                        stem.label,
                                      );
                                    }
                                  }}
                                  inputProps={{ 'aria-label': 'Layer name' }}
                                  // eslint-disable-next-line jsx-a11y/no-autofocus -- inline rename: move focus from label into field
                                  autoFocus
                                  variant="outlined"
                                  margin="none"
                                  sx={(theme) => ({
                                    flex: '0 1 auto',
                                    maxWidth: '100%',
                                    alignSelf: 'center',
                                    '& .MuiOutlinedInput-root': {
                                      ...stanzaMixTrackLabelSurfaceSx(theme),
                                      paddingLeft: 8,
                                      paddingRight: 8,
                                      minHeight: 30,
                                    },
                                    '& .MuiOutlinedInput-notchedOutline': {
                                      borderColor: alpha(theme.palette.text.primary, 0.16),
                                    },
                                    '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                                      borderColor: alpha(theme.palette.text.primary, 0.28),
                                    },
                                    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                      borderWidth: 1,
                                      borderColor: alpha(theme.palette.primary.main, 0.55),
                                    },
                                    '& .MuiOutlinedInput-input': {
                                      padding: '5px 0 !important',
                                      width: `${Math.max(5, Math.min(18, stemInlineEdit.value.length + 2))}ch`,
                                      maxWidth: '14rem',
                                    },
                                  })}
                                />
                              ) : (
                                <Typography
                                  component="button"
                                  type="button"
                                  noWrap
                                  title={`${stem.label} — click to rename`}
                                  onClick={() => setStemInlineEdit({ stemId: stem.id, value: stem.label })}
                                  sx={(theme) => ({
                                    ...stanzaMixTrackLabelSurfaceSx(theme),
                                    flex: 1,
                                    minWidth: 0,
                                    textAlign: 'left',
                                    border: 'none',
                                    background: 'none',
                                    padding: '4px 0',
                                    cursor: 'text',
                                    alignSelf: 'center',
                                  })}
                                >
                                  {stem.label}
                                </Typography>
                              )}
                            </Box>
                            <AppLinearVolumeSlider
                              value={stanzaSanitizeLinearBusGain(stem.gain)}
                              onChange={(_, v) =>
                                void persistSong({
                                  id: selected.id,
                                  stems: (selected.stems ?? []).map((s) =>
                                    s.id === stem.id
                                      ? { ...s, gain: stanzaSanitizeLinearBusGain(v as number) }
                                      : s,
                                  ),
                                })
                              }
                              aria-label={`${stem.label} level`}
                              sx={{
                                alignSelf: 'center',
                                opacity: stemPlaybackMuted(stem) ? 0.42 : 1,
                                transition: 'opacity 0.15s ease',
                              }}
                            />
                            <Box
                              sx={{
                                width: STANZA_MIX_TRAIL_BALANCE_PX,
                                flexShrink: 0,
                                display: 'flex',
                                justifyContent: 'flex-end',
                                alignItems: 'center',
                              }}
                            >
                              <IconButton
                                size="small"
                                aria-label={`Remove layer ${stem.label}`}
                                onClick={() =>
                                  void persistSong({
                                    id: selected.id,
                                    stems: (selected.stems ?? []).filter((s) => s.id !== stem.id),
                                  })
                                }
                                sx={{ p: 0.2, color: 'text.secondary', alignSelf: 'center' }}
                              >
                                <CloseIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Box>
                          </Box>
                        ))}
                      </Stack>
                      <input
                        ref={stemFileInputRef}
                        type="file"
                        accept="audio/*"
                        hidden
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = '';
                          if (f) void addStemFromFile(f);
                        }}
                      />
                      <Button
                        size="small"
                        variant="text"
                        className="stanza-mix-add"
                        onClick={() => stemFileInputRef.current?.click()}
                        sx={{
                          mt: 0.35,
                          py: 0.1,
                          minHeight: 28,
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          color: 'text.secondary',
                          textTransform: 'none',
                          justifyContent: 'flex-start',
                          px: 0.5,
                        }}
                      >
                        + Add layer
                      </Button>
                    </Box>
                  ) : null}
                </Stack>
              </Paper>

              <Box sx={{ gridArea: 'timeline', minWidth: 0, width: '100%' }}>
                <StanzaTimeline
                  duration={playback.duration}
                  currentTime={playback.currentTime}
                  markers={selected.markers ?? []}
                  segmentMs={selected.stats}
                  selectedSegmentIndices={selectedSegmentIndices}
                  loopMode={loopMode}
                  onLoopModeChange={onLoopModeChange}
                  isPlaying={playback.isPlaying}
                  onPlay={playUnified}
                  onPause={pauseUnified}
                  onSeek={seekUnified}
                  onSelectSegments={handleSelectSegments}
                  onMarkersChange={(m) => void persistSong({ id: selected.id, markers: m })}
                  onDeleteMarker={deleteMarkerById}
                  onRenameSectionFromLabel={renameSectionFromLabel}
                  onSkipToLoopStart={skipToLoopStart}
                  onSkipToLoopEnd={skipToLoopEnd}
                  onAddMarker={addMarkerAtCurrentTime}
                  onJoinSections={joinSelectedContiguousSections}
                  joinSectionsEnabled={areContiguousSegmentIndices(selectedSegmentIndices)}
                  onClearSegmentSelection={clearSegmentSelection}
                  playbackRate={playback.playbackRate}
                  onPlaybackRateChange={applyPlaybackRate}
                  selectionTimeSpan={
                    selectedSegmentIndices.length > 0
                      ? (effectiveSelectionSpan ?? segmentSelectionLoopHull ?? undefined)
                      : undefined
                  }
                  onSelectionSpanNudge={nudgeSectionSelectionExtend}
                  onSelectionMusicalPad={applyMusicalSelectionPad}
                  onResetSelectionSpan={resetSectionSelectionExtend}
                  selectionExtendActive={
                    sectionSelectionExtend.startDelta !== 0 || sectionSelectionExtend.endDelta !== 0
                  }
                />
              </Box>
            </Box>
          </Box>

          <Accordion
            defaultExpanded
            disableGutters
            square
            className="stanza-panel stanza-library-footer"
            sx={{ mt: { xs: 3.5, sm: 5 } }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="stanza-library-panel" id="stanza-library-header">
              <Typography variant="subtitle2" className="stanza-whisper-title">
                Your library
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1, fontWeight: 400 }}>
                  ({songs?.length ?? 0})
                </Typography>
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: { xs: 1.5, sm: 2 }, pb: 1.75, pt: 1 }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ display: 'block', mb: 1.5, fontSize: '0.8125rem', lineHeight: 1.5, maxWidth: '48rem' }}
              >
                Paste a YouTube link or upload a file. You can also open a video with{' '}
                <code>?v=</code> and the id in the URL bar.
              </Typography>
              <Stack spacing={1.25} sx={{ mb: 1.5 }}>
                <TextField
                  size="small"
                  fullWidth
                  label="YouTube URL or id"
                  value={ytPaste}
                  onChange={(e) => setYtPaste(e.target.value)}
                  placeholder="https://youtube.com/watch?v=…"
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    if (canResolveYoutubePaste(ytPaste)) void addYoutubeSong();
                  }}
                />
                <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" useFlexGap>
                  <Button
                    variant="contained"
                    size="small"
                    className="stanza-btn-pill"
                    onClick={() => void addYoutubeSong()}
                    disabled={!canResolveYoutubePaste(ytPaste)}
                    sx={{ flexShrink: 0, minHeight: 36 }}
                  >
                    Add
                  </Button>
                  <input
                    ref={libraryUploadInputRef}
                    hidden
                    type="file"
                    accept="audio/*"
                    tabIndex={-1}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void addLocalSong(f);
                      e.target.value = '';
                    }}
                  />
                  <Button
                    type="button"
                    variant="outlined"
                    size="small"
                    className="stanza-btn-soft-outline"
                    aria-label="Upload audio file to your library"
                    onClick={() => libraryUploadInputRef.current?.click()}
                    sx={{
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                      minHeight: 36,
                      px: 2,
                    }}
                  >
                    Upload audio
                  </Button>
                </Stack>
              </Stack>
              {renderLibraryGrid('footer')}
            </AccordionDetails>
          </Accordion>
        </Box>
      )}

      <Menu
        anchorEl={libraryMenu?.anchor ?? null}
        open={Boolean(libraryMenu)}
        onClose={() => setLibraryMenu(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            const s = libraryMenuSong;
            setLibraryMenu(null);
            if (s) setRemoveConfirmSong(s);
          }}
        >
          Remove from library…
        </MenuItem>
      </Menu>

      <Dialog open={removeConfirmSong != null} onClose={() => setRemoveConfirmSong(null)} aria-labelledby="stanza-remove-title">
        <DialogTitle id="stanza-remove-title">Remove from library?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This removes “{removeConfirmSong?.title ?? ''}” from your library and deletes all practice data for it on
            this device: markers and sections, focus-time stats, recordings (takes), and per-section metronome calibration.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveConfirmSong(null)}>Cancel</Button>
          <Button
            color="error"
            variant="text"
            onClick={() => {
              const id = removeConfirmSong?.id;
              setRemoveConfirmSong(null);
              if (id) void removeSongById(id);
            }}
          >
            Remove from library
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={stemDropConfirm != null}
        onClose={() => setStemDropConfirm(null)}
        aria-labelledby="stanza-stem-drop-title"
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle id="stanza-stem-drop-title">Add as stem layers?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.55 }}>
            {stemDropConfirm
              ? `Each file is about the same length as the loaded track (${stemDropConfirm.refSec.toFixed(
                  1,
                )} s, within ±${STANZA_STEM_DURATION_MATCH_EPS_SEC.toFixed(2)} s). That often means an alternate mix (for example instrumental).`
              : null}
          </Typography>
          <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
            Matched files
          </Typography>
          <Stack component="ul" sx={{ m: 0, pl: 2.25, py: 0 }} role="list">
            {stemDropConfirm?.rows.map((r, i) => (
              <Typography
                key={`${i}:${r.name}`}
                component="li"
                variant="body2"
                sx={{ mb: 0.5, wordBreak: 'break-word' }}
              >
                {r.name}{' '}
                <Typography component="span" variant="caption" color="text.secondary">
                  ({r.durationSec.toFixed(1)} s)
                </Typography>
              </Typography>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 1, px: 2, py: 1.5 }}>
          <Button onClick={() => setStemDropConfirm(null)}>Cancel</Button>
          <Button
            color="inherit"
            onClick={() => {
              const p = stemDropConfirm;
              setStemDropConfirm(null);
              if (p?.files[0]) void addLocalSong(p.files[0]);
            }}
          >
            New song instead
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              const p = stemDropConfirm;
              setStemDropConfirm(null);
              if (p) void appendStemsFromFiles(p.songId, p.files);
            }}
          >
            Add as stems
          </Button>
        </DialogActions>
      </Dialog>

      {conductorOpen && conductorSegment && selected && (
        <ConductorOverlay
          open={conductorOpen}
          onClose={() => setConductorOpen(false)}
          regimen={regimen}
          segment={conductorSegment}
          segments={segments}
          segmentMs={selected.stats}
          transport={transport}
          onSaveTake={saveGuidedTake}
          onGuidedTakeCompleted={() => setGuidedSinceCp((c) => c + 1)}
          guidedTakesSinceCheckpoint={guidedSinceCp}
          onSwitchSegment={(i) => {
            setGuidedSegmentIndex(i);
            setSelectedSegmentIndices([i]);
            setSegmentSelectionAnchor(i);
            setLastClickedSegmentIndex(i);
          }}
          onCheckpointResolved={() => setGuidedSinceCp(0)}
        />
      )}
    </Box>
  );
}
