import { createContext, useContext, type RefObject } from 'react';
import type {
  LabsYouTubeController,
  LabsYouTubePlaybackState,
} from '../../shared/youtube/LabsYouTubePlayer';
import type {
  EncoreMediaPlaybackPhase,
  EncoreMediaPlaybackTarget,
} from '../media/encorePlayableMedia';
import type { EncoreMediaPlaybackQueueSnapshot } from '../media/encoreMediaPlaybackQueue';

export type OriginalsPlaybackTarget = {
  songId: string;
  songTitle: string;
  takeId: string;
  takeLabel: string;
  driveFileId?: string;
  /** IndexedDB key `${songId}:${takeId}` when playing from a local Originals take cache. */
  localTakeKey?: string;
  mimeType?: string;
};

export type EncoreMediaPlaybackContextValue = {
  target: EncoreMediaPlaybackTarget | null;
  phase: EncoreMediaPlaybackPhase;
  errorMessage: string | null;
  objectUrl: string | null;
  mediaRef: RefObject<HTMLMediaElement | null>;
  transport: EncoreMediaTransportState;
  playbackRate: number;
  transposeSemitones: number;
  loopEnabled: boolean;
  setPlaybackRate: (rate: number) => void;
  setTransposeSemitones: (semitones: number) => void;
  setLoopEnabled: (enabled: boolean) => void;
  playMedia: (target: EncoreMediaPlaybackTarget) => void;
  playMediaQueue: (targets: EncoreMediaPlaybackTarget[]) => void;
  playbackQueue: EncoreMediaPlaybackQueueSnapshot | null;
  stopPlayback: () => void;
  togglePlayPause: () => void;
  seekTo: (seconds: number) => void;
  seekToStart: () => void;
  seekToEnd: () => void;
  youtubeIsPlaying: boolean;
  handleYoutubeStateChange: (state: LabsYouTubePlaybackState) => void;
  handleYoutubeEnded: () => void;
  handleYoutubePlayerError: (errorCode: number) => void;
  youtubePlayerErrorCode: number | null;
  isActiveMedia: (playbackId: string) => boolean;
  isLoadingMedia: (playbackId: string) => boolean;
  /** Originals takes compatibility */
  playTake: (target: OriginalsPlaybackTarget) => void;
  playTakeQueue: (targets: OriginalsPlaybackTarget[]) => void;
  isPlayingTake: (songId: string, takeId: string) => boolean;
  isLoadingTake: (songId: string, takeId: string) => boolean;
  /** @deprecated Prefer {@link mediaRef}. */
  audioRef: RefObject<HTMLAudioElement | null>;
  registerYoutubeController: (controller: LabsYouTubeController | null) => void;
  youtubeVideoId: string | null;
};

type EncoreMediaTransportState = {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
};

export type EncoreMediaTransportContextValue = {
  transport: EncoreMediaTransportState;
};

/** Control plane only — omits {@link EncoreMediaPlaybackContextValue.transport} so list cards avoid timeupdate re-renders. */
export type EncoreMediaPlaybackControlsValue = Omit<EncoreMediaPlaybackContextValue, 'transport'>;

/** Stable context ref — keep in this file so Vite HMR on the provider does not recreate the context. */
export const EncoreMediaPlaybackContext = createContext<EncoreMediaPlaybackContextValue | null>(null);

export const EncoreMediaPlaybackControlsContext = createContext<EncoreMediaPlaybackControlsValue | null>(null);

export const EncoreMediaTransportContext = createContext<EncoreMediaTransportContextValue | null>(null);

export function useEncoreMediaPlaybackControls(): EncoreMediaPlaybackControlsValue {
  const ctx = useContext(EncoreMediaPlaybackControlsContext);
  if (!ctx) {
    throw new Error('useEncoreMediaPlaybackControls must be used within EncoreMediaPlaybackProvider');
  }
  return ctx;
}

export function useEncoreMediaTransport(): EncoreMediaTransportContextValue {
  const ctx = useContext(EncoreMediaTransportContext);
  if (!ctx) {
    throw new Error('useEncoreMediaTransport must be used within EncoreMediaPlaybackProvider');
  }
  return ctx;
}

export function useEncoreMediaPlayback(): EncoreMediaPlaybackContextValue {
  const controls = useEncoreMediaPlaybackControls();
  const { transport } = useEncoreMediaTransport();
  return { ...controls, transport };
}

export function useEncoreOriginalsPlayback(): Pick<
  EncoreMediaPlaybackContextValue,
  'target' | 'phase' | 'errorMessage' | 'objectUrl' | 'audioRef' | 'playTake' | 'playTakeQueue' | 'playbackQueue' | 'stopPlayback' | 'isPlayingTake' | 'isLoadingTake'
> {
  const ctx = useEncoreMediaPlaybackControls();
  return {
    target: ctx.target,
    phase: ctx.phase,
    errorMessage: ctx.errorMessage,
    objectUrl: ctx.objectUrl,
    audioRef: ctx.audioRef,
    playTake: ctx.playTake,
    playTakeQueue: ctx.playTakeQueue,
    playbackQueue: ctx.playbackQueue,
    stopPlayback: ctx.stopPlayback,
    isPlayingTake: ctx.isPlayingTake,
    isLoadingTake: ctx.isLoadingTake,
  };
}
