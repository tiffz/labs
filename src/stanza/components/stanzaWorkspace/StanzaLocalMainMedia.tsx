import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import {
  readBestKnownMediaDurationSec,
  resolveStickyTransportDurationSec,
} from '../../utils/stanzaMediaDuration';
import { mergeStanzaPlaybackSnapshot } from '../../utils/stanzaPlaybackStateMerge';

export type StanzaPlaybackViewState = {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackRate: number;
};

type StanzaLocalMainMediaProps = {
  songId: string;
  remountKey: number;
  localUrl: string;
  isLocalVideo: boolean;
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  audioRef: MutableRefObject<HTMLAudioElement | null>;
  knownHorizonSecRef: MutableRefObject<number>;
  setPlayback: Dispatch<SetStateAction<StanzaPlaybackViewState>>;
  onRequestPlay: () => void;
  onRequestPause: () => void;
  /** Fires on media `play`: snap stems, schedule alignment, sync transpose mirror. */
  onMainPlay: () => void;
  /** Fires on media `pause`: stop transpose mirrors, pause stems. */
  onMainPause: () => void;
  /** Fires on media `ended`: stop transpose mirrors, run loop end-handling. */
  onMainEnded: () => void;
};

/**
 * Local main media element (video or audio) with the sticky-duration transport wiring.
 * HTML5 `durationchange` can report a duration shorter than the decoded/fingerprint horizon;
 * every duration write goes through `resolveStickyTransportDurationSec` (root cause class
 * `html5-duration-shrink` — docs/STANZA_PLAYBACK.md § Duration trust).
 */
export default function StanzaLocalMainMedia({
  songId,
  remountKey,
  localUrl,
  isLocalVideo,
  videoRef,
  audioRef,
  knownHorizonSecRef,
  setPlayback,
  onRequestPlay,
  onRequestPause,
  onMainPlay,
  onMainPause,
  onMainEnded,
}: StanzaLocalMainMediaProps) {
  const handleTimeUpdate = (el: HTMLMediaElement) => {
    const fd = readBestKnownMediaDurationSec(el);
    setPlayback((p) =>
      mergeStanzaPlaybackSnapshot(p, {
        currentTime: el.currentTime,
        duration: resolveStickyTransportDurationSec({
          previousDurationSec: p.duration,
          elementDurationSec: fd,
          knownHorizonSec: knownHorizonSecRef.current,
        }),
        isPlaying: !el.paused,
        playbackRate: el.playbackRate,
      }),
    );
  };

  const handleLoadedMetadata = (el: HTMLMediaElement) => {
    const fd = readBestKnownMediaDurationSec(el);
    setPlayback((p) => ({
      ...p,
      duration: resolveStickyTransportDurationSec({
        previousDurationSec: p.duration,
        elementDurationSec: fd,
        knownHorizonSec: knownHorizonSecRef.current,
      }),
      playbackRate: el.playbackRate,
    }));
  };

  const handleDurationChange = (el: HTMLMediaElement) => {
    const fd = readBestKnownMediaDurationSec(el);
    if (fd == null) return;
    setPlayback((p) => {
      const next = resolveStickyTransportDurationSec({
        previousDurationSec: p.duration,
        elementDurationSec: fd,
        knownHorizonSec: knownHorizonSecRef.current,
      });
      return p.duration === next ? p : { ...p, duration: next };
    });
  };

  const handlePlay = () => {
    onMainPlay();
    setPlayback((p) => ({ ...p, isPlaying: true }));
  };

  const handlePause = () => {
    onMainPause();
    setPlayback((p) => ({ ...p, isPlaying: false }));
  };

  if (isLocalVideo) {
    return (
      /* eslint-disable-next-line jsx-a11y/media-has-caption -- user recording; no captions */
      <video
        key={`${songId}:${remountKey}`}
        ref={videoRef}
        className="stanza-local-video"
        src={localUrl}
        playsInline
        aria-label="Local video track. Click to play or pause."
        onClick={() => {
          const v = videoRef.current;
          if (!v) return;
          if (v.paused) onRequestPlay();
          else onRequestPause();
        }}
        onTimeUpdate={() => {
          const el = videoRef.current;
          if (el) handleTimeUpdate(el);
        }}
        onLoadedMetadata={() => {
          const el = videoRef.current;
          if (el) handleLoadedMetadata(el);
        }}
        onDurationChange={() => {
          const el = videoRef.current;
          if (el) handleDurationChange(el);
        }}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={onMainEnded}
      />
    );
  }

  return (
    /* eslint-disable-next-line jsx-a11y/media-has-caption -- user-supplied audio; no captions */
    <audio
      key={`${songId}:${remountKey}`}
      ref={audioRef}
      className="stanza-local-audio"
      src={localUrl}
      style={{ width: '100%', marginTop: 8, borderRadius: 8 }}
      aria-label="Local audio track"
      onTimeUpdate={() => {
        const el = audioRef.current;
        if (el) handleTimeUpdate(el);
      }}
      onLoadedMetadata={() => {
        const el = audioRef.current;
        if (el) handleLoadedMetadata(el);
      }}
      onDurationChange={() => {
        const el = audioRef.current;
        if (el) handleDurationChange(el);
      }}
      onPlay={handlePlay}
      onPause={handlePause}
      onEnded={onMainEnded}
    />
  );
}
