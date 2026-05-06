import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUp from '@mui/icons-material/KeyboardArrowUp';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import AppTooltip from '../../shared/components/AppTooltip';
import MetronomeToggleButton from '../../shared/components/MetronomeToggleButton';
import { useLabsUndo } from '../../shared/undo/LabsUndoContext';
import { stanzaDb, type StanzaSong, type StanzaTake } from '../db/stanzaDb';
import { buildLocalAudioStanzaSong } from '../db/stanzaLocalAudioImport';
import {
  readStanzaLastSelectedSongId,
  writeStanzaLastSelectedSongId,
} from '../db/stanzaLastSelectedSong';
import { useStanzaFileDrop } from '../hooks/useStanzaFileDrop';
import { canResolveYoutubePaste, resolveYoutubePaste } from '../utils/youtubePasteImport';
import { deriveSegments, ensureMarkerIds, findSegmentIndexAtTime, STANZA_TIME_EPS } from '../utils/segments';
import {
  computeLoopHull,
  STANZA_LOOP_EPS,
  type StanzaPlaybackLoopMode,
} from '../utils/stanzaPlaybackLoop';
import { migrateStanzaSongSegmentKeysIfNeeded } from '../utils/stanzaSegmentMigration';
import { fetchYoutubeOEmbedTitle, youtubeMqThumbnailUrl } from '../utils/stanzaYoutubeMeta';
import { readYoutubeVFromLocation, replaceStanzaYoutubeSearchParam } from '../utils/stanzaUrlYoutube';
import type { GuidedRegimen } from '../utils/conductorRegimen';
import StanzaYouTubePlayer, { type StanzaYouTubeController } from './StanzaYouTubePlayer';
import StanzaTimeline from './StanzaTimeline';
import ConductorOverlay from './ConductorOverlay';
import MetronomeWizard from './MetronomeWizard';
import StanzaRepeatMark from './StanzaRepeatMark';
import { useMetronomeSync } from '../hooks/useMetronomeSync';

/** YouTube embed and local audio: stay within a conservative range. */
const STANZA_RATE_MIN = 0.25;
const STANZA_RATE_MAX = 2;
const STANZA_RATE_STEP = 0.05;
/** Common presets; any rate in [min,max] is available via the numeric control. */
const SPEED_PRESETS = [0.5, 0.75, 1, 1.25, 1.5] as const;

function formatPlaybackRateForInput(rate: number): string {
  const r = Math.round(rate * 100) / 100;
  return String(r);
}

function songHasPractice(s: StanzaSong): boolean {
  return (s.markers?.length ?? 0) > 0 || Object.keys(s.stats ?? {}).length > 0;
}

