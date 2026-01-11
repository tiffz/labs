import React, { useRef, useEffect, useCallback } from 'react';

interface VideoPlayerProps {
  videoUrl: string;
  isPlaying: boolean;
  currentTime: number;
  playbackRate?: number;
  onTimeUpdate?: (time: number) => void;
  /** Called when user clicks the video to toggle play/pause */
  onPlayPauseToggle?: () => void;
}

/**
 * Synced video player that follows the main audio playback.
 * Audio is always the source of truth - video follows.
 */
const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  isPlaying,
  currentTime,
  playbackRate = 1.0,
  onTimeUpdate,
  onPlayPauseToggle,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSyncTime = useRef(0);
  const lastCurrentTime = useRef(0);
  const isSeeking = useRef(false);

  // Sync video playback rate
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = playbackRate;
  }, [playbackRate]);

  // Sync video playback state with audio
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      if (video.paused) {
        video.play().catch(() => {
          // Autoplay may be blocked - user will need to interact
        });
      }
    } else {
      if (!video.paused) {
        video.pause();
      }
      // Sync position when paused
      if (Math.abs(video.currentTime - currentTime) > 0.1) {
        video.currentTime = currentTime;
      }
    }
  }, [isPlaying, currentTime]);

  // Detect loop/jump: if currentTime moved backward significantly, it's a loop
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isSeeking.current) return;

    const timeDelta = currentTime - lastCurrentTime.current;
    lastCurrentTime.current = currentTime;

    // Detect backwards jump (loop) - immediately sync
    if (timeDelta < -0.5) {
      video.currentTime = currentTime;
      lastSyncTime.current = performance.now();
      return;
    }
  }, [currentTime]);

  // Continuous sync: keep video aligned with audio
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isSeeking.current || !isPlaying) return;

    const drift = video.currentTime - currentTime;
    const absDrift = Math.abs(drift);

    // Immediate hard sync if drift > 0.15s
    if (absDrift > 0.15) {
      const now = performance.now();
      // Rate-limit hard syncs to avoid stuttering (but allow more frequent than before)
      if (now - lastSyncTime.current > 200) {
        video.currentTime = currentTime;
        lastSyncTime.current = now;
      }
    }
  }, [currentTime, isPlaying]);

  // Periodic sync check using animation frame for smoother sync
  useEffect(() => {
    if (!isPlaying) return;

    let animationId: number;
    const checkSync = () => {
      const video = videoRef.current;
      if (video && !isSeeking.current) {
        const drift = Math.abs(video.currentTime - currentTime);
        // If drift exceeds threshold, do a soft correction
        if (drift > 0.1) {
          const now = performance.now();
          if (now - lastSyncTime.current > 100) {
            video.currentTime = currentTime;
            lastSyncTime.current = now;
          }
        }
      }
      animationId = requestAnimationFrame(checkSync);
    };

    animationId = requestAnimationFrame(checkSync);
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying, currentTime]);

  // Handle video seeking by user
  const handleSeeking = useCallback(() => {
    isSeeking.current = true;
  }, []);

  const handleSeeked = useCallback(() => {
    isSeeking.current = false;
    const video = videoRef.current;
    if (video && onTimeUpdate) {
      onTimeUpdate(video.currentTime);
    }
  }, [onTimeUpdate]);

  // Handle video time updates
  const handleTimeUpdate = useCallback(() => {
    // Audio is source of truth, so we don't report video time updates
  }, []);

  // Handle click on video to toggle play/pause
  const handleClick = useCallback(() => {
    if (onPlayPauseToggle) {
      onPlayPauseToggle();
    }
  }, [onPlayPauseToggle]);

  return (
    <div className="video-player" onClick={handleClick} style={{ cursor: 'pointer' }}>
      <video
        ref={videoRef}
        src={videoUrl}
        className="video-element"
        playsInline
        muted // Muted because audio comes from our audio player
        onSeeking={handleSeeking}
        onSeeked={handleSeeked}
        onTimeUpdate={handleTimeUpdate}
      />
      {/* Play/pause overlay indicator */}
      {!isPlaying && (
        <div className="video-play-overlay">
          <span className="material-symbols-outlined">play_arrow</span>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
