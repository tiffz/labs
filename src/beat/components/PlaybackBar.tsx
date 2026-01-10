import React, { useCallback, useRef, useState } from 'react';

interface PlaybackBarProps {
  currentTime: number;
  duration: number;
  musicStartTime: number;
  syncStartTime: number;
  onSeek: (time: number) => void;
  onSyncStartChange: (time: number) => void;
  isInSyncRegion: boolean;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const PlaybackBar: React.FC<PlaybackBarProps> = ({
  currentTime,
  duration,
  musicStartTime,
  syncStartTime,
  onSeek,
  onSyncStartChange,
  isInSyncRegion,
}) => {
  const barRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<boolean>(false);

  const getTimeFromEvent = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      if (!barRef.current || duration === 0) return 0;
      const rect = barRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, clickX / rect.width));
      return percentage * duration;
    },
    [duration]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (dragging) return;
      const newTime = getTimeFromEvent(e);
      onSeek(Math.max(0, Math.min(duration, newTime)));
    },
    [duration, onSeek, getTimeFromEvent, dragging]
  );

  const handleBarDrag = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (dragging) return;
      if (e.buttons !== 1 || !barRef.current || duration === 0) return;
      handleClick(e);
    },
    [duration, handleClick, dragging]
  );

  // Handle sync handle drag
  const handleSyncDragStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleSyncDragMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging) return;
      const time = getTimeFromEvent(e);
      onSyncStartChange(Math.max(0, Math.min(time, duration - 1)));
    },
    [dragging, getTimeFromEvent, onSyncStartChange, duration]
  );

  const handleSyncDragEnd = useCallback(() => {
    setDragging(false);
  }, []);

  // Document-level listeners for dragging
  React.useEffect(() => {
    if (dragging) {
      document.addEventListener('mousemove', handleSyncDragMove);
      document.addEventListener('mouseup', handleSyncDragEnd);
      return () => {
        document.removeEventListener('mousemove', handleSyncDragMove);
        document.removeEventListener('mouseup', handleSyncDragEnd);
      };
    }
  }, [dragging, handleSyncDragMove, handleSyncDragEnd]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const syncStartPercent = duration > 0 ? (syncStartTime / duration) * 100 : 0;

  // Only show sync start handle if there's an intro to skip
  const showSyncStartHandle = syncStartTime > 0.5 || musicStartTime > 0.5;
  
  return (
    <div className="playback-bar-container">
      <span className="time-display current">{formatTime(currentTime)}</span>

      <div
        ref={barRef}
        className={`playback-bar ${dragging ? 'dragging' : ''}`}
        onClick={handleClick}
        onMouseMove={handleBarDrag}
        role="slider"
        aria-label="Playback position"
        aria-valuenow={currentTime}
        aria-valuemin={0}
        aria-valuemax={duration}
        tabIndex={0}
      >
        {/* Track background */}
        <div className="playback-track">
          {/* Dimmed region before sync start (rubato intro) */}
          {syncStartPercent > 0 && (
            <div
              className="pre-sync-region"
              style={{ left: '0%', width: `${syncStartPercent}%` }}
            />
          )}

          {/* Sync start handle - simple draggable line */}
          {showSyncStartHandle && (
            <div
              className={`sync-handle ${dragging ? 'dragging' : ''}`}
              style={{ left: `${syncStartPercent}%` }}
              onMouseDown={handleSyncDragStart}
              title={`Beat sync starts at ${formatTime(syncStartTime)} — drag to adjust`}
            />
          )}

          {/* Progress fill */}
          <div
            className={`playback-progress ${isInSyncRegion ? '' : 'dimmed'}`}
            style={{ width: `${progressPercent}%` }}
          />

          {/* Playhead */}
          <div
            className="playhead"
            style={{ left: `${progressPercent}%` }}
          />
        </div>
      </div>

      <span className="time-display duration">{formatTime(duration)}</span>
    </div>
  );
};

export default PlaybackBar;
