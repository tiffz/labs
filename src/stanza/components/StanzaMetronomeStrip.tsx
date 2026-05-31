import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import Box from '@mui/material/Box';
import AppTooltip from '../../shared/components/AppTooltip';
import MetronomeToggleButton from '../../shared/components/MetronomeToggleButton';

const BEATS = 4;

export interface StanzaMetronomeStripProps {
  enabled: boolean;
  onToggle: () => void;
  /** When set, beat indicators reflect transport phase. */
  bpm: number | undefined;
  anchorMediaTime: number | undefined;
  getMediaTime: () => number;
  isPlaying: boolean;
  /**
   * True when the metronome is enabled but no usable BPM/anchor has been calibrated yet.
   * Shows a short "set BPM" hint inline with the placeholder so we don't need a separate Alert row.
   */
  needsCalibration?: boolean;
}

/**
 * Beat Finder–style metronome row: toggle on the **left**, beat counts when on (4/4),
 * or the word “Metronome” when off (or on without a usable tempo yet).
 * Clicking the strip background (outside the icon button) also toggles metronome.
 */
export default function StanzaMetronomeStrip({
  enabled,
  onToggle,
  bpm,
  anchorMediaTime,
  getMediaTime,
  isPlaying,
  needsCalibration = false,
}: StanzaMetronomeStripProps) {
  const [, setRafTick] = useState(0);

  useEffect(() => {
    if (!enabled || !isPlaying || !bpm || bpm <= 0 || anchorMediaTime == null || !Number.isFinite(anchorMediaTime)) {
      return;
    }
    let raf = 0;
    const tick = () => {
      setRafTick((n) => (n + 1) % 10000);
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [enabled, isPlaying, bpm, anchorMediaTime]);

  const showBeats = Boolean(enabled && bpm && bpm > 0 && anchorMediaTime != null && Number.isFinite(anchorMediaTime));

  let currentBeat = 0;
  if (showBeats) {
    const period = 60 / (bpm as number);
    const t = getMediaTime();
    const beat = Math.floor((t - (anchorMediaTime as number)) / period + 1e-9);
    currentBeat = ((beat % BEATS) + BEATS) % BEATS;
  }

  const handleStripClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('button')) return;
    onToggle();
  };

  return (
    <Box
      className={`stanza-metronome-strip stanza-metronome-strip--clickable${enabled ? ' stanza-metronome-strip--active' : ''}`}
      onClick={handleStripClick}
      role="presentation"
    >
      <AppTooltip
        title={
          enabled
            ? needsCalibration
              ? 'Metronome on. Set BPM and Beat 1 below to start the click. Click this row to turn off.'
              : 'Metronome on. Click this row to turn off.'
            : 'Metronome off. Click this row to turn on.'
        }
      >
        <MetronomeToggleButton
          enabled={enabled}
          onToggle={onToggle}
          className="stanza-metronome-strip-toggle stanza-metronome-toggle stanza-metronome-toggle--strip"
          includeNativeTitle={false}
          includeDataTooltip={false}
          ariaLabel="Toggle metronome"
        />
      </AppTooltip>
      {showBeats ? (
        <Box className="stanza-beat-visualizer stanza-beat-visualizer--compact" aria-live="polite">
          <Box className="stanza-beat-counts">
            {Array.from({ length: BEATS }, (_, i) => (
              <Box
                key={i}
                className={`stanza-beat-count${currentBeat === i ? ' stanza-beat-count--active' : ''}${
                  i === 0 ? ' stanza-beat-count--downbeat' : ''
                }`}
              >
                {i + 1}
              </Box>
            ))}
          </Box>
        </Box>
      ) : (
        <span className="stanza-metronome-strip-placeholder">
          {enabled && needsCalibration ? 'Metronome. set BPM below ↓' : 'Metronome'}
        </span>
      )}
    </Box>
  );
}
