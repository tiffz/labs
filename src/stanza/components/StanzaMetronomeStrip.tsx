import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import AppTooltip from '../../shared/components/AppTooltip';
import { MetronomeSplitControl } from '../../shared/audio/platform/metronome';
import type { MetronomePreferences } from '../../shared/audio/platform/metronome/preferences';
import { gridSubdivDurationSec } from '../../shared/audio/metronome/gridMetronomePlayback';
import {
  activeMetronomeRailSlotIndex,
  buildMetronomeMeasureLabels,
} from '../../shared/audio/metronome/metronomeRailLabels';
import type { TimeSignature } from '../../shared/rhythm/types';

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
  preferences: MetronomePreferences;
  onPreferencesChange: (next: MetronomePreferences) => void;
  timeSignature?: TimeSignature;
}

/**
 * Beat Finder–style metronome row: toggle on the **left** (timer icon only), beat counts when on,
 * or the word “Metronome” when off (or on without a usable tempo yet).
 * The settings chevron opens advanced options without toggling — no whole-strip click target.
 */
export default function StanzaMetronomeStrip({
  enabled,
  onToggle,
  bpm,
  anchorMediaTime,
  getMediaTime,
  isPlaying,
  needsCalibration = false,
  preferences,
  onPreferencesChange,
  timeSignature = { numerator: 4, denominator: 4 },
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

  const measureLabels = useMemo(
    () =>
      buildMetronomeMeasureLabels({
        timeSignature,
        subdivisionLevel: preferences.subdivisionLevel,
        voiceMode: preferences.voiceMode,
      }),
    [timeSignature, preferences.subdivisionLevel, preferences.voiceMode],
  );

  const showSubdivisions = preferences.subdivisionLevel !== 1;

  const activeSlotIndex = showBeats
    ? activeMetronomeRailSlotIndex({
        mediaTime: getMediaTime(),
        anchorMediaTime: anchorMediaTime as number,
        bpm: bpm as number,
        slotCount: measureLabels.length,
        slotDurationSec: gridSubdivDurationSec(bpm as number, timeSignature, preferences.subdivisionLevel),
      })
    : 0;

  const placeholderHint =
    enabled && needsCalibration ? 'Set BPM and Beat 1 below to start the click.' : undefined;

  return (
    <Box
      className={`stanza-metronome-strip${enabled ? ' stanza-metronome-strip--active' : ''}`}
      role="presentation"
    >
      <span className="stanza-metronome-split-host">
        <MetronomeSplitControl
          enabled={enabled}
          onToggle={onToggle}
          preferences={preferences}
          onPreferencesChange={onPreferencesChange}
          timeSignature={timeSignature}
          appearance="stanza"
          toggleClassName="stanza-metronome-strip-toggle stanza-metronome-toggle stanza-metronome-toggle--strip"
          toggleActiveClassName="active"
        />
      </span>
      {showBeats ? (
        <Box
          className={[
            'stanza-beat-visualizer',
            'stanza-beat-visualizer--compact',
            showSubdivisions ? 'stanza-beat-visualizer--subdivisions' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-live="polite"
          aria-label="Metronome count"
        >
          <Box className="stanza-beat-counts">
            {measureLabels.map((entry) => (
              <Box
                key={entry.slotIndex}
                component="span"
                className={[
                  'stanza-beat-count',
                  activeSlotIndex === entry.slotIndex ? 'stanza-beat-count--active' : '',
                  entry.isAccent ? 'stanza-beat-count--downbeat' : '',
                  showSubdivisions && entry.isBeat ? 'stanza-beat-count--beat' : '',
                  showSubdivisions && !entry.isBeat ? 'stanza-beat-count--subdivision' : '',
                  entry.isSwingSilent ? 'stanza-beat-count--swing-silent' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {entry.label}
              </Box>
            ))}
          </Box>
        </Box>
      ) : (
        <AppTooltip title={placeholderHint}>
          <span className="stanza-metronome-strip-placeholder">
            {enabled && needsCalibration ? 'Set BPM below' : 'Metronome'}
          </span>
        </AppTooltip>
      )}
    </Box>
  );
}