export default function StanzaWorkspace() {
  const songs = useLiveQuery(() => stanzaDb.songs.orderBy('updatedAt').reverse().toArray(), []);
  const { push: pushUndo, isReplayingRef } = useLabsUndo();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ytPaste, setYtPaste] = useState('');
  const [loopMode, setLoopMode] = useState<StanzaPlaybackLoopMode>('through');
  const [selectedSegmentIndices, setSelectedSegmentIndices] = useState<number[]>([]);
  const [lastClickedSegmentIndex, setLastClickedSegmentIndex] = useState<number | null>(null);
  const [playback, setPlayback] = useState({
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    playbackRate: 1,
  });
  const ytControllerRef = useRef<StanzaYouTubeController | null>(null);
  const pendingYoutubeBootstrapRef = useRef<{ songId: string; seekSec?: number; rate?: number } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeRef = useRef(0);
  const durationRef = useRef(0);
  const playingRef = useRef(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [conductorOpen, setConductorOpen] = useState(false);
  const [regimen, setRegimen] = useState<GuidedRegimen>('accuracy');
  const [guidedSegmentIndex, setGuidedSegmentIndex] = useState(0);
  const [guidedSinceCp, setGuidedSinceCp] = useState(0);
  const [recState, setRecState] = useState<'idle' | 'recording'>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<Blob[]>([]);
  const recStreamRef = useRef<MediaStream | null>(null);
  const [removeConfirmSong, setRemoveConfirmSong] = useState<StanzaSong | null>(null);
  const [libraryMenu, setLibraryMenu] = useState<{ anchor: HTMLElement; songId: string } | null>(null);
  const oembedAttemptedRef = useRef(new Set<string>());
  const urlBootstrapDoneRef = useRef(false);
  const lastPushedYoutubeV = useRef<string | null | undefined>(undefined);

  const selected = useMemo(() => songs?.find((s) => s.id === selectedId) ?? null, [songs, selectedId]);
  const isYoutube = Boolean(selected?.ytId);

  type UrlSyncState = 'none' | 'pending' | 'local' | { kind: 'yt'; id: string };

  const urlSyncState = useMemo((): UrlSyncState => {
    if (!selectedId) return 'none';
    if (!songs) return 'pending';
    const row = songs.find((s) => s.id === selectedId);
    if (!row) return 'pending';
    if (row.ytId) return { kind: 'yt', id: row.ytId };
    return 'local';
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

  useEffect(() => {
    if (urlBootstrapDoneRef.current) return;
    urlBootstrapDoneRef.current = true;
    const vid = readYoutubeVFromLocation();
    if (!vid) return;
    void ensureYoutubeSongByVideoId(vid).then((id) => setSelectedId(id));
  }, [ensureYoutubeSongByVideoId]);

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
    const next = urlSyncState === 'none' || urlSyncState === 'local' ? null : urlSyncState.id;
    if (lastPushedYoutubeV.current === next) return;
    lastPushedYoutubeV.current = next;
    replaceStanzaYoutubeSearchParam(next);
  }, [urlSyncState]);

  useEffect(() => {
    const p = pendingYoutubeBootstrapRef.current;
    if (p && selectedId != null && p.songId !== selectedId) pendingYoutubeBootstrapRef.current = null;
  }, [selectedId]);

  useEffect(() => {
    setSelectedSegmentIndices([]);
    setLastClickedSegmentIndex(null);
    setLoopMode('through');
  }, [selectedId]);

  const localUrl = useMemo(() => {
    if (!selected?.localAudioBlob) return null;
    return URL.createObjectURL(selected.localAudioBlob);
  }, [selected?.localAudioBlob]);

  useEffect(() => {
    return () => {
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [localUrl]);

  useEffect(() => {
    timeRef.current = playback.currentTime;
    durationRef.current = playback.duration;
    playingRef.current = playback.isPlaying;
  }, [playback]);

  const segments = useMemo(
    () => deriveSegments(selected?.markers ?? [], playback.duration),
    [selected?.markers, playback.duration],
  );

  const loopHull = useMemo(() => computeLoopHull(segments, selectedSegmentIndices), [segments, selectedSegmentIndices]);

  const [customRateInput, setCustomRateInput] = useState('1');
  useEffect(() => {
    setCustomRateInput(formatPlaybackRateForInput(playback.playbackRate));
  }, [playback.playbackRate, selectedId]);

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
   * Drag-and-drop bridge: drag an audio file from Finder/Explorer onto the Stanza page and it
   * imports + selects automatically — the "one-click" load path. The button-based pickers below
   * still exist for keyboard / a11y.
   */
  const { isDragging: isFileDragging } = useStanzaFileDrop({
    onAudioFile: (f) => addLocalSong(f),
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
      const clamped = Math.min(STANZA_RATE_MAX, Math.max(STANZA_RATE_MIN, rate));
      if (isYoutube) {
        ytControllerRef.current?.setPlaybackRate(clamped);
      } else {
        const a = audioRef.current;
        if (a) a.playbackRate = clamped;
      }
      setPlayback((p) => ({ ...p, playbackRate: clamped }));
    },
    [isYoutube],
  );

  const bumpPlaybackRate = useCallback(
    (delta: number) => {
      const next = Math.min(
        STANZA_RATE_MAX,
        Math.max(STANZA_RATE_MIN, Math.round((playback.playbackRate + delta) * 100) / 100),
      );
      applyPlaybackRate(next);
    },
    [applyPlaybackRate, playback.playbackRate],
  );

  const seekUnified = useCallback(
    (t: number) => {
      if (isYoutube) {
        ytControllerRef.current?.seekTo(t);
      } else {
        const a = audioRef.current;
        if (a) {
          a.currentTime = t;
          setPlayback((p) => ({ ...p, currentTime: t }));
        }
      }
    },
    [isYoutube],
  );

  const playUnified = useCallback(() => {
    const t = timeRef.current;
    const d = durationRef.current;
    if (loopMode === 'loopAll' && d > 0) {
      if (t < 0 || t > d - STANZA_LOOP_EPS) seekUnified(0);
    } else if (loopMode === 'loopSelection' && loopHull) {
      if (t < loopHull.start - 0.05 || t > loopHull.end - STANZA_LOOP_EPS) {
        seekUnified(loopHull.start);
      }
    }
    if (isYoutube) ytControllerRef.current?.play();
    else void audioRef.current?.play();
  }, [isYoutube, loopMode, loopHull, seekUnified]);

  const pauseUnified = useCallback(() => {
    if (isYoutube) ytControllerRef.current?.pause();
    else audioRef.current?.pause();
  }, [isYoutube]);

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
      const t = timeRef.current;
      const d = durationRef.current;
      if (loopMode === 'loopAll' && d > 0) {
        if (t >= d - STANZA_LOOP_EPS) seekUnified(0);
      } else if (loopMode === 'loopSelection' && loopHull) {
        if (t >= loopHull.end - STANZA_LOOP_EPS) seekUnified(loopHull.start);
        else if (t < loopHull.start - STANZA_LOOP_EPS) seekUnified(loopHull.start);
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [loopMode, loopHull, seekUnified]);

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
    if (!selected || wizardOpen || conductorOpen) return;
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
  }, [selected, wizardOpen, conductorOpen, persistSong]);

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
        setSelectedSegmentIndices((prev) => {
          if (prev.includes(i)) return prev.filter((x) => x !== i);
          return [...prev, i].sort((a, b) => a - b);
        });
      } else {
        setSelectedSegmentIndices([i]);
        seekUnified(seg.start);
      }
    },
    [segments, seekUnified],
  );

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
    else if (loopHull) seekUnified(loopHull.start);
  }, [loopHull, loopMode, seekUnified]);

  const skipToLoopEnd = useCallback(() => {
    const d = durationRef.current;
    if (!(d > 0)) return;
    if (loopMode === 'through' || loopMode === 'loopAll') {
      seekUnified(Math.max(0, d - STANZA_TIME_EPS));
    } else if (loopHull) {
      seekUnified(Math.max(loopHull.start, loopHull.end - STANZA_TIME_EPS));
    }
  }, [loopHull, loopMode, seekUnified]);

  useMetronomeSync(
    Boolean(selected?.metronomeEnabled && selected.metronomeBpm && selected.metronomeBpm > 0),
    selected?.metronomeBpm,
    selected?.metronomeAnchorMediaTime,
    getTime,
    playback.isPlaying,
    true,
  );

  const beatPeriod =
    selected?.metronomeBpm && selected.metronomeBpm > 0 ? `${60 / selected.metronomeBpm}s` : '1s';

  const metronomeCalibrated =
    selected != null &&
    selected.metronomeBpm != null &&
    selected.metronomeBpm > 0 &&
    selected.metronomeAnchorMediaTime != null;

  const saveWizard = useCallback(
    (bpm: number, anchorMediaTime: number) => {
      if (!selected) return;
      void persistSong({
        id: selected.id,
        metronomeBpm: bpm,
        metronomeAnchorMediaTime: anchorMediaTime,
        metronomeEnabled: true,
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
    replaceStanzaYoutubeSearchParam(null);
  }, []);

  const sectionFieldLabelSx = {
    display: 'block' as const,
    mb: 0.75,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: 'text.secondary',
    whiteSpace: 'nowrap' as const,
  };

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
              Drop to load audio
            </Typography>
            <Typography variant="body2" sx={{ color: '#5b21b6', lineHeight: 1.5 }}>
              Stanza will save it to your local library and select it as the current piece.
            </Typography>
          </Box>
        </Box>
      ) : null}
      {!selected && (
        <>
          <Box className="stanza-hero">
            <Box className="stanza-hero-inner">
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <StanzaRepeatMark size={80} />
              </Box>
              <Typography
                variant="h3"
                component="h1"
                sx={{
                  fontWeight: 600,
                  letterSpacing: '-0.028em',
                  color: '#1d1d1f',
                  mb: 1,
                }}
              >
                Stanza
              </Typography>
              <Typography
                variant="h6"
                component="p"
                sx={{
                  fontWeight: 400,
                  color: 'text.secondary',
                  mb: 3,
                  lineHeight: 1.5,
                  maxWidth: '36ch',
                  mx: 'auto',
                }}
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
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, letterSpacing: '-0.01em' }}>
                Your library
              </Typography>
              {renderLibraryGrid('landing')}
            </Paper>
          )}
        </>
      )}

      {selected && (
        <Box className="stanza-viewer-shell" sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Box
            className="stanza-viewer-header"
            sx={{
              px: { xs: 1.5, sm: 2 },
              pt: { xs: 1.75, sm: 2 },
              pb: 1.75,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            <StanzaRepeatMark size={40} />
            <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
              <Typography
                variant="h5"
                component="h1"
                sx={{
                  fontWeight: 600,
                  letterSpacing: '-0.022em',
                  lineHeight: 1.25,
                  fontSize: { xs: '1.15rem', sm: '1.35rem' },
                }}
              >
                {selected.title}
              </Typography>
              <button type="button" className="stanza-link-quiet" onClick={goHome} aria-label="Back to library" style={{ marginTop: 6 }}>
                ← Back to library
              </button>
            </Box>
          </Box>

          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', px: { xs: 1.5, sm: 2 }, pb: 1 }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={{ xs: 2.25, md: 3 }}
              alignItems="flex-start"
              sx={{ width: '100%', maxWidth: { md: 980 }, mx: 'auto' }}
            >
              <Box
                className="stanza-viewer-media-stack"
                sx={{ flex: { xs: '1 1 auto', md: '0 1 600px' }, minWidth: 0, width: '100%' }}
              >
                <Box className="stanza-video-column">
                  <Box
                    className={selected.metronomeEnabled ? 'stanza-metronome-pulse stanza-metronome-pulse--on' : 'stanza-metronome-pulse'}
                    sx={{ '--stanza-beat': beatPeriod } as React.CSSProperties}
                  >
                    {isYoutube && selected.ytId && (
                      <StanzaYouTubePlayer
                        videoId={selected.ytId}
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
                        {/* eslint-disable-next-line jsx-a11y/media-has-caption -- user-supplied audio; no captions */}
                        <audio
                          ref={audioRef}
                          className="stanza-local-audio"
                          src={localUrl}
                          style={{ width: '100%', marginTop: 8, borderRadius: 8 }}
                          aria-label="Local audio track"
                          onTimeUpdate={() => {
                            const a = audioRef.current;
                            if (!a) return;
                            setPlayback({
                              currentTime: a.currentTime,
                              duration: a.duration || 0,
                              isPlaying: !a.paused,
                              playbackRate: a.playbackRate,
                            });
                          }}
                          onLoadedMetadata={() => {
                            const a = audioRef.current;
                            if (!a) return;
                            setPlayback((p) => ({
                              ...p,
                              duration: a.duration || 0,
                              playbackRate: a.playbackRate,
                            }));
                          }}
                          onPlay={() => setPlayback((p) => ({ ...p, isPlaying: true }))}
                          onPause={() => setPlayback((p) => ({ ...p, isPlaying: false }))}
                        />
                      </>
                    )}
                  </Box>
                </Box>

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
                />
              </Box>

              <Paper
                className="stanza-panel stanza-practice-rail"
                elevation={0}
                sx={{
                  width: { xs: '100%', md: 300 },
                  flex: { md: '0 0 300px' },
                  flexShrink: 0,
                  p: { xs: 2.25, md: 2.25 },
                  alignSelf: { md: 'flex-start' },
                  border: '1px solid rgba(60, 60, 67, 0.08)',
                  boxShadow: '0 2px 18px rgba(29, 29, 31, 0.045)',
                }}
              >
                <Typography component="p" sx={{ ...sectionFieldLabelSx, mb: 1.25 }}>
                  Practice
                </Typography>
                <Stack spacing={2}>
                  <Box className="stanza-speed-section">
                    <Typography sx={{ ...sectionFieldLabelSx, mb: 1 }}>Speed</Typography>
                    <ToggleButtonGroup
                      className="stanza-segmented"
                      exclusive
                      size="small"
                      fullWidth
                      value={
                        SPEED_PRESETS.find((r) => Math.abs(r - playback.playbackRate) < 0.0001) ?? null
                      }
                      onChange={(_, v) => v != null && applyPlaybackRate(v)}
                      sx={{ mb: 1.25 }}
                    >
                      {SPEED_PRESETS.map((r) => (
                        <ToggleButton key={r} value={r} aria-label={`${r} times speed`}>
                          {r}×
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                    <TextField
                      className="stanza-speed-number"
                      size="small"
                      fullWidth
                      value={customRateInput}
                      onChange={(e) => setCustomRateInput(e.target.value)}
                      onBlur={() => {
                        const v = parseFloat(customRateInput);
                        if (Number.isFinite(v)) applyPlaybackRate(v);
                        else setCustomRateInput(formatPlaybackRateForInput(playback.playbackRate));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      type="number"
                      placeholder="1"
                      aria-label="Playback speed"
                      inputProps={{
                        step: STANZA_RATE_STEP,
                        min: STANZA_RATE_MIN,
                        max: STANZA_RATE_MAX,
                        'aria-describedby': 'stanza-speed-range-hint',
                      }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <Stack spacing={0} alignItems="center" sx={{ mr: -0.25 }}>
                              <IconButton
                                size="small"
                                aria-label="Increase playback speed"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => bumpPlaybackRate(STANZA_RATE_STEP)}
                                sx={{ p: 0.2, borderRadius: 1 }}
                              >
                                <KeyboardArrowUp sx={{ fontSize: 20 }} />
                              </IconButton>
                              <IconButton
                                size="small"
                                aria-label="Decrease playback speed"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => bumpPlaybackRate(-STANZA_RATE_STEP)}
                                sx={{ p: 0.2, borderRadius: 1 }}
                              >
                                <KeyboardArrowDown sx={{ fontSize: 20 }} />
                              </IconButton>
                            </Stack>
                          </InputAdornment>
                        ),
                      }}
                    />
                    <Typography
                      id="stanza-speed-range-hint"
                      variant="caption"
                      component="p"
                      color="text.secondary"
                      sx={{ mt: 0.75, mb: 0, opacity: 0.92, letterSpacing: '0.01em' }}
                    >
                      {STANZA_RATE_MIN}–{STANZA_RATE_MAX}× · ±{STANZA_RATE_STEP} with arrows
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={sectionFieldLabelSx}>Metronome</Typography>
                    <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                      <AppTooltip
                        title={
                          metronomeCalibrated
                            ? 'Toggle the synced click track.'
                            : 'Calibrate first to save tempo and the first downbeat.'
                        }
                      >
                        <MetronomeToggleButton
                          enabled={Boolean(selected.metronomeEnabled)}
                          disabled={!metronomeCalibrated && !selected.metronomeEnabled}
                          onToggle={() =>
                            void persistSong({ id: selected.id, metronomeEnabled: !selected.metronomeEnabled })
                          }
                          className="stanza-metronome-toggle"
                          includeNativeTitle={false}
                          includeDataTooltip={false}
                          ariaLabel="Toggle metronome"
                        />
                      </AppTooltip>
                      <Button variant="outlined" size="small" className="stanza-btn-soft-outline" onClick={() => setWizardOpen(true)}>
                        Calibrate
                      </Button>
                    </Stack>
                  </Box>
                  <Box>
                    <Typography sx={sectionFieldLabelSx}>Conductor</Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ display: 'block', mb: 1, lineHeight: 1.5, fontSize: '0.8125rem' }}
                    >
                      Full-screen listen → record → review using the regimen below.
                    </Typography>
                    <Stack spacing={1.25}>
                      <AppTooltip title="Listen → record → review for the current loop section.">
                        <Button
                          variant="contained"
                          fullWidth
                          size="medium"
                          className="stanza-btn-pill"
                          sx={{ py: 1, fontWeight: 600 }}
                          disabled={segments.length === 0}
                          onClick={() => {
                            setGuidedSegmentIndex(lastClickedSegmentIndex ?? selectedSegmentIndices[0] ?? 0);
                            setConductorOpen(true);
                          }}
                        >
                          Start guided
                        </Button>
                      </AppTooltip>
                      <FormControl size="small" fullWidth>
                        <InputLabel id="stanza-regimen-label">Regimen</InputLabel>
                        <Select
                          labelId="stanza-regimen-label"
                          label="Regimen"
                          value={regimen}
                          onChange={(e) => setRegimen(e.target.value as GuidedRegimen)}
                        >
                          <MenuItem value="rhythm">Rhythm</MenuItem>
                          <MenuItem value="accuracy">Accuracy</MenuItem>
                          <MenuItem value="performance">Performance</MenuItem>
                        </Select>
                      </FormControl>
                    </Stack>
                  </Box>
                  <Box>
                    <Typography sx={sectionFieldLabelSx}>Takes</Typography>
                    <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                      <Button
                        variant="outlined"
                        size="small"
                        className="stanza-btn-soft-outline"
                        onClick={() => (recState === 'recording' ? stopFreeformRecord() : void startFreeformRecord())}
                        aria-label={recState === 'recording' ? 'Stop recording' : 'Record take'}
                      >
                        {recState === 'recording' ? 'Stop' : 'Record'}
                      </Button>
                      <button
                        type="button"
                        className="stanza-link-quiet"
                        onClick={() => {
                          setSelectedSegmentIndices([]);
                          setLoopMode('through');
                        }}
                        aria-label="Clear section selection"
                      >
                        Clear selection
                      </button>
                    </Stack>
                  </Box>
                </Stack>
              </Paper>
            </Stack>
          </Box>

          <Accordion defaultExpanded disableGutters square className="stanza-panel stanza-library-footer">
            <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="stanza-library-panel" id="stanza-library-header">
              <Typography variant="subtitle2" sx={{ fontWeight: 600, letterSpacing: '-0.01em' }}>
                Your library
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1, fontWeight: 400 }}>
                  ({songs?.length ?? 0})
                </Typography>
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: { xs: 1.5, sm: 2 }, pb: 1.5, pt: 0.75 }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ display: 'block', mb: 1.25, fontSize: '0.8125rem', lineHeight: 1.5 }}
              >
                Add another video or file. Open directly with <code>?v=YouTubeId</code>.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1.25 }} alignItems={{ sm: 'center' }}>
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
                <Button
                  variant="contained"
                  size="small"
                  className="stanza-btn-pill"
                  onClick={() => void addYoutubeSong()}
                  disabled={!canResolveYoutubePaste(ytPaste)}
                >
                  Add
                </Button>
                <Button component="label" variant="outlined" size="small" className="stanza-btn-soft-outline">
                  Upload audio
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
            this device: markers and sections, focus-time stats, recordings (takes), and metronome calibration.
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

      <MetronomeWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        getMediaTime={getTime}
        onSave={(bpm, anchor) => saveWizard(bpm, anchor)}
      />

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
            setLastClickedSegmentIndex(i);
          }}
          onCheckpointResolved={() => setGuidedSinceCp(0)}
        />
      )}
    </Box>
  );
}
