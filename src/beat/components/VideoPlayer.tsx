import React, { useRef, useEffect, useCallback } from 'react';

interface VideoPlayerProps {
  videoUrl: string;
  isPlaying: boolean;
  currentTime: number;
  playbackRate?: number;
  onTimeUpdate?: (time: number) => void;
}

/**
 * Synced video player that follows the main audio playback
 */
const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  isPlaying,
  currentTime,
  playbackRate = 1.0,
  onTimeUpdate,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSyncTime = useRef(0);
  const isSeeking = useRef(false);

  // Sync video playback rate
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = playbackRate;
  }, [playbackRate]);

  // Sync video playback state with audio - use immediate effect for stopping
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
      // Always ensure video is paused when isPlaying is false
      if (!video.paused) {
        video.pause();
      }
      // Also reset to the current time position
      if (Math.abs(video.currentTime - currentTime) > 0.5) {
        video.currentTime = currentTime;
      }
    }
  }, [isPlaying, currentTime]);

  // Sync video position with audio time
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isSeeking.current) return;

    // Only sync if we've drifted more than 0.2 seconds
    const drift = Math.abs(video.currentTime - currentTime);
    if (drift > 0.2) {
      // Don't sync too frequently
      const now = performance.now();
      if (now - lastSyncTime.current > 500) {
        video.currentTime = currentTime;
        lastSyncTime.current = now;
      }
    }
  }, [currentTime]);

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
    const video = videoRef.current;
    if (video && onTimeUpdate && !isSeeking.current) {
      // Only report time if we're the source of truth (video is playing but audio isn't synced)
      // In normal operation, audio is source of truth
    }
  }, [onTimeUpdate]);

  return (
    <div className="video-player">
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
    </div>
  );
};

export default VideoPlayer;
