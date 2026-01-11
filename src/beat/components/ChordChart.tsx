/**
 * ChordChart Component (EXPERIMENTAL)
 *
 * Displays detected chords in a chord chart format showing
 * chords relative to measures, similar to a guitar chord chart.
 * Highlights current measure/beat during playback.
 * 
 * This feature is experimental and only available in development mode.
 */

import React, { useMemo, useRef, useEffect } from 'react';
import type { ChordAnalysisResult, ChordEvent, KeyChange } from '../utils/chordAnalyzer';
import type { Section } from '../utils/sectionDetector';

interface ChordChartProps {
  /** Chord analysis result */
  chordResult: ChordAnalysisResult | null;
  /** BPM for calculating beat positions (uses mathematical grid like metronome) */
  bpm: number;
  /** Beats per measure (time signature numerator) */
  beatsPerMeasure: number;
  /** Current playback time */
  currentTime: number;
  /** Total duration */
  duration: number;
  /** Click handler for seeking to a measure */
  onSeek?: (time: number) => void;
  /** Whether playback is active */
  isPlaying?: boolean;
  /** Sections for alignment */
  sections?: Section[];
  /** Time when music actually starts (sync start) */
  musicStartTime?: number;
}

interface MeasureData {
  measureNumber: number;
  startTime: number;
  endTime: number;
  chords: ChordEvent[];
  /** Which beat each chord starts on (1-based) within the measure */
  chordBeats: number[];
  /** Key change in this measure (if any) */
  keyChange?: KeyChange;
  /** Section label if this is the start of a section */
  sectionLabel?: string;
  /** Section ID this measure belongs to (for highlighting) */
  sectionId?: string;
}

/**
 * Parse measure range from section label (e.g., "M15-22" -> { start: 15, end: 22 })
 */
function parseMeasureRange(label: string): { start: number; end: number } | null {
  const match = label.match(/^M(\d+)(?:-(\d+))?$/);
  if (!match) return null;
  const start = parseInt(match[1], 10);
  const end = match[2] ? parseInt(match[2], 10) : start;
  return { start, end };
}

/**
 * Group chords by measure using BPM-based mathematical beat grid.
 * This matches the metronome timing exactly for proper sync.
 * Uses section labels (e.g., "M15-22") to properly align sections with measures.
 */
function groupChordsByMeasure(
  chordChanges: ChordEvent[],
  bpm: number,
  beatsPerMeasure: number,
  duration: number,
  keyChanges?: KeyChange[],
  sections?: Section[],
  musicStartTime: number = 0
): MeasureData[] {
  const measures: MeasureData[] = [];

  if (bpm <= 0) {
    // No BPM - show all chords without measure structure
    if (chordChanges.length > 0) {
      measures.push({
        measureNumber: 1,
        startTime: 0,
        endTime: duration,
        chords: chordChanges.slice(0, 8), // Limit for display
        chordBeats: chordChanges.slice(0, 8).map(() => 1),
      });
    }
    return measures;
  }

  // Calculate beat duration from BPM (same as metronome)
  const beatDuration = 60 / bpm;
  const measureDuration = beatDuration * beatsPerMeasure;

  // Build a map of measure number -> section info from section labels
  // This ensures chord chart measures align with section labels
  const measureToSection = new Map<number, { id: string; label: string; isStart: boolean }>();
  if (sections) {
    for (const section of sections) {
      const range = parseMeasureRange(section.label);
      if (range) {
        for (let m = range.start; m <= range.end; m++) {
          measureToSection.set(m, {
            id: section.id,
            label: section.label,
            isStart: m === range.start,
          });
        }
      }
    }
  }

  // Generate measures from music start time to end using BPM-based timing
  let measureNum = 1;
  let measureStart = musicStartTime;

  while (measureStart < duration) {
    const measureEnd = Math.min(measureStart + measureDuration, duration);

    // Find chords in this measure
    const measureChords: ChordEvent[] = [];
    const chordBeats: number[] = [];

    for (const chord of chordChanges) {
      if (chord.time >= measureStart && chord.time < measureEnd) {
        measureChords.push(chord);
        
        // Calculate which beat this chord falls on (1-based) using BPM math
        const timeInMeasure = chord.time - measureStart;
        const beat = Math.floor(timeInMeasure / beatDuration) + 1;
        chordBeats.push(Math.min(beat, beatsPerMeasure)); // Clamp to valid beat
      }
    }

    // Find key change in this measure
    const keyChange = keyChanges?.find(
      kc => kc.time >= measureStart && kc.time < measureEnd
    );

    // Use section mapping from labels to properly align sections
    const sectionInfo = measureToSection.get(measureNum);

    measures.push({
      measureNumber: measureNum,
      startTime: measureStart,
      endTime: measureEnd,
      chords: measureChords,
      chordBeats,
      keyChange,
      sectionLabel: sectionInfo?.isStart ? sectionInfo.label : undefined,
      sectionId: sectionInfo?.id,
    });

    measureNum++;
    measureStart = measureEnd;
  }

  return measures;
}

