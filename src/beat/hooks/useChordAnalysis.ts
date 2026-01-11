/**
 * useChordAnalysis Hook
 *
 * Provides chord detection and key analysis functionality for the Beat Finder app.
 * Supports both:
 * - Traditional HPCP-based detection (Essentia.js)
 * - ML-based detection (Spotify Basic Pitch)
 */

import { useState, useCallback } from 'react';
import {
  analyzeChords,
  type ChordAnalysisResult,
  getChordChangeTimes,
} from '../utils/chordAnalyzer';
import {
  validateAnalysis,
  type AnalysisValidation,
} from '../utils/analysisValidator';
import {
  simplifyExistingChords,
  simplifyChordProgression,
  type ChordProgression,
} from '../utils/chordSimplifier';
import {
  detectPitches,
  type PitchDetectionResult,
} from '../utils/pitchDetector';

interface UseChordAnalysisReturn {
  /** Whether chord analysis is in progress */
  isAnalyzing: boolean;
  /** Chord analysis result (raw) */
  chordResult: ChordAnalysisResult | null;
  /** Simplified chord progression (lead sheet format) */
  chordProgression: ChordProgression | null;
  /** ML pitch detection result (if used) */
  pitchResult: PitchDetectionResult | null;
  /** Beat/chord alignment validation */
  validation: AnalysisValidation | null;
  /** Chord change times (for convenience) */
  chordChangeTimes: number[];
  /** Whether ML mode is enabled */
  useMLDetection: boolean;
  /** Toggle ML detection mode */
  setUseMLDetection: (enabled: boolean) => void;
  /** Run chord analysis on an audio buffer */
  analyzeChords: (audioBuffer: AudioBuffer, beatTimes?: number[]) => Promise<void>;
  /** Validate analysis against beat data */
  validateWithBeats: (beats: number[], bpm: number) => void;
  /** Reset all chord analysis state */
  reset: () => void;
}

export function useChordAnalysis(): UseChordAnalysisReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [chordResult, setChordResult] = useState<ChordAnalysisResult | null>(null);
  const [chordProgression, setChordProgression] = useState<ChordProgression | null>(null);
  const [pitchResult, setPitchResult] = useState<PitchDetectionResult | null>(null);
  const [validation, setValidation] = useState<AnalysisValidation | null>(null);
  const [chordChangeTimes, setChordChangeTimes] = useState<number[]>([]);
  const [useMLDetection, setUseMLDetection] = useState(false);

  const runChordAnalysis = useCallback(async (audioBuffer: AudioBuffer, beatTimes?: number[]) => {
    setIsAnalyzing(true);

    try {
      if (useMLDetection) {
        // ML-based detection using Basic Pitch
        const mlResult = await detectPitches(audioBuffer);
        setPitchResult(mlResult);
        
        // Convert to simplified chord progression
        const progression = simplifyChordProgression(mlResult, beatTimes);
        setChordProgression(progression);
        
        // Also create a ChordAnalysisResult for compatibility
        const result: ChordAnalysisResult = {
          chords: [],
          chordChanges: progression.chords.map(chord => ({
            time: chord.time,
            chord: chord.displayName,
            strength: chord.confidence,
          })),
          key: progression.key,
          scale: progression.mode,
          keyConfidence: progression.keyConfidence,
          keyChanges: [],
          warnings: [],
        };
        setChordResult(result);
        setChordChangeTimes(getChordChangeTimes(result.chordChanges));
      } else {
        // Traditional HPCP-based detection
        // Pass beat times for beat-aligned chord snapping
        const result = await analyzeChords(audioBuffer, beatTimes);
        setChordResult(result);
        setChordChangeTimes(getChordChangeTimes(result.chordChanges));
        
        // Also create simplified progression from HPCP result
        const progression = simplifyExistingChords(
          result.chordChanges,
          audioBuffer.duration,
          beatTimes
        );
        setChordProgression(progression);
      }
    } catch (error) {
      console.error('[useChordAnalysis] Chord analysis failed:', error);
      // Set a default result so we don't block other features
      setChordResult({
        chords: [],
        chordChanges: [],
        key: 'Unknown',
        scale: 'unknown',
        keyConfidence: 0,
        keyChanges: [],
        warnings: ['Chord analysis failed - ' + (error instanceof Error ? error.message : 'Unknown error')],
      });
      setChordProgression(null);
      setPitchResult(null);
      setChordChangeTimes([]);
    } finally {
      setIsAnalyzing(false);
    }
  }, [useMLDetection]);

  const validateWithBeats = useCallback(
    (beats: number[], bpm: number) => {
      if (!chordResult) {
        setValidation(null);
        return;
      }

      const validationResult = validateAnalysis(beats, chordResult.chordChanges, bpm);
      setValidation(validationResult);
    },
    [chordResult]
  );

  const reset = useCallback(() => {
    setIsAnalyzing(false);
    setChordResult(null);
    setChordProgression(null);
    setPitchResult(null);
    setValidation(null);
    setChordChangeTimes([]);
  }, []);

  return {
    isAnalyzing,
    chordResult,
    chordProgression,
    pitchResult,
    validation,
    chordChangeTimes,
    useMLDetection,
    setUseMLDetection,
    analyzeChords: runChordAnalysis,
    validateWithBeats,
    reset,
  };
}
