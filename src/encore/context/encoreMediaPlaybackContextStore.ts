import { createContext, useContext, type RefObject } from 'react';
import type {
  LabsYouTubeController,
  LabsYouTubePlaybackState,
} from '../../shared/youtube/LabsYouTubePlayer';
import type {
  EncoreMediaPlaybackPhase,
  EncoreMediaPlaybackTarget,
} from '../media/encorePlayableMedia';

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

type EncoreMediaTransportState = {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
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
  isPlayingTake: (songId: string, takeId: string) => boolean;
  isLoadingTake: (songId: string, takeId: string) => boolean;
  /** @deprecated Prefer {@link mediaRef}. */
  audioRef: RefObject<HTMLAudioElement | null>;
  registerYoutubeController: (controller: LabsYouTubeController | null) => void;
  youtubeVideoId: string | null;
};

/** Stable context ref — keep in this file so Vite HMR on the provider does not recreate the context. */
export const EncoreMediaPlaybackContext = createContext<EncoreMediaPlaybackContextValue | null>(null);

export function useEncoreMediaPlayback(): EncoreMediaPlaybackContextValue {
  const ctx = useContext(EncoreMediaPlaybackContext);
  if (!ctx) {
    throw new Error('useEncoreMediaPlayback must be used within EncoreMediaPlaybackProvider');
  }
  return ctx;
}

export function useEncoreOriginalsPlayback(): Pick<
  EncoreMediaPlaybackContextValue,
  'target' | 'phase' | 'errorMessage' | 'objectUrl' | 'audioRef' | 'playTake' | 'stopPlayback' | 'isPlayingTake' | 'isLoadingTake'
> {
  const ctx = useEncoreMediaPlayback();
  return {
    target: ctx.target,
    phase: ctx.phase,
    errorMessage: ctx.errorMessage,
    objectUrl: ctx.objectUrl,
    audioRef: ctx.audioRef,
    playTake: ctx.playTake,
    stopPlayback: ctx.stopPlayback,
    isPlayingTake: ctx.isPlayingTake,
    isLoadingTake: ctx.isLoadingTake,
  };
}
