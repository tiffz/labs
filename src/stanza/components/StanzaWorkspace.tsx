/**
 * StanzaWorkspace — top-level Stanza shell.
 *
 * Owns the library / viewer split, orchestrates the playback engine (YouTube IFrame
 * controller, local `<audio>` / `<video>` elements, Web Audio stem mixer, transpose
 * pipeline), routes URL deep-links (`?v=` for YouTube, `?df=` for Drive), and wires
 * the section/marker timeline + metronome rail + pitch shift UI into a single shape.
 *
 * Why one big file (for now):
 *   - The transport / loop / timeline / mix surfaces share mutable refs (`timeRef`,
 *     `playingRef`, stem element map) that would become awkward to thread through
 *     extracted components without first growing test coverage on this component.
 *   - The decomposition pattern in `docs/COMPONENT_DECOMPOSITION_PATTERN.md`
 *     applies: split helpers first, then leaves, then hooks. Recommended next splits
 *     are documented in this file's audit (see chat history) and should land in
 *     dedicated PRs once unit tests exist for the marker / metronome flows.
 *
 * Anything visually independent that can move out cleanly already has (e.g.
 * `StanzaLibraryThumb`, `StanzaTimeline`, `StanzaSectionMetronomeRail`,
 * `StanzaMetronomeStrip`, shared `PlaybackSpeedControl`).
 */

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
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import VolumeOffOutlinedIcon from '@mui/icons-material/VolumeOffOutlined';
import VolumeUpOutlinedIcon from '@mui/icons-material/VolumeUpOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import AppLinearVolumeSlider from '../../shared/components/AppLinearVolumeSlider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import { alpha, type Theme } from '@mui/material/styles';
import AppTooltip from '../../shared/components/AppTooltip';
import { NumericStepperField } from '../../shared/components/music/NumericStepperField';
import LabsUndoControls from '../../shared/undo/LabsUndoControls';
import { useLabsUndo } from '../../shared/undo/LabsUndoContext';
import {
  stanzaDb,
  type StanzaMarker,
  type StanzaMetronomeTimingScope,
  type StanzaSong,
  type StanzaStemTrack,
} from '../db/stanzaDb';
import {
  buildLocalAudioStanzaSong,
  isAudioFileForStanza,
  isStanzaBlobLikeVideo,
  stanzaSongTitleFromFileName,
} from '../db/stanzaLocalAudioImport';
import { computeStanzaLocalMediaFingerprint } from '../utils/stanzaLocalMediaFingerprint';
import { getStanzaLocalMainMediaElement } from '../utils/stanzaLocalMainMediaElement';
import {
  readStanzaLastSelectedSongId,
  writeStanzaLastSelectedSongId,
} from '../db/stanzaLastSelectedSong';
import { runStanzaLibraryDedupeMigrationOnce } from '../db/stanzaConsolidateLocalLibrary';
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
  effectiveBpmForSelectedSpan,
  STANZA_LOOP_WRAP_TOLERANCE_SEC,
  STANZA_MIN_LOOP_SPAN_SEC,
  isPastLoopWrapPoint,
  suggestMusicalLoopPadSec,
  type StanzaPlaybackLoopMode,
  type StanzaSectionSelectionExtend,
} from '../utils/stanzaPlaybackLoop';
import {
  resolveStanzaTimelineTransport,
  stanzaPlayheadDisplayTime,
} from '../utils/stanzaPlayheadDisplayTime';
import { snapSegmentBoundaryMarkersToBeats, commitSelectionSpanToHullBoundaryMarkers } from '../utils/stanzaBeatGrid';
import { canPlaceMarkerAtTime, markerTimesEqual } from '../utils/stanzaMarkerSpacing';
import type { StanzaMarkersChangeContext } from './StanzaTimeline';
import { isSegmentSkipped, nextNonSkippedTimeForwardPlayback } from '../utils/stanzaSkippedSections';
import { useStanzaLocalPlaybackObjectUrls } from '../hooks/useStanzaLocalPlaybackObjectUrls';
import {
  stanzaPrimaryLocalBlobKey,
  stanzaStemBlobIdentityKeySorted,
  stanzaStemUrlKeyFromSong,
} from '../utils/stanzaPlaybackBlobUrlKeys';
import { readPositiveFiniteMediaDurationSec } from '../utils/stanzaMediaDuration';
import { primaryPlaybackMuted, stanzaSanitizeLinearBusGain, stemPlaybackMuted } from '../utils/stanzaPlaybackMute';
import { migrateStanzaSongSegmentKeysIfNeeded } from '../utils/stanzaSegmentMigration';
import { resolveStanzaMetronomePlaybackSync } from '../utils/stanzaMetronomeResolution';
import {
  probeFileAudioDurationSeconds,
  STANZA_STEM_DURATION_MATCH_EPS_SEC,
} from '../utils/probeFileAudioDuration';
import { backfillStanzaVideoThumbnailIfNeeded } from '../utils/stanzaVideoThumbnail';
import { fetchYoutubeOEmbedTitle, youtubeMqThumbnailUrl } from '../utils/stanzaYoutubeMeta';
import { loadDriveFileAsStanzaLocalBlob } from '../drive/loadDriveSourceForStanza';
import {
  hydrateStanzaDriveSongMedia,
  stanzaDriveSongNeedsMediaDownload,
} from '../drive/stanzaDriveMediaHydration';
import {
  hydrateStanzaSongStems,
  stanzaSongStemsNeedHydration,
} from '../drive/stanzaDriveStemSync';
import {
  ensureLabsGoogleAccessTokenForDrive,
  LabsGoogleInteractiveAuthRequiredError,
  LABS_GOOGLE_INTERACTIVE_DRIVE_AUTH_HINT,
} from '../../shared/google/labsGoogleDriveAccess';
import {
  addStanzaDriveTombstone,
  clearStanzaDriveTombstone,
  getStanzaDriveTombstoneFileIds,
} from '../drive/stanzaDriveTombstones';
import { addStanzaYoutubeTombstone, clearStanzaYoutubeTombstone } from '../drive/stanzaYoutubeTombstones';
import {
  hasStanzaDriveDeepLinkQuery,
  pushStanzaPlaybackUrlSearchParams,
  readStanzaDriveBootstrapFromLocation,
  replaceStanzaPlaybackUrlSearchParams,
  STANZA_DRIVE_FILE_QUERY,
} from '../utils/stanzaDriveUrlParams';
import { readYoutubeVFromLocation, stripStanzaYoutubeSearchParamPreservingDrive } from '../utils/stanzaUrlYoutube';
import StanzaYouTubePlayer, { type StanzaYouTubeController } from './StanzaYouTubePlayer';
import StanzaAccountMenu from './StanzaAccountMenu';
import StanzaLibraryThumb from './StanzaLibraryThumb';
import StanzaTimeline from './StanzaTimeline';
import { clampStanzaPlaybackRate } from '../utils/stanzaPlaybackRateLimits';
import StanzaMetronomeStrip from './StanzaMetronomeStrip';
import StanzaSectionMetronomeRail from './StanzaSectionMetronomeRail';
import StanzaRepeatMark from './StanzaRepeatMark';
import StanzaSongTitleEditor from './StanzaSongTitleEditor';
import { StanzaViewerLayout } from './StanzaViewerLayout';
import { primeStanzaMetronomeAudio, useStanzaMetronomeSync } from '../hooks/useStanzaMetronomeSync';
import { useStanzaMetronomePersistence } from '../hooks/useStanzaMetronomePersistence';
import DrumAccompaniment from '../../shared/components/music/DrumAccompaniment';
import type { TimeSignature } from '../../shared/rhythm/types';
import { useStanzaLocalStemMixer } from '../hooks/useStanzaLocalStemMixer';
import { StanzaLocalTransposeMirror } from '../audio/stanzaLocalTransposeMirror';
import { StanzaLocalTransposeStemBus } from '../audio/stanzaLocalTransposeStemBus';
import { decodeStanzaLocalBlobForPlayback } from '../audio/decodeStanzaLocalBlob';

/** Drag-reorder stem rows (not OS file drops). */
const STANZA_STEM_REORDER_MIME = 'text/x-stanza-stem-reorder';

const STANZA_EMPTY_STEMS: StanzaStemTrack[] = [];

/** 4/4 default for the shared drum panel. Stanza does not yet track per-song time signature. */
const STANZA_DRUMS_DEFAULT_TIME_SIGNATURE: TimeSignature = { numerator: 4, denominator: 4 };
/** Fallback BPM when the metronome isn't calibrated yet — keeps the drum preview UI usable. */
const STANZA_DRUMS_DEFAULT_BPM = 120;
/** Notation render footprint inside the practice rail — compact so Key shift stays in view. */
const STANZA_DRUMS_NOTATION_WIDTH = 236;
/** Minimum host height; {@link computeMiniNotationLayout} may grow the SVG to fit the staff. */
const STANZA_DRUMS_NOTATION_HEIGHT = 68;
/** Stanza-tinted notation palette so the staff matches `--stanza-ink` ink and the active note
 *  flashes the rose accent (`--stanza-rose`) instead of Beat Finder's green. */
const STANZA_DRUMS_NOTATION_STYLE = {
  inkColor: '#2a2622',
  highlightColor: '#e848a0',
  backgroundColor: 'transparent',
} as const;

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
/** Shared viewer canvas: layout tokens live in stanza-viewer-layout.css (`--stanza-viewer-*`). */

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