/**
 * Get the current beat position within measures using BPM-based math.
 * This matches the metronome timing exactly.
 */
function getCurrentBeatInMeasure(
  currentTime: number,
  bpm: number,
  beatsPerMeasure: number,
  musicStartTime: number
): { measureIndex: number; beat: number } {
  if (bpm <= 0 || currentTime < musicStartTime) {
    return { measureIndex: 0, beat: 1 };
  }

  const beatDuration = 60 / bpm;
  const timeFromStart = currentTime - musicStartTime;
  
  // Calculate which beat we're on (0-indexed from music start)
  const totalBeats = Math.floor(timeFromStart / beatDuration);
  
  const measureIndex = Math.floor(totalBeats / beatsPerMeasure);
  const beat = (totalBeats % beatsPerMeasure) + 1;

  return { measureIndex, beat };
}

/**
 * Simplify chord name for display
 */
function simplifyChordName(chord: string): string {
  // Remove extensions and keep just the core chord
  return chord
    .replace(/maj7|maj9|maj13/g, 'M7')
    .replace(/m7b5/g, 'ø')
    .replace(/dim7?/g, '°')
    .replace(/aug/g, '+')
    .replace(/sus4/g, 'sus')
    .replace(/add9/g, '')
    .replace(/\(no3rd\)/g, '');
}

