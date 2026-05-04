import { useState, useCallback, useEffect } from 'react';
import { rhythmPlayer } from './rhythmPlayer';
import type { ParsedRhythm, PlaybackSettings } from './types';

interface UsePlaybackOptions {
  parsedRhythm: ParsedRhythm;
  bpm: number;
  metronomeEnabled: boolean;
  playbackSettings: PlaybackSettings;
  selectionRange?: { startTick: number; endTick: number } | null;
  metronomeResolution?: 'sixteenth' | 'beat';
}

/**
 * Custom hook for managing playback state and controls
 */
export function usePlayback({
  parsedRhythm,
  bpm,
  metronomeEnabled,
  playbackSettings,
  selectionRange,
  metronomeResolution,
}: UsePlaybackOptions) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentNote, setCurrentNote] = useState<{
    measureIndex: number;
    noteIndex: number;
    repeatIteration?: number;
    maxRepeats?: number;
  } | null>(null);
  const [currentMetronomeBeat, setCurrentMetronomeBeat] = useState<{
    measureIndex: number;
    positionInSixteenths: number;
    isDownbeat: boolean;
  } | null>(null);

  const handlePlay = useCallback(() => {
    if (!parsedRhythm.isValid || parsedRhythm.measures.length === 0) {
      return;
    }

    setIsPlaying(true);
    setCurrentNote(null);

    // Pass tick range if there's a selection to scope playback
    const tickRange = selectionRange ? { startTick: selectionRange.startTick, endTick: selectionRange.endTick } : undefined;

    const onNote = (measureIndex: number, noteIndex: number, repeatIteration?: number, maxRepeats?: number) => {
      setCurrentNote({ measureIndex, noteIndex, repeatIteration, maxRepeats });
    };
    const onEnd = () => {
      setIsPlaying(false);
      setCurrentNote(null);
      setCurrentMetronomeBeat(null);
    };
    const onMet = (measureIndex: number, positionInSixteenths: number, isDownbeat: boolean) => {
      setCurrentMetronomeBeat({ measureIndex, positionInSixteenths, isDownbeat });
    };

    if (metronomeResolution) {
      rhythmPlayer.play(
        parsedRhythm,
        bpm,
        onNote,
        onEnd,
        metronomeEnabled,
        onMet,
        playbackSettings,
        tickRange,
        metronomeResolution,
      );
      return;
    }
    rhythmPlayer.play(
      parsedRhythm,
      bpm,
      onNote,
      onEnd,
      metronomeEnabled,
      onMet,
      playbackSettings,
      tickRange,
    );
  }, [parsedRhythm, bpm, metronomeEnabled, playbackSettings, selectionRange, metronomeResolution]);

  const handleStop = useCallback(() => {
    rhythmPlayer.stop();
    setIsPlaying(false);
    setCurrentNote(null);
    setCurrentMetronomeBeat(null);
  }, []);

  const handleMetronomeToggle = useCallback((enabled: boolean) => {
    // Update the player's metronome state if currently playing
    rhythmPlayer.setMetronomeEnabled(enabled);
  }, []);

  // Update playback settings in real-time during playback
  useEffect(() => {
    if (isPlaying) {
      rhythmPlayer.setSettings(playbackSettings);
    }
  }, [isPlaying, playbackSettings]);

  // Live BPM (not URL-debounced): `setBpmAtMeasureBoundary` already applies at measure ends.
  useEffect(() => {
    if (isPlaying) {
      rhythmPlayer.setBpmAtMeasureBoundary(bpm);
    }
  }, [isPlaying, bpm]);

  return {
    isPlaying,
    currentNote,
    currentMetronomeBeat,
    handlePlay,
    handleStop,
    handleMetronomeToggle,
  };
}

