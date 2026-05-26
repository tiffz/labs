import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { useEncoreAuth } from '../../context/EncoreAuthContext';
import {
  loadOriginalTakeAudioObjectUrl,
  originalTakePlaybackErrorMessage,
} from '../loadOriginalTakeAudioUrl';

export type OriginalsPlaybackTarget = {
  songId: string;
  songTitle: string;
  takeId: string;
  takeLabel: string;
  driveFileId: string;
  mimeType?: string;
};

export type OriginalsPlaybackPhase = 'idle' | 'loading' | 'playing' | 'error';

type EncoreOriginalsPlaybackContextValue = {
  target: OriginalsPlaybackTarget | null;
  phase: OriginalsPlaybackPhase;
  errorMessage: string | null;
  objectUrl: string | null;
  audioRef: RefObject<HTMLAudioElement | null>;
  playTake: (target: OriginalsPlaybackTarget) => void;
  stopPlayback: () => void;
  isPlayingTake: (songId: string, takeId: string) => boolean;
  isLoadingTake: (songId: string, takeId: string) => boolean;
};

const EncoreOriginalsPlaybackContext = createContext<EncoreOriginalsPlaybackContextValue | null>(null);

export function EncoreOriginalsPlaybackProvider({ children }: { children: ReactNode }): ReactElement {
  const { googleAccessToken } = useEncoreAuth();
  const [target, setTarget] = useState<OriginalsPlaybackTarget | null>(null);
  const [phase, setPhase] = useState<OriginalsPlaybackPhase>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadIdRef = useRef(0);

  const stopPlayback = useCallback(() => {
    loadIdRef.current += 1;
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.removeAttribute('src');
    setTarget(null);
    setPhase('idle');
    setErrorMessage(null);
    setObjectUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const playTake = useCallback(
    (next: OriginalsPlaybackTarget) => {
      if (target?.songId === next.songId && target.takeId === next.takeId && phase !== 'idle' && phase !== 'error') {
        stopPlayback();
        return;
      }
      loadIdRef.current += 1;
      audioRef.current?.pause();
      setObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setTarget(next);
      setPhase('loading');
      setErrorMessage(null);
    },
    [phase, stopPlayback, target],
  );

  useEffect(() => {
    if (!target?.driveFileId) return;
    if (!googleAccessToken) {
      setPhase('error');
      setErrorMessage('Sign in to Google to play this take.');
      return;
    }

    const loadId = loadIdRef.current + 1;
    loadIdRef.current = loadId;
    let revoked: string | null = null;

    void (async () => {
      try {
        const { objectUrl: url } = await loadOriginalTakeAudioObjectUrl(
          googleAccessToken,
          target.driveFileId,
          target.mimeType,
        );
        if (loadIdRef.current !== loadId) {
          URL.revokeObjectURL(url);
          return;
        }
        revoked = url;
        setObjectUrl(url);
        setPhase('playing');
        setErrorMessage(null);
      } catch (err) {
        if (loadIdRef.current !== loadId) return;
        setPhase('error');
        setErrorMessage(originalTakePlaybackErrorMessage(err));
        setObjectUrl(null);
      }
    })();

    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [googleAccessToken, target]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !objectUrl || phase !== 'playing') return;
    audio.src = objectUrl;
    void audio.play().catch(() => {
      setPhase('error');
      setErrorMessage('Playback was blocked. Press play on the audio controls below.');
    });
  }, [objectUrl, phase]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => stopPlayback();
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, [stopPlayback]);

  const isPlayingTake = useCallback(
    (songId: string, takeId: string) =>
      target?.songId === songId && target.takeId === takeId && (phase === 'playing' || phase === 'loading'),
    [phase, target],
  );

  const isLoadingTake = useCallback(
    (songId: string, takeId: string) =>
      target?.songId === songId && target.takeId === takeId && phase === 'loading',
    [phase, target],
  );

  const value = useMemo<EncoreOriginalsPlaybackContextValue>(
    () => ({
      target,
      phase,
      errorMessage,
      objectUrl,
      audioRef,
      playTake,
      stopPlayback,
      isPlayingTake,
      isLoadingTake,
    }),
    [target, phase, errorMessage, objectUrl, playTake, stopPlayback, isPlayingTake, isLoadingTake],
  );

  return <EncoreOriginalsPlaybackContext.Provider value={value}>{children}</EncoreOriginalsPlaybackContext.Provider>;
}

export function useEncoreOriginalsPlayback(): EncoreOriginalsPlaybackContextValue {
  const ctx = useContext(EncoreOriginalsPlaybackContext);
  if (!ctx) {
    throw new Error('useEncoreOriginalsPlayback must be used within EncoreOriginalsPlaybackProvider');
  }
  return ctx;
}