const ChordChart: React.FC<ChordChartProps> = ({
  chordResult,
  bpm,
  beatsPerMeasure,
  currentTime,
  duration,
  onSeek,
  isPlaying = false,
  sections,
  musicStartTime = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const measures = useMemo(() => {
    if (!chordResult) return [];
    return groupChordsByMeasure(
      chordResult.chordChanges,
      bpm,
      beatsPerMeasure,
      duration,
      chordResult.keyChanges,
      sections,
      musicStartTime
    );
  }, [chordResult, bpm, beatsPerMeasure, duration, sections, musicStartTime]);

  const { measureIndex: currentMeasureIndex, beat: currentBeat } = useMemo(() => {
    return getCurrentBeatInMeasure(currentTime, bpm, beatsPerMeasure, musicStartTime);
  }, [currentTime, bpm, beatsPerMeasure, musicStartTime]);

  // Auto-scroll to current measure during playback
  useEffect(() => {
    if (isPlaying && containerRef.current) {
      const currentMeasureEl = containerRef.current.querySelector('.chord-chart-measure.current');
      if (currentMeasureEl) {
        currentMeasureEl.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [currentMeasureIndex, isPlaying]);

  // Map section IDs to color indices for visual distinction
  const sectionColorMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!sections) return map;
    sections.forEach((section, index) => {
      map.set(section.id, index % 5); // 5 different colors
    });
    return map;
  }, [sections]);

  if (!chordResult || chordResult.chordChanges.length === 0) {
    return (
      <div className="chord-chart chord-chart-empty">
        <span className="material-symbols-outlined">music_note</span>
        <span>No chord data available</span>
      </div>
    );
  }

  // Group measures into rows of 8 for display (more dense)
  const measuresPerRow = 8;
  const rows: MeasureData[][] = [];
  for (let i = 0; i < measures.length; i += measuresPerRow) {
    rows.push(measures.slice(i, i + measuresPerRow));
  }

  // Handle click - seek to start of measure (add small offset to ensure we're in the measure)
  const handleMeasureClick = (measureStartTime: number) => {
    // Add tiny offset (10ms) to ensure we're in the measure, not at the boundary
    onSeek?.(measureStartTime + 0.01);
  };

  return (
    <div className="chord-chart" ref={containerRef}>
      {/* Experimental badge */}
      <div className="chord-chart-experimental">
        <span className="material-symbols-outlined">science</span>
        <span>Experimental Feature</span>
      </div>

      {/* Disclaimer - ABOVE the chart */}
      <div className="chord-chart-disclaimer">
        <span className="material-symbols-outlined">info</span>
        <span>
          These chords are automatically detected and may not be accurate. 
          Verify against sheet music before practicing.
        </span>
      </div>

      {/* Chord chart grid */}
      <div className="chord-chart-grid">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="chord-chart-row">
            {row.map((measure, measureIdx) => {
              const isCurrent = measure.measureNumber === currentMeasureIndex + 1;
              // Check if this measure is in the same section as the previous one
              const prevMeasure = measureIdx > 0 ? row[measureIdx - 1] : (rowIndex > 0 ? rows[rowIndex - 1]?.[rows[rowIndex - 1].length - 1] : null);
              const isNewSection = measure.sectionId && (!prevMeasure || prevMeasure.sectionId !== measure.sectionId);
              const sectionColorIndex = measure.sectionId ? sectionColorMap.get(measure.sectionId) ?? 0 : 0;
              
              return (
                <div
                  key={measure.measureNumber}
                  className={`chord-chart-measure ${isCurrent ? 'current' : ''} ${measure.sectionId ? `in-section section-color-${sectionColorIndex}` : ''} ${isNewSection ? 'section-start' : ''}`}
                  data-section={measure.sectionId}
                  onClick={() => handleMeasureClick(measure.startTime)}
                  title={`Click to seek to measure ${measure.measureNumber}${measure.sectionLabel ? ` (${measure.sectionLabel})` : ''}`}
                >
                  {/* Section label if this is start of a section */}
                  {measure.sectionLabel && (
                    <div className="measure-section-label">
                      {measure.sectionLabel}
                    </div>
                  )}
                  
                  {/* Key change indicator */}
                  {measure.keyChange && (
                    <div className="measure-key-change">
                      <span className="material-symbols-outlined">change_circle</span>
                      <span>{measure.keyChange.key}{measure.keyChange.scale === 'minor' ? 'm' : ''}</span>
                    </div>
                  )}
                  
                  {/* Measure header with number */}
                  <div className="measure-header">
                    <span className="measure-number">{measure.measureNumber}</span>
                    {measure.chords.length > 0 && measure.chordBeats[0] !== 1 && (
                      <span className="beat-indicator">beat {measure.chordBeats[0]}</span>
                    )}
                  </div>

                  {/* Chord display */}
                  <div className="measure-content">
                    {/* Chords - show above beat grid */}
                    <div className="measure-chords">
                      {measure.chords.length > 0 ? (
                        measure.chords.map((chord, idx) => (
                          <span
                            key={idx}
                            className={`chord-name ${isCurrent && measure.chordBeats[idx] === currentBeat ? 'active' : ''}`}
                            style={{ gridColumn: measure.chordBeats[idx] }}
                          >
                            {simplifyChordName(chord.chord)}
                          </span>
                        ))
                      ) : (
                        <span className="chord-name empty">—</span>
                      )}
                    </div>
                    
                    {/* Beat grid - visual beat indicator */}
                    <div className="beat-grid">
                      {Array.from({ length: beatsPerMeasure }).map((_, beatIdx) => (
                        <div
                          key={beatIdx}
                          className={`beat-slot ${isCurrent && beatIdx + 1 === currentBeat ? 'active' : ''}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChordChart;