export default function StanzaWorkspace() {
  const songs = useLiveQuery(() => stanzaDb.songs.orderBy('updatedAt').reverse().toArray(), []);
  const { push: pushUndo, isReplayingRef, clear: clearUndoStack } = useLabsUndo();
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
  /** Bumped when Web Audio releases a hijacked `<video>` / `<audio>` so HTML output works again. */
  const [mainMediaRemountKey, setMainMediaRemountKey] = useState(0);
  const stemAudioRefs = useRef(new Map<string, HTMLAudioElement>());
  const stemFileInputRef = useRef<HTMLInputElement | null>(null);
  const libraryUploadInputRef = useRef<HTMLInputElement | null>(null);
  const timeRef = useRef(0);
  const durationRef = useRef(0);
  const playingRef = useRef(false);
  const seekDisplayRafRef = useRef(0);
  const seekDisplayPendingRef = useRef<number | null>(null);
  const isYoutubeForSeekRef = useRef(false);
  /**
   * True when metronome is on but the resolved BPM/anchor isn't usable yet (no calibration).
   * Surfaced inline on the metronome strip rather than as a full Alert (see ADR 0009 condense pass).
   */
  const [metronomeNeedsCalibration, setMetronomeNeedsCalibration] = useState(false);
  const [transposeBuffer, setTransposeBuffer] = useState<AudioBuffer | null>(null);
  const [transposeStemMixPackage, setTransposeStemMixPackage] = useState<{
    main: AudioBuffer;
    stems: Map<string, AudioBuffer>;
  } | null>(null);
  const transposeStemMixPackageRef = useRef<{
    main: AudioBuffer;
    stems: Map<string, AudioBuffer>;
  } | null>(null);
  const [transposeDecodeBusy, setTransposeDecodeBusy] = useState(false);
  const [transposeDecodeError, setTransposeDecodeError] = useState<string | null>(null);
  const [transposeDraftSemitones, setTransposeDraftSemitones] = useState(0);
  const [transposeStepperEditing, setTransposeStepperEditing] = useState(false);
  const transposePersistTimerRef = useRef<number | null>(null);
  const transposeMirrorRef = useRef<StanzaLocalTransposeMirror | null>(null);
  const transposeStemBusRef = useRef<StanzaLocalTransposeStemBus | null>(null);
  const transposeDraftRef = useRef(0);
  transposeDraftRef.current = transposeDraftSemitones;
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
  const railScrollRef = useRef<HTMLDivElement>(null);
  const [railScrollable, setRailScrollable] = useState(false);
  const [stemReorderDragId, setStemReorderDragId] = useState<string | null>(null);
  const [stemReorderOverId, setStemReorderOverId] = useState<string | null>(null);
  /**
   * Mix sliders stay smooth while dragging: MUI Slider is controlled from Dexie via live query,
   * which updates after `persistSong` awaits — without local drafts the thumb can stick or jump.
   */
  const [mixPrimaryGainDraft, setMixPrimaryGainDraft] = useState<number | null>(null);
  const [mixStemGainDraftById, setMixStemGainDraftById] = useState<Record<string, number>>({});
  const [mixMetronomeGainDraft, setMixMetronomeGainDraft] = useState<number | null>(null);
  const [mixDrumsGainDraft, setMixDrumsGainDraft] = useState<number | null>(null);
  const [libraryMenu, setLibraryMenu] = useState<{ anchor: HTMLElement; songId: string } | null>(null);
  const oembedAttemptedRef = useRef(new Set<string>());
  const urlBootstrapDoneRef = useRef(false);
  const driveDeepLinkAttemptedRef = useRef(false);
  /** Avoid duplicate Drive fetches when deep-link bootstrap and selection effect overlap. */
  const driveMediaHydrateSongIdRef = useRef<string | null>(null);
  const [driveDeepLinkError, setDriveDeepLinkError] = useState<string | null>(null);
  const [driveDeepLinkNeedsGesture, setDriveDeepLinkNeedsGesture] = useState<{
    fileId: string;
    title: string | null;
  } | null>(null);
  /**
   * Set when the URL's `?df=<file id>` is one the user previously removed from this device's
   * library (a Drive deletion tombstone — see ADR 0006). Renders a "Re-add to library?" prompt
   * instead of silently re-importing the row; dismissing strips the URL params; re-adding
   * clears the tombstone and runs the normal import.
   */
  const [driveDeepLinkRemovedPrompt, setDriveDeepLinkRemovedPrompt] = useState<{
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

  /** Identifies local media for beat-analysis cache (same song + same file → reuse analysis). */
  const stanzaBeatAnalysisCacheKey = useMemo(() => {
    if (!selected?.id) return '';
    const b = selected.localAudioBlob;
    if (!b) return `${selected.id}:no-local-blob`;
    const lm = typeof (b as File).lastModified === 'number' ? (b as File).lastModified : 0;
    return `${selected.id}:${b.size}:${b.type}:${lm}`;
  }, [selected?.id, selected?.localAudioBlob]);

  useEffect(() => {
    setStemInlineEdit(null);
    setStemReorderDragId(null);
    setStemReorderOverId(null);
    setMixPrimaryGainDraft(null);
    setMixStemGainDraftById({});
    setMixMetronomeGainDraft(null);
    setMixDrumsGainDraft(null);
    if (transposePersistTimerRef.current != null) {
      window.clearTimeout(transposePersistTimerRef.current);
      transposePersistTimerRef.current = null;
    }
    setTransposeStepperEditing(false);
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
  const isLocalVideoRef = useRef(isLocalVideo);
  isLocalVideoRef.current = isLocalVideo;

  const getLocalMainMedia = useCallback(
    () => getStanzaLocalMainMediaElement(isLocalVideoRef.current, localAudioRef, localVideoRef),
    [],
  );

  const bumpMainMediaRemount = useCallback(() => {
    setMainMediaRemountKey((k) => k + 1);
  }, []);

  const persistedTransposeSemitones = selected?.localTransposeSemitones ?? 0;
  const [transposeInputStr, setTransposeInputStr] = useState('0');

  useEffect(() => {
    if (transposePersistTimerRef.current != null) return;
    setTransposeDraftSemitones(persistedTransposeSemitones);
    setTransposeInputStr(String(persistedTransposeSemitones));
  }, [selectedId, persistedTransposeSemitones]);

  useEffect(() => {
    const m = new StanzaLocalTransposeMirror();
    transposeMirrorRef.current = m;
    return () => {
      m.dispose();
      transposeMirrorRef.current = null;
    };
  }, []);

  useEffect(() => {
    const b = new StanzaLocalTransposeStemBus();
    transposeStemBusRef.current = b;
    return () => {
      b.dispose();
      transposeStemBusRef.current = null;
    };
  }, []);

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
        clearStanzaDriveTombstone(opts.fileId);
        const row = stanzaDriveSongNeedsMediaDownload(existingByLink)
          ? await hydrateStanzaDriveSongMedia({
              row: existingByLink,
              suggestedTitle: opts.suggestedTitle,
              interactiveOAuth: opts.interactiveOAuth,
            })
          : existingByLink;
        setSelectedId(row.id);
        setDriveDeepLinkError(null);
        setDriveDeepLinkNeedsGesture(null);
        void backfillStanzaVideoThumbnailIfNeeded(row.id);
        return;
      }
      const { blob, title, driveSourceFileId } = await loadDriveFileAsStanzaLocalBlob(opts);
      const existing = await stanzaDb.songs.where('driveSourceFileId').equals(driveSourceFileId).first();
      if (existing) {
        clearStanzaDriveTombstone(driveSourceFileId);
        const row = stanzaDriveSongNeedsMediaDownload(existing)
          ? await hydrateStanzaDriveSongMedia({
              row: existing,
              suggestedTitle: opts.suggestedTitle,
              interactiveOAuth: opts.interactiveOAuth,
            })
          : existing;
        setSelectedId(row.id);
        setDriveDeepLinkError(null);
        setDriveDeepLinkNeedsGesture(null);
        void backfillStanzaVideoThumbnailIfNeeded(row.id);
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
        localMediaFingerprint: computeStanzaLocalMediaFingerprint({
          sizeBytes: blob.size,
          fileName: title,
        }),
      };
      await stanzaDb.songs.put(row);
      setSelectedId(rowId);
      setDriveDeepLinkError(null);
      setDriveDeepLinkNeedsGesture(null);
      // Successful import overrides any prior tombstone for this Drive file id.
      clearStanzaDriveTombstone(driveSourceFileId);
      void backfillStanzaVideoThumbnailIfNeeded(rowId);
    },
    [],
  );

  const completeGestureDriveImport = useCallback(async () => {
    const pending = driveDeepLinkNeedsGesture;
    const fromUrl = readStanzaDriveBootstrapFromLocation();
    const selectedRow = selectedRef.current;
    const fileId =
      pending?.fileId ??
      fromUrl.driveFileId ??
      (selectedRow && stanzaDriveSongNeedsMediaDownload(selectedRow)
        ? selectedRow.driveSourceFileId?.trim() ?? null
        : null);
    const suggestedTitle =
      pending?.title ?? fromUrl.driveTitle ?? (selectedRow?.driveSourceFileId ? selectedRow.title : null);
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

    // Tombstone gate (ADR 0006). The user previously removed this Drive file id from their
    // library; instead of silently re-importing on every refresh of a bookmarked `?df=` URL,
    // surface a one-click "Re-add to library" prompt and let the user choose.
    if (getStanzaDriveTombstoneFileIds().has(driveFileId)) {
      setDriveDeepLinkRemovedPrompt({ fileId: driveFileId, title: driveTitle });
      return;
    }

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

  useEffect(() => {
    driveMediaHydrateSongIdRef.current = null;
  }, [selectedId]);

  /**
   * After a Drive metadata pull, rows may exist without `localAudioBlob`. Re-download from Drive
   * when the user opens the song (library click or last-selected restore), not only on `?df=`.
   */
  useEffect(() => {
    if (!selected) return;
    const needsMain = stanzaDriveSongNeedsMediaDownload(selected);
    const needsStems = stanzaSongStemsNeedHydration(selected);
    if (!needsMain && !needsStems) return;
    if (driveMediaHydrateSongIdRef.current === selected.id) return;
    const { driveFileId } = readStanzaDriveBootstrapFromLocation();
    if (needsMain && driveFileId && selected.driveSourceFileId?.trim() === driveFileId) return;
    driveMediaHydrateSongIdRef.current = selected.id;
    setDriveDeepLinkBusy(true);
    setDriveDeepLinkError(null);
    void (async () => {
      try {
        let row = selected;
        if (needsMain) {
          row = await hydrateStanzaDriveSongMedia({
            row,
            interactiveOAuth: false,
          });
        }
        if (stanzaSongStemsNeedHydration(row)) {
          const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: false });
          row = await hydrateStanzaSongStems({ accessToken: token, row });
        }
        setSelectedId(row.id);
        setDriveDeepLinkNeedsGesture(null);
        void backfillStanzaVideoThumbnailIfNeeded(row.id);
      } catch (e) {
        if (e instanceof LabsGoogleInteractiveAuthRequiredError) {
          const fid = selected.driveSourceFileId?.trim();
          if (fid) {
            setDriveDeepLinkNeedsGesture({ fileId: fid, title: selected.title });
          }
          setDriveDeepLinkError(null);
          return;
        }
        setDriveDeepLinkError(e instanceof Error ? e.message : String(e));
      } finally {
        setDriveDeepLinkBusy(false);
      }
    })();
  }, [selected]);

  /**
   * Bootstrap-prompt re-add: user clicked "Re-add to library" in the tombstone prompt. We clear
   * the tombstone so the merge filter stops blocking the file id, then run the standard import
   * (interactive because the click is a real user gesture).
   */
  const completeDriveDeepLinkReAdd = useCallback(async () => {
    const pending = driveDeepLinkRemovedPrompt;
    if (!pending) return;
    clearStanzaDriveTombstone(pending.fileId);
    setDriveDeepLinkRemovedPrompt(null);
    setDriveDeepLinkBusy(true);
    try {
      await commitDriveDeepLinkImport({
        fileId: pending.fileId,
        suggestedTitle: pending.title,
        interactiveOAuth: true,
      });
    } catch (e) {
      setDriveDeepLinkError(e instanceof Error ? e.message : String(e));
    } finally {
      setDriveDeepLinkBusy(false);
    }
  }, [driveDeepLinkRemovedPrompt, commitDriveDeepLinkImport]);

  /**
   * Bootstrap-prompt dismiss: the user decided not to re-add. Strip the `?df=` deep-link params
   * so a subsequent refresh doesn't prompt again, and clear the prompt state.
   */
  const dismissDriveDeepLinkRemovedPrompt = useCallback(() => {
    setDriveDeepLinkRemovedPrompt(null);
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get(STANZA_DRIVE_FILE_QUERY)) {
        replaceStanzaPlaybackUrlSearchParams({
          youtubeId: null,
          driveFileId: null,
          driveTitle: null,
        });
      }
    }
  }, []);

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

  /**
   * One-shot library dedupe migration. Before auto-sync was added, pasting the same YouTube
   * link on two devices created two rows with different `id`s but the same `ytId`; once Drive
   * sync started merging across devices, both rows showed up in the library grid as obvious
   * duplicates. This effect collapses them on first run, remaps any practice takes that pointed
   * at the discarded row, then sets a `localStorage` flag so subsequent loads are no-ops.
   * Runs independent of Drive sync so users without backup configured also get the cleanup.
   */
  useEffect(() => {
    void runStanzaLibraryDedupeMigrationOnce();
  }, []);

  /**
   * Browser Back / Forward: re-derive selection from the URL the browser just navigated to.
   *   - `?v=…`       → resolve / select that YouTube song (may create a row if first time).
   *   - `?df=…`      → look up the Drive-imported song by `driveSourceFileId`. We only select
   *                    if a row already exists locally; the Drive bootstrap effect handles new
   *                    imports so we don't double-trigger it here.
   *   - no params    → clear selection (return to the library hero).
   *
   * The matching push side lives in `navigateToSong` / `goHome` / the import handlers; without
   * those pushes there'd be no in-app history for this listener to react to.
   */
  useEffect(() => {
    const onPop = async () => {
      const vid = readYoutubeVFromLocation();
      if (vid) {
        const id = await ensureYoutubeSongByVideoId(vid);
        setSelectedId(id);
        return;
      }
      const { driveFileId } = readStanzaDriveBootstrapFromLocation();
      if (driveFileId) {
        const existing = await stanzaDb.songs.where('driveSourceFileId').equals(driveFileId).first();
        if (existing) {
          setSelectedId(existing.id);
          return;
        }
        // No local row yet — leave selection cleared so the Drive bootstrap effect can pick up
        // the `?df=` parameter and import it as if this were a fresh deep link.
        setSelectedId(null);
        return;
      }
      setSelectedId(null);
    };
    const handler = () => {
      void onPop();
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
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

  /** Pitch-shift playback reuses one decode per media identity; avoid re-decoding on unrelated Dexie churn. */
  const transposeBuffersWanted = persistedTransposeSemitones !== 0;

  useEffect(() => {
    let cancelled = false;
    const song = selectedRef.current;
    const t = song?.localTransposeSemitones ?? 0;
    const blob = song?.localAudioBlob;
    const stems = song?.stems ?? [];
    if (!song?.id || song.ytId || t === 0 || !blob || !localUrl) {
      transposeMirrorRef.current?.setBuffer(null);
      transposeStemBusRef.current?.setBuffers(null, new Map());
      setTransposeBuffer(null);
      setTransposeStemMixPackage(null);
      transposeStemMixPackageRef.current = null;
      setTransposeDecodeBusy(false);
      setTransposeDecodeError(null);
      return () => {
        cancelled = true;
      };
    }
    setTransposeDecodeBusy(true);
    setTransposeDecodeError(null);
    void (async () => {
      try {
        const mainBuf = await decodeStanzaLocalBlobForPlayback({
          blob,
          title: song.title || 'Stanza track',
          mediaUrl: localUrl,
          isVideo: isLocalVideo,
        });
        if (cancelled) return;
        const stemMap = new Map<string, AudioBuffer>();
        for (const st of stems) {
          const mediaUrl = stemUrlById[st.id];
          if (!mediaUrl) {
            throw new Error('Stem audio URLs are not ready yet. Try again in a moment.');
          }
          const sb = await decodeStanzaLocalBlobForPlayback({
            blob: st.localBlob,
            title: `${song.title || 'Stanza track'} — ${st.label}`,
            mediaUrl,
            isVideo: false,
          });
          if (cancelled) return;
          stemMap.set(st.id, sb);
        }
        if (cancelled) return;
        transposeMirrorRef.current?.setBuffer(stems.length === 0 ? mainBuf : null);
        transposeStemBusRef.current?.setBuffers(stems.length > 0 ? mainBuf : null, stemMap);
        setTransposeBuffer(stems.length === 0 ? mainBuf : null);
        const pack = stems.length > 0 ? { main: mainBuf, stems: stemMap } : null;
        transposeStemMixPackageRef.current = pack;
        setTransposeStemMixPackage(pack);
      } catch (e) {
        if (!cancelled) {
          transposeMirrorRef.current?.setBuffer(null);
          transposeStemBusRef.current?.setBuffers(null, new Map());
          setTransposeBuffer(null);
          setTransposeStemMixPackage(null);
          transposeStemMixPackageRef.current = null;
          setTransposeDecodeError(e instanceof Error ? e.message : 'Could not decode audio for pitch shift.');
        }
      } finally {
        if (!cancelled) setTransposeDecodeBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [localUrl, isLocalVideo, stemUrlById, transposeBuffersWanted, primaryLocalBlobKey, stemUrlKey, selectedId]);

  /** New song or new primary blob — avoid carrying the previous track's duration into `timeupdate` NaN windows. */
  useEffect(() => {
    setPlayback({
      currentTime: 0,
      duration: 0,
      isPlaying: false,
      playbackRate: 1,
    });
  }, [selectedId, primaryLocalBlobKey]);

  /** Mix slider drafts apply to audible output immediately; Dexie persists on commit. */
  const playbackPrimaryGain = stanzaSanitizeLinearBusGain(mixPrimaryGainDraft ?? selected?.primaryGain);
  const playbackStems = useMemo((): StanzaStemTrack[] => {
    const stems = selected?.stems ?? STANZA_EMPTY_STEMS;
    if (Object.keys(mixStemGainDraftById).length === 0) return stems;
    return stems.map((s) =>
      mixStemGainDraftById[s.id] != null
        ? { ...s, gain: stanzaSanitizeLinearBusGain(mixStemGainDraftById[s.id]) }
        : s,
    );
  }, [selected?.stems, mixStemGainDraftById]);

  const playbackMixRef = useRef({ primaryGain: 1, stems: STANZA_EMPTY_STEMS });
  playbackMixRef.current = { primaryGain: playbackPrimaryGain, stems: playbackStems };

  const primaryMixKey = `${primaryPlaybackMuted(selected) ? 1 : 0}:${playbackPrimaryGain}`;
  const stemMixKey = playbackStems
    .map((s) => `${s.id}:${stemPlaybackMuted(s) ? 1 : 0}:${stanzaSanitizeLinearBusGain(s.gain)}`)
    .join('|');

  const stemWebAudioMixerEnabled = Boolean(
    selected &&
      !selected.ytId &&
      (selected.stems?.length ?? 0) > 0 &&
      Boolean(stemUrlKey) &&
      (selected.localTransposeSemitones ?? 0) === 0,
  );

  const transposeMirrorPlaybackActive = Boolean(
    selected &&
      !selected.ytId &&
      (selected.stems?.length ?? 0) === 0 &&
      (selected.localTransposeSemitones ?? 0) !== 0 &&
      transposeBuffer != null,
  );

  const transposeStemBusPlaybackActive = Boolean(
    selected &&
      !selected.ytId &&
      (selected.stems?.length ?? 0) > 0 &&
      (selected.localTransposeSemitones ?? 0) !== 0 &&
      transposeStemMixPackage != null,
  );

  /** If Web Audio graph setup fails (or is abandoned), restore audible levels on the underlying media elements. */
  const restoreHtmlStemVolumes = useCallback(() => {
    if (!selected || selected.ytId) return;
    const main = getLocalMainMedia();
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
  }, [selected, getLocalMainMedia]);

  const { webAudioMixReady, prepareStemMixerForPlaySync, finalizeStemMixerResume, abandonWebAudioMix } =
    useStanzaLocalStemMixer({
      enabled: stemWebAudioMixerEnabled,
      stemUrlKey,
      expectedStemCount: selected?.stems?.length ?? 0,
      primaryMuted: primaryPlaybackMuted(selected),
      primaryGain: playbackPrimaryGain,
      stems: playbackStems,
      localVideoRef,
      localAudioRef,
      isLocalVideo,
      stemAudioRefs,
      onMixGraphReleased: bumpMainMediaRemount,
      onMixResumeFailed: restoreHtmlStemVolumes,
    });

  useEffect(() => {
    if (!selected || selected.ytId) return;
    const main = getLocalMainMedia();
    if (!main) return;

    const audibleTranspose = transposeMirrorPlaybackActive || transposeStemBusPlaybackActive;
    if ((selected.localTransposeSemitones ?? 0) !== 0 && !audibleTranspose) {
      main.volume = 0;
      main.muted = false;
      for (const stem of selected.stems ?? []) {
        const el = stemAudioRefs.current.get(stem.id);
        if (!el) continue;
        el.volume = 0;
        el.muted = false;
      }
      return;
    }

    const viaWebAudio = stemWebAudioMixerEnabled && webAudioMixReady;

    if (viaWebAudio) {
      // See StanzaLocalStemMixer: MEA follows element volume — keep at 1; mix/mute via Web Audio only.
      main.volume = 1;
      main.muted = false;
    } else if (transposeStemBusPlaybackActive || transposeMirrorPlaybackActive) {
      // Audible output comes from decoded-buffer Web Audio; keep media elements as transport clock only.
      main.volume = 0;
      main.muted = false;
    } else {
      main.volume = playbackPrimaryGain;
      main.muted = primaryPlaybackMuted(selected);
    }

    for (const stem of playbackStems) {
      const el = stemAudioRefs.current.get(stem.id);
      if (!el) continue;
      if (viaWebAudio) {
        el.volume = 1;
        el.muted = false;
      } else if (transposeStemBusPlaybackActive) {
        el.volume = 0;
        el.muted = false;
      } else {
        el.volume = stanzaSanitizeLinearBusGain(stem.gain);
        el.muted = stemPlaybackMuted(stem);
      }
    }
  }, [
    primaryMixKey,
    stemMixKey,
    playbackPrimaryGain,
    playbackStems,
    selected,
    stemWebAudioMixerEnabled,
    webAudioMixReady,
    transposeMirrorPlaybackActive,
    transposeStemBusPlaybackActive,
    getLocalMainMedia,
  ]);

  useEffect(() => {
    if (isYoutube || !stemUrlKey) return;
    const main = getLocalMainMedia();
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
  }, [stemUrlKey, isYoutube, getLocalMainMedia]);

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

  const loopModeRef = useRef(loopMode);
  loopModeRef.current = loopMode;
  const effectiveSelectionSpanRef = useRef(effectiveSelectionSpan);
  effectiveSelectionSpanRef.current = effectiveSelectionSpan;
  // Mirrored so callbacks (e.g. {@link userSeekUnified}) and the playback RAF
  // can read the latest segment list without taking it as a closure dep —
  // segments change reference on every Dexie write and would otherwise churn
  // every downstream `useCallback`.
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;

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

  const [railLiveTiming, setRailLiveTiming] = useState<{
    segmentId: string;
    bpm: number;
    anchorMediaTime: number;
  } | null>(null);

  /** Tempo suggestion dialog: hear metronome clicks even when the strip toggle is off (does not persist). */
  const [stanzaBeatAnalysisModalOpen, setStanzaBeatAnalysisModalOpen] = useState(false);
  const [stanzaTapMetronomePreviewActive, setStanzaTapMetronomePreviewActive] = useState(false);
  const [stanzaTapMetronomeTapActive, setStanzaTapMetronomeTapActive] = useState(false);
  const handleBeatAnalysisModalOpenChange = useCallback((open: boolean) => {
    setStanzaBeatAnalysisModalOpen(open);
  }, []);
  const handleTapMetronomePreviewChange = useCallback((active: boolean) => {
    setStanzaTapMetronomePreviewActive(active);
  }, []);
  const handleTapMetronomeTapActiveChange = useCallback((active: boolean) => {
    setStanzaTapMetronomeTapActive(active);
  }, []);

  useEffect(() => {
    if (stanzaBeatAnalysisModalOpen || stanzaTapMetronomePreviewActive) {
      primeStanzaMetronomeAudio();
    }
  }, [stanzaBeatAnalysisModalOpen, stanzaTapMetronomePreviewActive]);

  const metronomeRailScopeRef = useRef<{ songId: string; scope: StanzaMetronomeTimingScope } | null>(null);

  useEffect(() => {
    if (!selected) {
      metronomeRailScopeRef.current = null;
      return;
    }
    const songId = selected.id;
    const scope = selected.metronomeTimingScope ?? 'song';
    const prev = metronomeRailScopeRef.current;
    metronomeRailScopeRef.current = { songId, scope };
    if (!prev || prev.songId !== songId) return;
    if (prev.scope !== scope) setRailLiveTiming(null);
  }, [selected]);

  const handleRailLiveTiming = useCallback((info: { segmentId: string; bpm: number; anchorMediaTime: number }) => {
    setRailLiveTiming(info);
  }, []);

  useEffect(() => {
    if (!railCalibSeg) setRailLiveTiming(null);
  }, [railCalibSeg]);

  useEffect(() => {
    if (!selectedId) setRailLiveTiming(null);
  }, [selectedId]);

  useLayoutEffect(() => {
    const el = railScrollRef.current;
    if (!el) return;
    const mql = window.matchMedia('(min-width: 900px)');
    const update = () => {
      if (!mql.matches) {
        setRailScrollable(false);
        return;
      }
      setRailScrollable(el.scrollHeight > el.clientHeight + 1);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    mql.addEventListener('change', update);
    return () => {
      ro.disconnect();
      mql.removeEventListener('change', update);
    };
  }, [
    selectedId,
    selected?.drumsEnabled,
    selected?.metronomeEnabled,
    selected?.stems?.length,
    railCalibSeg?.id,
    stanzaBeatAnalysisModalOpen,
    transposeDecodeBusy,
  ]);

  useEffect(() => {
    if (!selectedId || playback.duration <= 0 || !songs) return;
    const song = songs.find((s) => s.id === selectedId);
    if (!song) return;
    void migrateStanzaSongSegmentKeysIfNeeded(song, playback.duration);
  }, [selectedId, playback.duration, songs]);

  useEffect(() => {
    clearUndoStack();
  }, [selectedId, clearUndoStack]);

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
    async (
      patch: Partial<StanzaSong> & Pick<StanzaSong, 'id'>,
      opts?: {
        recordUndo?: boolean;
        touchUpdatedAt?: boolean;
        /** When dragging a boundary, undo restores to pointer-down markers (not DB mid-drag). */
        markerUndoBaseline?: StanzaMarker[];
      },
    ) => {
      const row = await stanzaDb.songs.get(patch.id);
      if (!row) return;
      const recordUndo = opts?.recordUndo !== false && !isReplayingRef.current;
      const touchUpdatedAt = opts?.touchUpdatedAt !== false;
      const prevSnap = recordUndo ? structuredClone(row) : null;
      const nextMarkers = patch.markers != null ? ensureMarkerIds(patch.markers) : row.markers;
      const next: StanzaSong = {
        ...row,
        ...patch,
        markers: nextMarkers,
        updatedAt: touchUpdatedAt ? Date.now() : row.updatedAt,
      };
      const markersOnlyPatch =
        patch.markers != null &&
        (Object.keys(patch) as (keyof typeof patch)[]).every((k) => k === 'id' || k === 'markers');

      await stanzaDb.songs.put(next);

      if (!recordUndo || !prevSnap) return;

      if (markersOnlyPatch) {
        const prevMarkers = structuredClone(
          opts?.markerUndoBaseline != null
            ? ensureMarkerIds(opts.markerUndoBaseline)
            : prevSnap.markers,
        );
        const nextMarkersSnap = structuredClone(nextMarkers);
        if (markerTimesEqual(prevMarkers, nextMarkersSnap)) return;
        const songId = patch.id;
        pushUndo({
          undo: async () => {
            const r = await stanzaDb.songs.get(songId);
            if (!r) return;
            await stanzaDb.songs.put({ ...r, markers: prevMarkers, updatedAt: Date.now() });
          },
          redo: async () => {
            const r = await stanzaDb.songs.get(songId);
            if (!r) return;
            await stanzaDb.songs.put({ ...r, markers: nextMarkersSnap, updatedAt: Date.now() });
          },
        });
        return;
      }

      const nextSnap = structuredClone(next);
      pushUndo({
        undo: async () => {
          await stanzaDb.songs.put(prevSnap);
        },
        redo: async () => {
          await stanzaDb.songs.put(nextSnap);
        },
      });
    },
    [isReplayingRef, pushUndo],
  );

  const commitMarkers = useCallback(
    async (markers: StanzaMarker[], context?: StanzaMarkersChangeContext) => {
      if (!selected) return;
      await persistSong(
        { id: selected.id, markers },
        { markerUndoBaseline: context?.dragBaseline },
      );
    },
    [persistSong, selected],
  );

  const [markerEditNotice, setMarkerEditNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!markerEditNotice) return;
    const t = window.setTimeout(() => setMarkerEditNotice(null), 5000);
    return () => window.clearTimeout(t);
  }, [markerEditNotice]);

  const { saveSegmentMetronome, saveSongMetronome } = useStanzaMetronomePersistence(selected ?? undefined, persistSong);

  const clearRailSongMetronome = useCallback(() => {
    if (!selected) return;
    void persistSong({ id: selected.id, metronomeSongCalibration: undefined });
  }, [persistSong, selected]);

  const clearRailSegmentMetronome = useCallback(() => {
    if (!selected || !railCalibSeg) return;
    const prev = selected.metronomeBySegmentId ?? {};
    const next = { ...prev };
    delete next[railCalibSeg.id];
    void persistSong({
      id: selected.id,
      metronomeBySegmentId: Object.keys(next).length > 0 ? next : undefined,
    });
  }, [persistSong, railCalibSeg, selected]);

  const schedulePersistTransposeSemitones = useCallback(
    (next: number) => {
      if (!selected) return;
      const clamped = Math.max(-12, Math.min(12, next));
      setTransposeDraftSemitones(clamped);
      setTransposeInputStr(String(clamped));
      if (transposePersistTimerRef.current != null) {
        window.clearTimeout(transposePersistTimerRef.current);
      }
      transposePersistTimerRef.current = window.setTimeout(() => {
        transposePersistTimerRef.current = null;
        void persistSong({
          id: selected.id,
          localTransposeSemitones: clamped === 0 ? undefined : clamped,
        });
      }, 420);
    },
    [persistSong, selected],
  );

  const commitSongTitle = useCallback(
    async (nextTitle: string) => {
      if (!selected) return;
      await persistSong({ id: selected.id, title: nextTitle });
      if (selected.driveSourceFileId && !selected.ytId) {
        replaceStanzaPlaybackUrlSearchParams({
          youtubeId: null,
          driveFileId: selected.driveSourceFileId,
          driveTitle: nextTitle,
        });
      }
    },
    [persistSong, selected],
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

    // Dedupe by ytId so pasting the same video on two devices doesn't create two library cards
    // pointing at the same source. Without this, Drive auto-sync would faithfully merge both
    // rows together and the user would see obvious-looking duplicates side by side.
    const existing = await stanzaDb.songs.where('ytId').equals(imp.videoId).first();
    if (existing) {
      const boot: { songId: string; seekSec?: number; rate?: number } = { songId: existing.id };
      if (imp.seekSec != null) boot.seekSec = imp.seekSec;
      if (imp.playbackRate != null && Math.abs(imp.playbackRate - 1) > 0.0001) boot.rate = imp.playbackRate;
      pendingYoutubeBootstrapRef.current = boot.seekSec != null || boot.rate != null ? boot : null;
      // Carry forward fresh markers from the paste only when the existing row has none yet —
      // never clobber user-edited markers on a song they've been practicing.
      if (imp.markers.length > 0 && (existing.markers?.length ?? 0) === 0) {
        await stanzaDb.songs.put({
          ...existing,
          markers: ensureMarkerIds(imp.markers),
          updatedAt: Date.now(),
        });
      }
      pushStanzaPlaybackUrlSearchParams({
        youtubeId: imp.videoId,
        driveFileId: null,
        driveTitle: null,
      });
      setSelectedId(existing.id);
      setYtPaste('');
      return;
    }

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
    // Push a real history entry so a subsequent browser Back returns to the library hero
    // instead of leaving Stanza for whatever site preceded it.
    pushStanzaPlaybackUrlSearchParams({
      youtubeId: imp.videoId,
      driveFileId: null,
      driveTitle: null,
    });
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
    // Push a real history entry so a subsequent browser Back returns to the library hero
    // instead of leaving Stanza for whatever site preceded it.
    pushStanzaPlaybackUrlSearchParams({
      youtubeId: null,
      driveFileId: row.driveSourceFileId ?? null,
      driveTitle: row.driveSourceFileId ? row.title : null,
    });
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

      // ADR 0006 — Drive deletion tombstone. When a Drive-backed row is removed, persist a
      // `driveSourceFileId` tombstone so the auto-pull merge stops re-adding it from Drive's
      // `progress.json`, the URL bootstrap stops re-importing the same `?df=` link, and other
      // devices see the deletion via the next push of the envelope's `deletedDriveSourceFileIds`.
      const driveFileId = prevSnap.driveSourceFileId?.trim();
      const youtubeVideoId = prevSnap.ytId?.trim();
      if (driveFileId) {
        addStanzaDriveTombstone(driveFileId);
        // If the current URL still points at this Drive file, strip the deep-link params so a
        // refresh doesn't fall into the bootstrap path (and so the address bar reflects reality).
        if (typeof window !== 'undefined') {
          const sp = new URLSearchParams(window.location.search);
          if (sp.get(STANZA_DRIVE_FILE_QUERY)?.trim() === driveFileId) {
            replaceStanzaPlaybackUrlSearchParams({
              youtubeId: null,
              driveFileId: null,
              driveTitle: null,
            });
          }
        }
      }
      if (youtubeVideoId) {
        addStanzaYoutubeTombstone(youtubeVideoId);
      }

      if (!isReplayingRef.current) {
        pushUndo({
          undo: async () => {
            await stanzaDb.songs.put(prevSnap);
            for (const t of prevTakes) {
              await stanzaDb.takes.put(t);
            }
            // Undoing the delete = "I didn't mean to remove this" — drop the tombstone so the
            // next sync doesn't immediately wipe the row again from another device.
            if (driveFileId) clearStanzaDriveTombstone(driveFileId);
            if (youtubeVideoId) clearStanzaYoutubeTombstone(youtubeVideoId);
            if (wasSelected) setSelectedId(prevSnap.id);
          },
          redo: async () => {
            await stanzaDb.takes.where('songId').equals(id).delete();
            await stanzaDb.songs.delete(id);
            if (driveFileId) addStanzaDriveTombstone(driveFileId);
            if (youtubeVideoId) addStanzaYoutubeTombstone(youtubeVideoId);
            if (wasSelected) setSelectedId(null);
          },
        });
      }
    },
    [selectedId, isReplayingRef, pushUndo],
  );

  const syncTransposeMirrorFromMain = useCallback(() => {
    const mirror = transposeMirrorRef.current;
    const bus = transposeStemBusRef.current;
    const main = getLocalMainMedia();
    const row = selectedRef.current;
    const mix = playbackMixRef.current;
    if (!main || !row || row.ytId) {
      mirror?.stop();
      bus?.stop();
      return;
    }
    const stemsLen = row.stems?.length ?? 0;
    const transpose = row.localTransposeSemitones ?? 0;
    if (transpose === 0) {
      mirror?.stop();
      bus?.stop();
      return;
    }
    const primaryMuted = primaryPlaybackMuted(row);
    if (stemsLen === 0) {
      bus?.stop();
      if (!mirror?.getBuffer()) {
        mirror?.stop();
        return;
      }
      const linear = primaryMuted ? 0 : mix.primaryGain;
      if (main.paused || linear <= 0) {
        mirror.stop();
        return;
      }
      if (mirror.hasActiveSource()) {
        mirror.setLinearGain(linear);
        return;
      }
      mirror.startOrRestart(main.currentTime, main.playbackRate, transpose, linear);
      return;
    }
    mirror?.stop();
    if (!bus?.getMainBuffer()) {
      bus?.stop();
      return;
    }
    if (!transposeStemMixPackageRef.current) {
      bus.stop();
      return;
    }
    if (main.paused) {
      bus.stop();
      return;
    }
    if (bus.hasActiveSources()) {
      bus.updateMix(primaryMuted, mix.primaryGain, mix.stems);
      return;
    }
    bus.startOrRestart(
      main.currentTime,
      main.playbackRate,
      transpose,
      primaryMuted,
      mix.primaryGain,
      mix.stems,
    );
  }, [getLocalMainMedia]);

  useEffect(() => {
    if (!transposeMirrorPlaybackActive && !transposeStemBusPlaybackActive) return;
    const main = getLocalMainMedia();
    if (!main || main.paused) return;
    syncTransposeMirrorFromMain();
  }, [
    primaryMixKey,
    stemMixKey,
    transposeMirrorPlaybackActive,
    transposeStemBusPlaybackActive,
    syncTransposeMirrorFromMain,
    getLocalMainMedia,
  ]);

  const applyPlaybackRate = useCallback(
    (rate: number) => {
      const clamped = clampStanzaPlaybackRate(rate);
      if (isYoutube) {
        ytControllerRef.current?.setPlaybackRate(clamped);
      } else {
        const el = getLocalMainMedia();
        if (el) el.playbackRate = clamped;
        stemAudioRefs.current.forEach((a) => {
          a.playbackRate = clamped;
        });
        if (el && !el.paused) {
          window.requestAnimationFrame(() => {
            syncTransposeMirrorFromMain();
          });
        }
      }
      setPlayback((p) => ({ ...p, playbackRate: clamped }));
    },
    [isYoutube, syncTransposeMirrorFromMain, getLocalMainMedia],
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
      const el = getLocalMainMedia();
      if (el && Number.isFinite(el.currentTime)) return el.currentTime;
    }
    return timeRef.current;
  }, [isYoutube, getLocalMainMedia]);

  /** Align marker placement with the painted timeline playhead (loop clamp + scrub display). */
  const resolvePlayheadTimeForMarkers = useCallback((): number => {
    const d = durationRef.current;
    const live = readLiveTransportTime();
    const transport = resolveStanzaTimelineTransport(live, seekDisplayPendingRef.current);
    if (!(d > 0)) return transport;
    return stanzaPlayheadDisplayTime(transport, d, loopModeRef.current, effectiveSelectionSpanRef.current);
  }, [readLiveTransportTime]);

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
        setPlayback((p) => (p.currentTime === t ? p : { ...p, currentTime: t }));
        if (flush) {
          ytControllerRef.current?.seekTo(t);
        } else {
          scheduleSeekFrame();
        }
        return;
      }
      const el = getLocalMainMedia();
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
      transposeMirrorRef.current?.stop();
      transposeStemBusRef.current?.stop();
      const elPlaying = getLocalMainMedia();
      if (elPlaying && !elPlaying.paused) {
        window.requestAnimationFrame(() => {
          syncTransposeMirrorFromMain();
        });
      }
      setPlayback((p) => (p.currentTime === t ? p : { ...p, currentTime: t }));
    },
    [isYoutube, scheduleSeekFrame, syncTransposeMirrorFromMain, getLocalMainMedia],
  );

  /**
   * Section the user explicitly entered via a UI seek (section button click,
   * scrub on the timeline, transport prev/next, hover-card play). The skip-
   * playback RAF treats that section as "user wants to hear this" and skips
   * suppression — even if it's marked skip — until the playhead naturally
   * crosses into a different section. Programmatic seeks (loop wraps,
   * out-of-window play() re-anchors) intentionally do NOT update this ref so
   * skip still applies on the wrap target.
   */
  const lastUserEnteredSectionIdRef = useRef<string | null>(null);

  /**
   * Wrapper around `seekUnified` for user-initiated seeks. Records the destination
   * section in {@link lastUserEnteredSectionIdRef} so the skipped-section RAF
   * doesn't bounce the user out of a section they just chose.
   *
   * Reads `segments` from {@link segmentsRef} (not the closure) so this callback
   * stays referentially stable across marker drags and Dexie writes — keeps the
   * downstream `useCallback` chain (`handleSelectSegments`, `skipToLoopStart`,
   * `skipToLoopEnd`) from invalidating every render.
   */
  const userSeekUnified = useCallback(
    (tRaw: number, opts?: { flushPlaybackState?: boolean }) => {
      const segs = segmentsRef.current;
      const idx = findSegmentIndexAtTime(segs, tRaw);
      lastUserEnteredSectionIdRef.current = idx != null ? segs[idx]?.id ?? null : null;
      seekUnified(tRaw, opts);
    },
    [seekUnified],
  );

  const pauseStemAudios = useCallback(() => {
    stemAudioRefs.current.forEach((a) => {
      a.pause();
    });
  }, []);

  /** Hard-sync stem clocks to the main element and start playback (call after `main.play()` has settled). */
  const snapStemsToMainAndPlay = useCallback(() => {
    const main = getLocalMainMedia();
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
  }, [getLocalMainMedia]);

  /**
   * While the main track is playing: resume paused stems and correct large clock drift only.
   * Do **not** pause stems from here — `pauseUnified` / `onPause` on the main element handle that. A deferred pass
   * could otherwise read `main.paused` during a transient state and mute stems mid-playback.
   */
  const alignStemAudiosToMain = useCallback(() => {
    const main = getLocalMainMedia();
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
  }, [getLocalMainMedia]);

  /** Deferred drift pass after transport (main clock stable). */
  const scheduleAlignStemAudiosToMain = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        alignStemAudiosToMain();
      });
    });
  }, [alignStemAudiosToMain]);

  const playUnified = useCallback(() => {
    primeStanzaMetronomeAudio();
    const t = readLiveTransportTime();
    timeRef.current = t;
    const d = durationRef.current;
    if (loopMode === 'loopAll' && d > 0) {
      if (t < 0 || isPastLoopWrapPoint(t, d)) seekUnified(0, { flushPlaybackState: true });
    } else if (loopMode === 'loopSelection' && effectiveSelectionSpan) {
      if (
        t < effectiveSelectionSpan.start - 0.05 ||
        isPastLoopWrapPoint(t, effectiveSelectionSpan.end)
      ) {
        seekUnified(effectiveSelectionSpan.start, { flushPlaybackState: true });
      }
    }
    if (isYoutube) ytControllerRef.current?.play();
    else {
      const main = getLocalMainMedia();
      if (!main) return;
      let stemMixerPrepared = false;
      if (stemWebAudioMixerEnabled) {
        stemMixerPrepared = prepareStemMixerForPlaySync();
        if (!stemMixerPrepared) {
          restoreHtmlStemVolumes();
        }
      }
      const pr = main.play();
      if (stemWebAudioMixerEnabled && stemMixerPrepared) {
        finalizeStemMixerResume();
      }
      // Same synchronous turn as the user gesture (transport / keyboard) so stem.play() keeps activation.
      snapStemsToMainAndPlay();
      const afterMainPlaying = () => {
        snapStemsToMainAndPlay();
        scheduleAlignStemAudiosToMain();
        syncTransposeMirrorFromMain();
      };
      if (pr !== undefined && typeof (pr as Promise<void>).then === 'function') {
        void (pr as Promise<void>).then(afterMainPlaying).catch(() => {
          pauseStemAudios();
          if (stemWebAudioMixerEnabled && stemMixerPrepared) {
            abandonWebAudioMix();
            restoreHtmlStemVolumes();
          }
        });
      } else {
        scheduleAlignStemAudiosToMain();
        syncTransposeMirrorFromMain();
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
    stemWebAudioMixerEnabled,
    syncTransposeMirrorFromMain,
    getLocalMainMedia,
  ]);

  const handleLoopAtMediaEnd = useCallback(() => {
    const mode = loopModeRef.current;
    if (mode === 'through') return;
    if (mode === 'loopAll') {
      seekUnified(0, { flushPlaybackState: true });
      void playUnified();
      return;
    }
    if (mode === 'loopSelection') {
      const span = effectiveSelectionSpanRef.current;
      if (span != null && span.end - span.start >= STANZA_MIN_LOOP_SPAN_SEC) {
        seekUnified(span.start, { flushPlaybackState: true });
        void playUnified();
      }
    }
  }, [seekUnified, playUnified]);

  const pauseUnified = useCallback(() => {
    if (isYoutube) ytControllerRef.current?.pause();
    else {
      transposeMirrorRef.current?.stop();
      transposeStemBusRef.current?.stop();
      getLocalMainMedia()?.pause();
      pauseStemAudios();
    }
  }, [isYoutube, pauseStemAudios, getLocalMainMedia]);

  const getTime = useCallback(() => {
    if (playingRef.current) {
      return readLiveTransportTime();
    }
    return timeRef.current;
  }, [readLiveTransportTime]);

  const skippedBySegmentId = selected?.skippedBySegmentId;
  const hasAnySkippedSection = useMemo(
    () => Boolean(skippedBySegmentId && Object.keys(skippedBySegmentId).length > 0),
    [skippedBySegmentId],
  );

  // Refs that mirror frequently-changing values consumed by the playback RAF.
  // Without these, every Dexie write to `selected` would change
  // `skippedBySegmentId` / etc. references, tearing down and re-establishing
  // the RAF every render. Mirroring on each render lets us register the RAF
  // once and read live values inside the tick. (`segmentsRef`,
  // `effectiveSelectionSpanRef`, `loopModeRef` are mirrored earlier in this
  // component for the same reason.)
  const skippedBySegmentIdRef = useRef(skippedBySegmentId);
  skippedBySegmentIdRef.current = skippedBySegmentId;
  const hasAnySkippedSectionRef = useRef(hasAnySkippedSection);
  hasAnySkippedSectionRef.current = hasAnySkippedSection;
  const isYoutubeRef = useRef(isYoutube);
  isYoutubeRef.current = isYoutube;
  const seekUnifiedRef = useRef(seekUnified);
  seekUnifiedRef.current = seekUnified;
  const pauseStemAudiosRef = useRef(pauseStemAudios);
  pauseStemAudiosRef.current = pauseStemAudios;

  useEffect(() => {
    let raf = 0;
    // True while the transport has been auto-paused for "no playable section
    // left in this pass". Prevents the tick from spamming pause() / setPlayback
    // every frame until React commits `playingRef.current = false`.
    let pausedForSkipExhausted = false;
    const tick = () => {
      // Cheap fast-path when nothing the RAF cares about is engaged. Re-checked
      // every frame via refs so toggling skip / loop mode mid-playback picks up
      // immediately without re-establishing the effect.
      const loopMode = loopModeRef.current;
      const hasAnySkipped = hasAnySkippedSectionRef.current;
      if (loopMode === 'through' && !hasAnySkipped) {
        raf = window.requestAnimationFrame(tick);
        return;
      }
      if (!playingRef.current) {
        pausedForSkipExhausted = false;
        raf = window.requestAnimationFrame(tick);
        return;
      }
      const tLive = readLiveTransportTime();
      timeRef.current = tLive;
      const d = durationRef.current;
      const segs = segmentsRef.current;
      const skipped = skippedBySegmentIdRef.current;
      const span = effectiveSelectionSpanRef.current;

      // 1. Skipped-section auto-advance. Resolve the playback window
      // (whole track for through/loopAll, selection span for loopSelection)
      // and ask the helper where to jump next. The user-entered ref keeps
      // an explicit click-into-skipped-section playable until the playhead
      // crosses a marker.
      if (skipped) {
        const idx = findSegmentIndexAtTime(segs, tLive);
        const seg = idx != null ? segs[idx] : null;
        if (seg && lastUserEnteredSectionIdRef.current && seg.id !== lastUserEnteredSectionIdRef.current) {
          lastUserEnteredSectionIdRef.current = null;
        }
        if (seg && lastUserEnteredSectionIdRef.current !== seg.id && isSegmentSkipped(seg, skipped)) {
          let windowStart = 0;
          let windowEnd = d > 0 ? d : seg.end;
          let loop = false;
          if (loopMode === 'loopAll' && d > 0) {
            loop = true;
          } else if (loopMode === 'loopSelection' && span) {
            windowStart = span.start;
            windowEnd = span.end;
            loop = true;
          }
          const next = nextNonSkippedTimeForwardPlayback({
            segments: segs,
            skipped,
            currentTime: tLive,
            windowStart,
            windowEnd,
            loop,
          });
          if (next != null) {
            pausedForSkipExhausted = false;
            try {
              seekUnifiedRef.current(next, { flushPlaybackState: true });
            } catch (err) {
              console.warn('[stanza] skip-advance seek failed', err);
            }
            raf = window.requestAnimationFrame(tick);
            return;
          }
          // Nothing playable left in this pass: pause the transport once
          // and stop spamming pause/setPlayback every frame until React
          // commits the state change (mirrored back via `playingRef`).
          if (!pausedForSkipExhausted) {
            pausedForSkipExhausted = true;
            try {
              if (isYoutubeRef.current) ytControllerRef.current?.pause();
              else {
                const main = getLocalMainMedia();
                main?.pause();
                pauseStemAudiosRef.current();
              }
              setPlayback((p) => (p.isPlaying ? { ...p, isPlaying: false } : p));
            } catch (err) {
              console.warn('[stanza] skip-advance pause failed', err);
            }
          }
          raf = window.requestAnimationFrame(tick);
          return;
        }
      }
      // Reaching here means we're inside a non-skipped section; clear the
      // exhausted flag so a future skip can re-trigger the pause path.
      pausedForSkipExhausted = false;

      // 2. Loop-bound enforcement.
      try {
        // loopAll: let onEnded / handleLoopAtMediaEnd wrap at the natural tail so the full
        // ending is heard; polling here used to fire ~60 ms early and audibly clipped fades.
        if (loopMode === 'loopSelection' && span) {
          if (isPastLoopWrapPoint(tLive, span.end)) {
            seekUnifiedRef.current(span.start, { flushPlaybackState: true });
          } else if (tLive < span.start - STANZA_LOOP_WRAP_TOLERANCE_SEC) {
            seekUnifiedRef.current(span.start, { flushPlaybackState: true });
          }
        }
      } catch (err) {
        console.warn('[stanza] loop-wrap seek failed', err);
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
    // Mount-only: dynamic state (loopMode, segments, skipped, span, isYoutube,
    // seekUnified, pauseStemAudios) is read from refs each tick so we never
    // need to re-establish the RAF on prop / state churn.
  }, [readLiveTransportTime, getLocalMainMedia]);

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

  const addMarkerAtCurrentTime = useCallback(() => {
    if (!selected) return;
    const d = playback.duration;
    if (!(d > 0)) return;
    const at = resolvePlayheadTimeForMarkers();
    const existing = ensureMarkerIds(selected.markers ?? []);
    if (!canPlaceMarkerAtTime(at, existing, d)) {
      setMarkerEditNotice(
        'A split already exists near the playhead. Scrub elsewhere or drag the nearby boundary.',
      );
      return;
    }
    const n = existing.length + 1;
    const markers = [
      ...existing,
      { id: crypto.randomUUID(), time: at, label: `Marker ${n}` },
    ];
    void persistSong({ id: selected.id, markers });
  }, [resolvePlayheadTimeForMarkers, playback.duration, persistSong, selected]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyM') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, [contenteditable=true], button')) return;
      e.preventDefault();
      void addMarkerAtCurrentTime();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [addMarkerAtCurrentTime, selected]);

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
        userSeekUnified(seg.start);
      }
    },
    [segmentSelectionAnchor, segments, userSeekUnified],
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
    const pad = suggestMusicalLoopPadSec(
      selectedSegmentIndices,
      segments,
      selected?.metronomeBySegmentId,
      selected?.metronomeSongCalibration,
    );
    setSectionSelectionExtend((prev) => ({
      startDelta: prev.startDelta - pad,
      endDelta: prev.endDelta + pad,
    }));
  }, [selected?.metronomeBySegmentId, selected?.metronomeSongCalibration, selectedSegmentIndices, segments]);

  const selectionSpanBeatDeltaSec = useMemo(() => {
    const bpm = effectiveBpmForSelectedSpan(
      selectedSegmentIndices,
      segments,
      selected?.metronomeBySegmentId,
      selected?.metronomeSongCalibration,
    );
    return 60 / bpm;
  }, [selected?.metronomeBySegmentId, selected?.metronomeSongCalibration, selectedSegmentIndices, segments]);

  const snapHoveredSectionBoundariesToBeat = useCallback(
    (segmentIndex: number) => {
      if (!selected || !(playback.duration > 0)) return;
      const result = snapSegmentBoundaryMarkersToBeats(
        segmentIndex,
        segments,
        selected.markers ?? [],
        playback.duration,
        selected.metronomeBySegmentId,
        selected.metronomeSongCalibration,
      );
      if (!result) return;
      // Apply markers + (when present) the re-anchored section calibration in a
      // single Dexie write so the rail's BPM grid and the timeline never disagree
      // mid-frame.
      const patch: Partial<StanzaSong> & Pick<StanzaSong, 'id'> = {
        id: selected.id,
        markers: result.markers,
      };
      if (result.updatedSegmentCalibration) {
        const upd = result.updatedSegmentCalibration;
        patch.metronomeBySegmentId = {
          ...(selected.metronomeBySegmentId ?? {}),
          [upd.segmentId]: upd.calibration,
        };
      }
      void persistSong(patch);
    },
    [persistSong, playback.duration, segments, selected],
  );

  const resetSectionSelectionExtend = useCallback(() => {
    setSectionSelectionExtend({ startDelta: 0, endDelta: 0 });
  }, []);

  const selectionCommitControl = useMemo(() => {
    if (!selected || !segmentSelectionLoopHull || !effectiveSelectionSpan || selectedSegmentIndices.length === 0) {
      return null;
    }
    const h = segmentSelectionLoopHull;
    const e = effectiveSelectionSpan;
    const hasNonZeroExtend =
      Math.abs(sectionSelectionExtend.startDelta) > 1e-9 || Math.abs(sectionSelectionExtend.endDelta) > 1e-9;
    const differs =
      Math.abs(e.start - h.start) > STANZA_TIME_EPS || Math.abs(e.end - h.end) > STANZA_TIME_EPS;
    const preview = commitSelectionSpanToHullBoundaryMarkers(
      selected.markers ?? [],
      playback.duration,
      h,
      e,
    );
    const needsNudge = !hasNonZeroExtend && !differs;
    if (needsNudge) {
      return {
        disabled: true,
        title:
          'Adjust the selection span first using Edit selection (pad or nudge Start/End). Then this resizes the section to match.',
      };
    }
    if (preview == null) {
      return {
        disabled: true,
        title:
          "Can't resize: the new boundaries would overlap another split or the track end. Try a smaller selection span.",
      };
    }
    return {
      disabled: false,
      title:
        'Resize the selected sections so their outer edges match the selection span (including padding). Inner splits stay put.',
    };
  }, [
    effectiveSelectionSpan,
    playback.duration,
    sectionSelectionExtend,
    segmentSelectionLoopHull,
    selected,
    selectedSegmentIndices.length,
  ]);

  const commitSelectionSpanToSectionBoundaries = useCallback(() => {
    if (!selected || !segmentSelectionLoopHull || !effectiveSelectionSpan) return;
    const next = commitSelectionSpanToHullBoundaryMarkers(
      selected.markers ?? [],
      playback.duration,
      segmentSelectionLoopHull,
      effectiveSelectionSpan,
    );
    if (next) {
      void persistSong({ id: selected.id, markers: next });
      setSectionSelectionExtend({ startDelta: 0, endDelta: 0 });
    }
  }, [effectiveSelectionSpan, persistSong, playback.duration, segmentSelectionLoopHull, selected]);

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
    if (!selected) return;
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

  /**
   * Toggle "skip during playback" for a section. Stored as a sparse
   * `{ [segmentId]: true }` map so the on-disk record only carries skipped
   * sections (not all sections); deleting from the map keeps the JSON small
   * after Drive backup. Section ids are stable across marker drags (see
   * ADR 0008), so a skip flag survives boundary tweaks.
   */
  const setSegmentSkipped = useCallback(
    (segmentId: string, next: boolean) => {
      if (!selected) return;
      const prev = selected.skippedBySegmentId ?? {};
      const isCurrentlySkipped = prev[segmentId] === true;
      if (next === isCurrentlySkipped) return;
      let nextMap: Record<string, true> | undefined;
      if (next) {
        nextMap = { ...prev, [segmentId]: true };
      } else {
        const { [segmentId]: _drop, ...rest } = prev;
        void _drop;
        nextMap = Object.keys(rest).length > 0 ? rest : undefined;
      }
      void persistSong({ id: selected.id, skippedBySegmentId: nextMap });
    },
    [persistSong, selected],
  );

  const skipToLoopStart = useCallback(() => {
    if (loopMode === 'through' || loopMode === 'loopAll') userSeekUnified(0);
    else if (effectiveSelectionSpan) userSeekUnified(effectiveSelectionSpan.start);
  }, [effectiveSelectionSpan, loopMode, userSeekUnified]);

  const skipToLoopEnd = useCallback(() => {
    const d = durationRef.current;
    if (!(d > 0)) return;
    if (loopMode === 'through' || loopMode === 'loopAll') {
      userSeekUnified(Math.max(0, d - STANZA_TIME_EPS));
    } else if (effectiveSelectionSpan) {
      userSeekUnified(Math.max(effectiveSelectionSpan.start, effectiveSelectionSpan.end - STANZA_TIME_EPS));
    }
  }, [effectiveSelectionSpan, loopMode, userSeekUnified]);

  const metronomeEnabledForPlayback =
    Boolean(selected?.metronomeEnabled) || stanzaBeatAnalysisModalOpen || stanzaTapMetronomePreviewActive;

  const metronomeSyncSource = useMemo(() => {
    const r = resolveStanzaMetronomePlaybackSync({
      metronomeEnabled: metronomeEnabledForPlayback,
      playbackSeg: playbackMetSeg,
      songCal: selected?.metronomeSongCalibration,
      segmentCal: playbackMetCal,
      railLive: railLiveTiming,
      railFocusSegmentId: railCalibSeg?.id ?? null,
    });
    return { bpm: r.bpm, anchor: r.anchor };
  }, [
    metronomeEnabledForPlayback,
    selected?.metronomeSongCalibration,
    playbackMetSeg,
    playbackMetCal,
    railLiveTiming,
    railCalibSeg?.id,
  ]);

  const metronomeUserGain = stanzaSanitizeLinearBusGain(mixMetronomeGainDraft ?? selected?.metronomeGain, 1);
  const metronomeUserMuted = selected?.metronomeMuted === true;
  useStanzaMetronomeSync({
    enabled: Boolean(
      metronomeEnabledForPlayback && metronomeSyncSource.bpm != null && metronomeSyncSource.bpm > 0,
    ),
    bpm: metronomeSyncSource.bpm,
    anchorMediaTime: metronomeSyncSource.anchor,
    getMediaTime: getTime,
    isPlaying: playback.isPlaying,
    audioEnabled: true,
    gain: metronomeUserGain,
    muted: metronomeUserMuted || stanzaTapMetronomeTapActive,
  });

  /**
   * Linear drums level 0–1 (default 0.7). The shared `DrumAccompaniment` consumes 0–100, so we
   * scale at the boundary. Sliding the Mix slider updates this immediately via a draft, and the
   * persisted value is what we hand the drum component.
   */
  const drumsUserGain = stanzaSanitizeLinearBusGain(mixDrumsGainDraft ?? selected?.drumsGain, 0.7);
  const drumsUserMuted = selected?.drumsMuted === true;
  /**
   * Stanza drives the shared `DrumAccompaniment` from the metronome's resolved bpm + anchor so
   * a single calibration drives both clicks and the groove. When the metronome isn't calibrated
   * yet we still render the drum panel (so the user can pick a pattern), but `isPlaying` stays
   * false so we don't fire hits without a real Beat 1 to align to.
   */
  const drumsHasGrid =
    metronomeSyncSource.bpm != null &&
    metronomeSyncSource.bpm > 0 &&
    metronomeSyncSource.anchor != null &&
    Number.isFinite(metronomeSyncSource.anchor);
  const drumsBpm =
    metronomeSyncSource.bpm && metronomeSyncSource.bpm > 0
      ? metronomeSyncSource.bpm
      : STANZA_DRUMS_DEFAULT_BPM;
  const drumsAnchorMediaTime = drumsHasGrid ? (metronomeSyncSource.anchor as number) : 0;
  const drumsCurrentBeatTime = Math.max(0, playback.currentTime - drumsAnchorMediaTime);
  const drumsBeatPeriod = 60 / drumsBpm;
  const drumsCurrentBeat = drumsHasGrid ? Math.floor(drumsCurrentBeatTime / drumsBeatPeriod) : 0;
  const drumsActuallyPlaying = Boolean(
    selected?.drumsEnabled &&
      playback.isPlaying &&
      drumsHasGrid &&
      !drumsUserMuted &&
      // Silence the groove during tap-tempo count-in/tapping (metronome clicks are muted too).
      !stanzaTapMetronomeTapActive,
  );

  // Surface the "set BPM" hint on the metronome strip itself when the toggle is on but no usable
  // calibration has resolved (no full Alert row needed).
  useEffect(() => {
    if (!selected?.metronomeEnabled) {
      setMetronomeNeedsCalibration(false);
      return;
    }
    const hasClicks =
      metronomeSyncSource.bpm != null &&
      metronomeSyncSource.bpm > 0 &&
      typeof metronomeSyncSource.anchor === 'number' &&
      Number.isFinite(metronomeSyncSource.anchor);
    setMetronomeNeedsCalibration(!hasClicks);
  }, [selected?.metronomeEnabled, metronomeSyncSource.bpm, metronomeSyncSource.anchor]);

  /**
   * User-initiated navigation to a song. Pushes a real history entry so the **browser Back
   * button** returns to the library instead of leaving Stanza for whatever site preceded it.
   * Use this from anything that walks a user from the library or an import flow into the viewer
   * (library row click, paste-YouTube, upload-file, "open in Drive" import). Programmatic /
   * passive selection paths (URL bootstrap, popstate handler, undo/redo, drive deep-link
   * resolution) should keep using `setSelectedId` directly so they don't stack history.
   */
  const navigateToSong = useCallback((song: StanzaSong) => {
    const youtubeId = song.ytId ?? null;
    const driveFileId = youtubeId ? null : (song.driveSourceFileId ?? null);
    const driveTitle = driveFileId ? song.title : null;
    pushStanzaPlaybackUrlSearchParams({ youtubeId, driveFileId, driveTitle });
    setSelectedId(song.id);
  }, []);

  /**
   * "Back to library" — pushes a no-params entry so a subsequent browser Back returns to the
   * song the user just left, mirroring `navigateToSong`.
   */
  const goHome = useCallback(() => {
    pushStanzaPlaybackUrlSearchParams({ youtubeId: null, driveFileId: null, driveTitle: null });
    setSelectedId(null);
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
            onClick={() => navigateToSong(s)}
            aria-current={s.id === selectedId ? 'true' : undefined}
          >
            {s.ytId ? (
              <img className="stanza-library-card-thumb" src={youtubeMqThumbnailUrl(s.ytId)} alt="" loading="lazy" />
            ) : (
              <StanzaLibraryThumb song={s} />
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
    const showLoading =
      driveDeepLinkBusy && !driveDeepLinkError && !driveDeepLinkNeedsGesture && !driveDeepLinkRemovedPrompt;
    const showDriveMediaHint =
      selected != null &&
      stanzaDriveSongNeedsMediaDownload(selected) &&
      !driveDeepLinkBusy &&
      !driveDeepLinkError &&
      !driveDeepLinkNeedsGesture &&
      !driveDeepLinkRemovedPrompt;
    if (
      !driveDeepLinkError &&
      !driveDeepLinkNeedsGesture &&
      !driveDeepLinkRemovedPrompt &&
      !showLoading &&
      !showDriveMediaHint
    ) {
      return null;
    }
    return (
      <>
        {showLoading ? (
          <Alert severity="info" sx={{ maxWidth: 560, mx: 'auto', mb: 2, width: '100%' }}>
            <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
              Fetching audio from Google Drive…
            </Typography>
          </Alert>
        ) : null}
        {showDriveMediaHint ? (
          <Alert
            severity="info"
            sx={{
              maxWidth: 560,
              mx: 'auto',
              mb: 2,
              width: '100%',
              '& .MuiAlert-message': { width: '100%' },
            }}
            action={
              <Button
                color="inherit"
                size="small"
                variant="outlined"
                onClick={() => void completeGestureDriveImport()}
              >
                Load from Drive
              </Button>
            }
          >
            <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
              Your sections and mix settings are here. Load the recording from Google Drive to hear it on
              this device.
            </Typography>
          </Alert>
        ) : null}
        {driveDeepLinkRemovedPrompt ? (
          <Alert
            severity="info"
            sx={{
              maxWidth: 560,
              mx: 'auto',
              mb: 2,
              width: '100%',
              '& .MuiAlert-message': { width: '100%' },
            }}
            action={
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Button
                  color="inherit"
                  size="small"
                  disabled={driveDeepLinkBusy}
                  onClick={() => dismissDriveDeepLinkRemovedPrompt()}
                >
                  Not now
                </Button>
                <Button
                  color="inherit"
                  size="small"
                  variant="outlined"
                  disabled={driveDeepLinkBusy}
                  onClick={() => void completeDriveDeepLinkReAdd()}
                >
                  {driveDeepLinkBusy ? '…' : 'Re-add'}
                </Button>
              </Stack>
            }
          >
            <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
              You removed{' '}
              <strong>{driveDeepLinkRemovedPrompt.title?.trim() || 'this Drive recording'}</strong>{' '}
              from your library. Re-add it?
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
                  Popups blocked here are common even when your email shows in the account menu. That menu only
                  remembers who you last signed in as in Encore.{' '}
                  <Link href="/encore/" target="_blank" rel="noopener noreferrer">
                    Open Encore
                  </Link>
                  , finish Google sign-in from the account menu if asked, then come back and tap Retry (keep this tab).
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
        maxWidth: 'none',
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
                ? "Files that match this track's length attach as mix layers. Otherwise Stanza adds a new library song from the first file."
                : 'Stanza saves to your local library and opens the piece. With a song open, matching-length files become mix layers.'}
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
                Practice songs in sections. Loop, mark beats, and mix layers on top of uploaded audio.
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
        <StanzaViewerLayout
          alerts={renderDriveDeepLinkAlerts()}
          header={
          <Box
            className="stanza-viewer-header"
            sx={{
              pt: { xs: 1.25, sm: 1.5 },
              pb: 1,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 2,
              flexWrap: 'wrap',
              flexShrink: 0,
            }}
          >
            <StanzaRepeatMark size={40} />
            <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
              <StanzaSongTitleEditor title={selected.title} onCommit={(t) => void commitSongTitle(t)} />
              <button type="button" className="stanza-link-quiet stanza-viewer-back-link" onClick={goHome} aria-label="Back to library">
                ← Back to library
              </button>
            </Box>
            <Box
              sx={{
                flexShrink: 0,
                ml: 'auto',
                alignSelf: 'flex-start',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <LabsUndoControls />
              <StanzaAccountMenu />
            </Box>
          </Box>
          }
          footer={
          <Box
            component="section"
            className="stanza-library-panel"
            aria-labelledby="stanza-library-heading"
          >
            <Typography id="stanza-library-heading" variant="subtitle2" className="stanza-whisper-title stanza-library-panel-heading">
              Your library
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1, fontWeight: 400 }}>
                ({songs?.length ?? 0})
              </Typography>
            </Typography>
            <Box className="stanza-library-panel-body">
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
            </Box>
          </Box>
          }
        >
              <Box className="stanza-viewer-media-stack">
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
                  <Box className="stanza-video-column">
                    {isYoutube && selected.ytId && (
                      <StanzaYouTubePlayer
                        videoId={selected.ytId}
                        onPlayerError={setYoutubePlayerErrorCode}
                        onEnded={handleLoopAtMediaEnd}
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
                            key={`${selected.id}:${mainMediaRemountKey}`}
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
                              syncTransposeMirrorFromMain();
                              setPlayback((p) => ({ ...p, isPlaying: true }));
                            }}
                            onPause={() => {
                              transposeMirrorRef.current?.stop();
                              transposeStemBusRef.current?.stop();
                              pauseStemAudios();
                              setPlayback((p) => ({ ...p, isPlaying: false }));
                            }}
                            onEnded={() => {
                              transposeMirrorRef.current?.stop();
                              transposeStemBusRef.current?.stop();
                              handleLoopAtMediaEnd();
                            }}
                          />
                        ) : (
                          /* eslint-disable-next-line jsx-a11y/media-has-caption -- user-supplied audio; no captions */
                          <audio
                            key={`${selected.id}:${mainMediaRemountKey}`}
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
                              syncTransposeMirrorFromMain();
                              setPlayback((p) => ({ ...p, isPlaying: true }));
                            }}
                            onPause={() => {
                              transposeMirrorRef.current?.stop();
                              transposeStemBusRef.current?.stop();
                              pauseStemAudios();
                              setPlayback((p) => ({ ...p, isPlaying: false }));
                            }}
                            onEnded={() => {
                              transposeMirrorRef.current?.stop();
                              transposeStemBusRef.current?.stop();
                              handleLoopAtMediaEnd();
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
                className="stanza-panel stanza-practice-rail stanza-practice-rail--dense stanza-viewer-rail-slot"
                elevation={0}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                  overflow: 'hidden',
                  p: { xs: 1, md: 1.25 },
                }}
              >
                <Box
                  ref={railScrollRef}
                  sx={{
                    minHeight: 0,
                    flex: '1 1 auto',
                    overflowY: railScrollable ? 'auto' : 'hidden',
                    overflowX: 'hidden',
                  }}
                >
                <Stack spacing={1}>
                  <Box>
                    <StanzaMetronomeStrip
                      enabled={Boolean(selected.metronomeEnabled)}
                      onToggle={() => {
                        if (!selected.metronomeEnabled) {
                          primeStanzaMetronomeAudio();
                        }
                        void persistSong({ id: selected.id, metronomeEnabled: !selected.metronomeEnabled });
                      }}
                      bpm={metronomeSyncSource.bpm}
                      anchorMediaTime={metronomeSyncSource.anchor}
                      getMediaTime={getTime}
                      isPlaying={playback.isPlaying}
                      needsCalibration={metronomeNeedsCalibration}
                    />
                    {railCalibSeg && (
                      <StanzaSectionMetronomeRail
                        segment={railCalibSeg}
                        timingScope={selected.metronomeTimingScope ?? 'song'}
                        onTimingScopeChange={(scope) => void persistSong({ id: selected.id, metronomeTimingScope: scope })}
                        songDurationSec={playback.duration}
                        songCalibration={selected.metronomeSongCalibration}
                        segmentCalibration={selected.metronomeBySegmentId?.[railCalibSeg.id]}
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
                        playbackIsPlaying={playback.isPlaying}
                        getMediaTime={getTime}
                        beatAnalysisCacheKey={stanzaBeatAnalysisCacheKey}
                        onAnalysisModalOpenChange={handleBeatAnalysisModalOpenChange}
                        onTapMetronomePreviewChange={handleTapMetronomePreviewChange}
                        onTapMetronomeTapActiveChange={handleTapMetronomeTapActiveChange}
                        onRequestPlay={playUnified}
                        onRequestPause={pauseUnified}
                        onRequestSeek={(t) => {
                          void userSeekUnified(t, { flushPlaybackState: true });
                        }}
                        onLiveTimingChange={handleRailLiveTiming}
                        onPersistSongCalibration={(cal, opts) => void saveSongMetronome(cal, opts)}
                        onPersistSegmentCalibration={(cal, opts) => void saveSegmentMetronome(railCalibSeg.id, cal, opts)}
                        onClearSongCalibration={clearRailSongMetronome}
                        onClearSegmentCalibration={clearRailSegmentMetronome}
                        onSnapSectionBoundariesToBeat={
                          railCalibSegIdx != null ? () => snapHoveredSectionBoundariesToBeat(railCalibSegIdx) : undefined
                        }
                        onPrimeMetronomeAudio={primeStanzaMetronomeAudio}
                      />
                    )}
                    <Box className="stanza-drums-block" sx={{ pt: 0.25 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={Boolean(selected.drumsEnabled)}
                            onChange={(e) => {
                              const enabled = e.target.checked;
                              if (enabled) {
                                // Resume the shared metronome AudioContext on the user gesture
                                // so the first hit doesn't drop on Safari / strict autoplay.
                                primeStanzaMetronomeAudio();
                              }
                              void persistSong({ id: selected.id, drumsEnabled: enabled });
                            }}
                            sx={{ p: 0.25 }}
                          />
                        }
                        label={
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            Add drums
                          </Typography>
                        }
                        sx={{ ml: -0.25, mr: 0, my: 0, '.MuiFormControlLabel-label': { ml: 0.5 } }}
                      />
                      {selected.drumsEnabled ? (
                        <Box sx={{ mt: 0.25 }} className="stanza-drums-panel">
                          <DrumAccompaniment
                            bpm={drumsBpm}
                            timeSignature={STANZA_DRUMS_DEFAULT_TIME_SIGNATURE}
                            isPlaying={drumsActuallyPlaying}
                            currentBeatTime={drumsCurrentBeatTime}
                            currentBeat={drumsCurrentBeat}
                            metronomeEnabled={Boolean(selected.metronomeEnabled)}
                            volume={Math.round(drumsUserGain * 100)}
                            notationWidth={STANZA_DRUMS_NOTATION_WIDTH}
                            notationHeight={STANZA_DRUMS_NOTATION_HEIGHT}
                            notationStyle={STANZA_DRUMS_NOTATION_STYLE}
                            notationFrameClassName="stanza-drums-notation-frame"
                            darbukaLinkClassName="stanza-drums-edit-link"
                            drumSymbolScale={0.44}
                            notationShowMetronomeDots={false}
                            notationFooter={
                              !drumsHasGrid ? (
                                <p className="stanza-drums-notation-hint">
                                  Set BPM and Beat 1 above to start the drum loop.
                                </p>
                              ) : null
                            }
                          />
                        </Box>
                      ) : null}
                    </Box>
                  </Box>
                  {!isYoutube ? (
                    <>
                      <Box className="stanza-key-shift-block" sx={{ pt: 0.25 }}>
                        {/* Inline "Key shift" label saves a row vs. a stacked caption. The
                            stepper handles its own width; the label hugs the left edge. */}
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={0.75}
                          useFlexGap
                          sx={{ minWidth: 0 }}
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              fontWeight: 600,
                              letterSpacing: '0.01em',
                              fontSize: '0.7rem',
                              flexShrink: 0,
                            }}
                            title="Key shift in semitones"
                          >
                            Key shift
                          </Typography>
                          <Box
                            className="shared-bpm-input stanza-key-shift-numeric"
                            sx={{ flex: '1 1 140px', minWidth: 0, maxWidth: { xs: '100%', sm: 220 }, alignSelf: 'stretch' }}
                          >
                            <AppTooltip title="Raise or lower pitch in half-steps (−12 to +12). Applies to the main file and any mix layers. Playback re-decodes shortly after you stop adjusting.">
                              <Box
                                className={`shared-bpm-shell ${transposeStepperEditing ? 'is-editing' : 'is-idle'}`}
                                role="group"
                                aria-label="Pitch shift in semitones"
                                aria-busy={transposeDecodeBusy}
                              >
                                <NumericStepperField
                                  value={transposeDraftSemitones}
                                  inputValue={transposeInputStr}
                                  onInputChange={(e) => {
                                    const raw = e.target.value;
                                    if (!/^-?\d*$/.test(raw)) return;
                                    setTransposeInputStr(raw);
                                    if (raw === '' || raw === '-') return;
                                    const n = Number.parseInt(raw, 10);
                                    if (!Number.isFinite(n)) return;
                                    schedulePersistTransposeSemitones(n);
                                  }}
                                  onInputFocus={() => setTransposeStepperEditing(true)}
                                  onInputBlur={() => {
                                    setTransposeStepperEditing(false);
                                    const n = Number.parseInt(transposeInputStr, 10);
                                    if (!Number.isFinite(n)) {
                                      setTransposeInputStr(String(transposeDraftSemitones));
                                      return;
                                    }
                                    schedulePersistTransposeSemitones(n);
                                  }}
                                  onInputKeyDown={(e) => {
                                    if (e.key === 'ArrowUp') {
                                      e.preventDefault();
                                      schedulePersistTransposeSemitones(transposeDraftRef.current + 1);
                                    }
                                    if (e.key === 'ArrowDown') {
                                      e.preventDefault();
                                      schedulePersistTransposeSemitones(transposeDraftRef.current - 1);
                                    }
                                  }}
                                  min={-12}
                                  max={12}
                                  step={1}
                                  onBump={(delta) =>
                                    schedulePersistTransposeSemitones(transposeDraftRef.current + delta)
                                  }
                                  incrementAriaLabel="Increase pitch by one semitone"
                                  decrementAriaLabel="Decrease pitch by one semitone"
                                  inputAriaLabel="Semitones relative to the recording"
                                  stepperAriaLabel="Semitone stepper"
                                  disabled={transposeDecodeBusy}
                                />
                                <div className="shared-bpm-trailing-actions">
                                  <AppTooltip title="Reset to original key (0 semitones)">
                                    <span>
                                      <IconButton
                                        type="button"
                                        size="small"
                                        aria-label="Reset pitch shift"
                                        disabled={transposeDecodeBusy || transposeDraftSemitones === 0}
                                        className="stanza-key-shift-reset"
                                        onClick={() => {
                                          if (transposePersistTimerRef.current != null) {
                                            window.clearTimeout(transposePersistTimerRef.current);
                                            transposePersistTimerRef.current = null;
                                          }
                                          setTransposeDraftSemitones(0);
                                          setTransposeInputStr('0');
                                          void persistSong({ id: selected.id, localTransposeSemitones: undefined });
                                        }}
                                        sx={{ p: 0.35 }}
                                      >
                                        <RestartAltOutlinedIcon sx={{ fontSize: 18 }} />
                                      </IconButton>
                                    </span>
                                  </AppTooltip>
                                </div>
                              </Box>
                            </AppTooltip>
                          </Box>
                          {transposeDecodeBusy ? (
                            <Box
                              className="stanza-key-shift-busy-spinner"
                              sx={{
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 28,
                                alignSelf: 'center',
                              }}
                              aria-live="polite"
                              aria-busy="true"
                              aria-label="Rebuilding pitch-shifted audio"
                            >
                              <AppTooltip title="Rebuilding pitch-shifted audio…">
                                <span>
                                  <CircularProgress size={20} thickness={4.5} sx={{ color: 'var(--stanza-rose, #e848a0)' }} />
                                </span>
                              </AppTooltip>
                            </Box>
                          ) : null}
                        </Stack>
                        {transposeDecodeError ? (
                          <Box aria-live="polite" sx={{ mt: 0.75 }}>
                            <Alert
                              severity="warning"
                              onClose={() => setTransposeDecodeError(null)}
                              sx={{ py: 0, '& .MuiAlert-message': { py: 0.5 } }}
                            >
                              {transposeDecodeError}
                            </Alert>
                          </Box>
                        ) : null}
                      </Box>
                    </>
                  ) : null}
                  <Box className="stanza-mix-block" sx={{ pt: 0.25 }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ mb: 0.25 }}
                    >
                      <Typography className="stanza-rail-section-label stanza-rail-section-label--minor">
                        Mix
                      </Typography>
                      {!isYoutube ? (
                        <AppTooltip title="Add another audio layer (e.g. an instrumental or vocal stem)">
                          <IconButton
                            size="small"
                            aria-label="Add audio layer"
                            className="stanza-mix-add-icon"
                            onClick={() => stemFileInputRef.current?.click()}
                            sx={{ p: 0.35, color: 'text.secondary' }}
                          >
                            <AddIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </AppTooltip>
                      ) : null}
                    </Stack>
                    <Stack spacing={0.4} className="stanza-mix-rows">
                      <Box
                        className="stanza-mix-row stanza-mix-row--system"
                        sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 28 }}
                      >
                        <Box sx={{ width: STANZA_MIX_DRAG_COL_PX, flexShrink: 0 }} aria-hidden />
                        <AppTooltip
                          title={
                            metronomeUserMuted
                              ? 'Unmute the metronome click'
                              : 'Mute the metronome click (calibration is preserved)'
                          }
                        >
                          <IconButton
                            size="small"
                            aria-label={metronomeUserMuted ? 'Unmute metronome' : 'Mute metronome'}
                            onClick={() =>
                              void persistSong({ id: selected.id, metronomeMuted: !metronomeUserMuted })
                            }
                            sx={{ p: 0.35, alignSelf: 'center' }}
                          >
                            {metronomeUserMuted ? (
                              <VolumeOffOutlinedIcon sx={{ fontSize: 18 }} />
                            ) : (
                              <VolumeUpOutlinedIcon sx={{ fontSize: 18 }} />
                            )}
                          </IconButton>
                        </AppTooltip>
                        <Typography
                          component="span"
                          noWrap
                          title="Metronome click"
                          sx={(theme) => ({
                            ...stanzaMixTrackLabelSurfaceSx(theme),
                            flex: '0 1 auto',
                            minWidth: 0,
                            maxWidth: STANZA_MIX_LABEL_MAX_WIDTH,
                            alignSelf: 'center',
                          })}
                        >
                          Metronome
                        </Typography>
                        <AppLinearVolumeSlider
                          value={mixMetronomeGainDraft ?? metronomeUserGain}
                          onChange={(_, v) =>
                            setMixMetronomeGainDraft(stanzaSanitizeLinearBusGain(v as number))
                          }
                          onChangeCommitted={async (_, v) => {
                            const n = stanzaSanitizeLinearBusGain(v as number);
                            await persistSong({ id: selected.id, metronomeGain: n });
                            setMixMetronomeGainDraft(null);
                          }}
                          aria-label="Metronome click level"
                          sx={{
                            alignSelf: 'center',
                            opacity: metronomeUserMuted || !selected.metronomeEnabled ? 0.42 : 1,
                            transition: 'opacity 0.15s ease',
                          }}
                        />
                        <Box sx={{ width: STANZA_MIX_TRAIL_BALANCE_PX, flexShrink: 0 }} aria-hidden />
                      </Box>
                      {selected.drumsEnabled ? (
                        <Box
                          className="stanza-mix-row stanza-mix-row--system"
                          sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 28 }}
                        >
                          <Box sx={{ width: STANZA_MIX_DRAG_COL_PX, flexShrink: 0 }} aria-hidden />
                          <AppTooltip
                            title={
                              drumsUserMuted
                                ? 'Unmute the drum groove'
                                : 'Mute the drum groove (pattern and level are preserved)'
                            }
                          >
                            <IconButton
                              size="small"
                              aria-label={drumsUserMuted ? 'Unmute drums' : 'Mute drums'}
                              onClick={() =>
                                void persistSong({ id: selected.id, drumsMuted: !drumsUserMuted })
                              }
                              sx={{ p: 0.35, alignSelf: 'center' }}
                            >
                              {drumsUserMuted ? (
                                <VolumeOffOutlinedIcon sx={{ fontSize: 18 }} />
                              ) : (
                                <VolumeUpOutlinedIcon sx={{ fontSize: 18 }} />
                              )}
                            </IconButton>
                          </AppTooltip>
                          <Typography
                            component="span"
                            noWrap
                            title="Drum groove"
                            sx={(theme) => ({
                              ...stanzaMixTrackLabelSurfaceSx(theme),
                              flex: '0 1 auto',
                              minWidth: 0,
                              maxWidth: STANZA_MIX_LABEL_MAX_WIDTH,
                              alignSelf: 'center',
                            })}
                          >
                            Drums
                          </Typography>
                          <AppLinearVolumeSlider
                            value={mixDrumsGainDraft ?? drumsUserGain}
                            onChange={(_, v) =>
                              setMixDrumsGainDraft(stanzaSanitizeLinearBusGain(v as number))
                            }
                            onChangeCommitted={async (_, v) => {
                              const n = stanzaSanitizeLinearBusGain(v as number);
                              await persistSong({ id: selected.id, drumsGain: n });
                              setMixDrumsGainDraft(null);
                            }}
                            aria-label="Drums level"
                            sx={{
                              alignSelf: 'center',
                              opacity: drumsUserMuted ? 0.42 : 1,
                              transition: 'opacity 0.15s ease',
                            }}
                          />
                          <Box sx={{ width: STANZA_MIX_TRAIL_BALANCE_PX, flexShrink: 0 }} aria-hidden />
                        </Box>
                      ) : null}
                      {!isYoutube ? (
                        <Box
                          className="stanza-mix-row"
                          sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 28 }}
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
                            value={
                              mixPrimaryGainDraft ??
                              stanzaSanitizeLinearBusGain(selected.primaryGain)
                            }
                            onChange={(_, v) =>
                              setMixPrimaryGainDraft(stanzaSanitizeLinearBusGain(v as number))
                            }
                            onChangeCommitted={async (_, v) => {
                              const n = stanzaSanitizeLinearBusGain(v as number);
                              await persistSong({ id: selected.id, primaryGain: n });
                              setMixPrimaryGainDraft(null);
                            }}
                            aria-label="Main track level"
                            sx={{
                              alignSelf: 'center',
                              opacity: primaryPlaybackMuted(selected) ? 0.42 : 1,
                              transition: 'opacity 0.15s ease',
                            }}
                          />
                          <Box sx={{ width: STANZA_MIX_TRAIL_BALANCE_PX, flexShrink: 0 }} aria-hidden />
                        </Box>
                      ) : null}
                      {!isYoutube
                        ? (selected.stems ?? []).map((stem) => (
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
                              gap: 1,
                              minHeight: 28,
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
                                    touchAction: 'manipulation',
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
                                  title={`${stem.label} (click to rename)`}
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
                              value={
                                mixStemGainDraftById[stem.id] ??
                                stanzaSanitizeLinearBusGain(stem.gain)
                              }
                              onChange={(_, v) => {
                                const n = stanzaSanitizeLinearBusGain(v as number);
                                setMixStemGainDraftById((prev) => ({ ...prev, [stem.id]: n }));
                              }}
                              onChangeCommitted={async (_, v) => {
                                const n = stanzaSanitizeLinearBusGain(v as number);
                                await persistSong({
                                  id: selected.id,
                                  stems: (selected.stems ?? []).map((s) =>
                                    s.id === stem.id ? { ...s, gain: n } : s,
                                  ),
                                });
                                setMixStemGainDraftById((prev) => {
                                  const next = { ...prev };
                                  delete next[stem.id];
                                  return next;
                                });
                              }}
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
                        ))
                        : null}
                    </Stack>
                    {!isYoutube ? (
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
                    ) : null}
                  </Box>
                </Stack>
                </Box>
              </Paper>

              <Box className="stanza-viewer-timeline-slot">
                {markerEditNotice ? (
                  <Alert
                    severity="info"
                    onClose={() => setMarkerEditNotice(null)}
                    sx={{ mb: 1 }}
                  >
                    {markerEditNotice}
                  </Alert>
                ) : null}
                <StanzaTimeline
                  duration={playback.duration}
                  currentTime={playback.currentTime}
                  transportTime={resolveStanzaTimelineTransport(
                    playback.currentTime,
                    seekDisplayPendingRef.current,
                  )}
                  markers={selected.markers ?? []}
                  segmentMs={selected.stats}
                  selectedSegmentIndices={selectedSegmentIndices}
                  loopMode={loopMode}
                  onLoopModeChange={onLoopModeChange}
                  isPlaying={playback.isPlaying}
                  onPlay={playUnified}
                  onPause={pauseUnified}
                  onSeek={userSeekUnified}
                  onSelectSegments={handleSelectSegments}
                  onMarkersChange={(m, ctx) => void commitMarkers(m, ctx)}
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
                  selectionSpanBeatDeltaSec={selectionSpanBeatDeltaSec}
                  metronomeBySegmentId={selected.metronomeBySegmentId}
                  metronomeSongCalibration={selected.metronomeSongCalibration}
                  onSnapSectionBoundariesToBeat={snapHoveredSectionBoundariesToBeat}
                  skippedBySegmentId={selected.skippedBySegmentId}
                  onSegmentSkippedChange={setSegmentSkipped}
                  onSelectionSpanNudge={nudgeSectionSelectionExtend}
                  onSelectionMusicalPad={applyMusicalSelectionPad}
                  onResetSelectionSpan={resetSectionSelectionExtend}
                  onCommitSelectionToBoundaries={
                    selectionCommitControl ? commitSelectionSpanToSectionBoundaries : undefined
                  }
                  commitSelectionToBoundariesDisabled={selectionCommitControl?.disabled ?? false}
                  commitSelectionToBoundariesTitle={selectionCommitControl?.title}
                  selectionExtendActive={
                    sectionSelectionExtend.startDelta !== 0 || sectionSelectionExtend.endDelta !== 0
                  }
                />
              </Box>
        </StanzaViewerLayout>
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
            this device: markers and sections, focus-time stats, and per-section metronome calibration.
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
        <DialogTitle id="stanza-stem-drop-title">Add as mix layers?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.55 }}>
            {stemDropConfirm
              ? `Each file is about the same length as the loaded track (${stemDropConfirm.refSec.toFixed(
                  1,
                )} s, within ±${STANZA_STEM_DURATION_MATCH_EPS_SEC.toFixed(2)} s). That usually means an alternate mix (for example, an instrumental).`
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
            Add as layers
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
