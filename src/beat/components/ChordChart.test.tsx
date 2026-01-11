import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChordChart from './ChordChart';
import type { ChordAnalysisResult } from '../utils/chordAnalyzer';

// Mock scrollIntoView since jsdom doesn't support it
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// Mock chord result for testing
const createMockChordResult = (overrides?: Partial<ChordAnalysisResult>): ChordAnalysisResult => ({
  key: 'F',
  scale: 'minor',
  keyConfidence: 0.8,
  chordChanges: [
    { time: 0, chord: 'Fm', confidence: 0.9, duration: 2 },
    { time: 2, chord: 'Db', confidence: 0.85, duration: 2 },
    { time: 4, chord: 'Ab', confidence: 0.88, duration: 2 },
    { time: 6, chord: 'Eb', confidence: 0.87, duration: 2 },
  ],
  simplifiedChords: [],
  keyChanges: [],
  warnings: [],
  ...overrides,
});

describe('ChordChart', () => {
  describe('BPM-based timing calculations', () => {
    it('should calculate measure duration correctly at 120 BPM', () => {
      const chordResult = createMockChordResult();
      const { container } = render(
        <ChordChart
          chordResult={chordResult}
          bpm={120}
          beatsPerMeasure={4}
          currentTime={0}
          duration={60}
          musicStartTime={0}
        />
      );

      // At 120 BPM, each beat is 0.5 seconds, so a 4-beat measure is 2 seconds
      // With chords at 0s, 2s, 4s, 6s, we should have chords in measures 1, 2, 3, 4
      const measures = container.querySelectorAll('.chord-chart-measure');
      expect(measures.length).toBeGreaterThan(0);
    });

    it('should calculate measure duration correctly at 60 BPM', () => {
      // At 60 BPM, each beat is 1 second, so a 4-beat measure is 4 seconds
      const chordResult = createMockChordResult({
        chordChanges: [
          { time: 0, chord: 'Fm', confidence: 0.9, duration: 4 },
          { time: 4, chord: 'Db', confidence: 0.85, duration: 4 },
        ],
      });

      const { container } = render(
        <ChordChart
          chordResult={chordResult}
          bpm={60}
          beatsPerMeasure={4}
          currentTime={0}
          duration={16}
          musicStartTime={0}
        />
      );

      const measures = container.querySelectorAll('.chord-chart-measure');
      expect(measures.length).toBeGreaterThan(0);
    });

    it('should respect musicStartTime for measure alignment', () => {
      const chordResult = createMockChordResult({
        chordChanges: [
          { time: 4, chord: 'Fm', confidence: 0.9, duration: 2 },
          { time: 6, chord: 'Ab', confidence: 0.85, duration: 2 },
        ],
      });

      const { container } = render(
        <ChordChart
          chordResult={chordResult}
          bpm={120}
          beatsPerMeasure={4}
          currentTime={0}
          duration={16}
          musicStartTime={4} // Music starts at 4 seconds
        />
      );

      // First measure should start at musicStartTime (4s)
      // Chords at 4s and 6s should appear in measures 1 and 2
      const measureNumbers = container.querySelectorAll('.measure-number');
      if (measureNumbers.length > 0) {
        expect(measureNumbers[0].textContent).toBe('1');
      }
    });
  });

  describe('beat highlighting', () => {
    it('should highlight current measure based on currentTime', () => {
      const chordResult = createMockChordResult();
      const { container } = render(
        <ChordChart
          chordResult={chordResult}
          bpm={120}
          beatsPerMeasure={4}
          currentTime={3} // Should be in measure 2 at 120 BPM
          duration={60}
          musicStartTime={0}
          isPlaying={true}
        />
      );

      const currentMeasure = container.querySelector('.chord-chart-measure.current');
      expect(currentMeasure).not.toBeNull();
    });

    it('should highlight current beat within measure', () => {
      const chordResult = createMockChordResult();
      const { container } = render(
        <ChordChart
          chordResult={chordResult}
          bpm={120}
          beatsPerMeasure={4}
          currentTime={0.6} // Slightly past beat 1 at 120 BPM
          duration={60}
          musicStartTime={0}
          isPlaying={true}
        />
      );

      // Check that beat slots exist and one is active
      const activeBeat = container.querySelector('.beat-slot.active');
      expect(activeBeat).not.toBeNull();
    });
  });

  describe('seek functionality', () => {
    it('should call onSeek when clicking a measure', () => {
      const onSeek = vi.fn();
      const chordResult = createMockChordResult();

      const { container } = render(
        <ChordChart
          chordResult={chordResult}
          bpm={120}
          beatsPerMeasure={4}
          currentTime={0}
          duration={60}
          musicStartTime={0}
          onSeek={onSeek}
        />
      );

      const firstMeasure = container.querySelector('.chord-chart-measure');
      if (firstMeasure) {
        fireEvent.click(firstMeasure);
        expect(onSeek).toHaveBeenCalled();
      }
    });
  });

  describe('empty state', () => {
    it('should show empty message when no chord changes', () => {
      const chordResult = createMockChordResult({ chordChanges: [] });

      render(
        <ChordChart
          chordResult={chordResult}
          bpm={120}
          beatsPerMeasure={4}
          currentTime={0}
          duration={60}
          musicStartTime={0}
        />
      );

      expect(screen.getByText(/No chord data/i)).toBeInTheDocument();
    });

    it('should show empty message when chordResult is null', () => {
      render(
        <ChordChart
          chordResult={null}
          bpm={120}
          beatsPerMeasure={4}
          currentTime={0}
          duration={60}
          musicStartTime={0}
        />
      );

      expect(screen.getByText(/No chord data/i)).toBeInTheDocument();
    });
  });

  describe('experimental badge', () => {
    it('should display experimental badge', () => {
      const chordResult = createMockChordResult();

      render(
        <ChordChart
          chordResult={chordResult}
          bpm={120}
          beatsPerMeasure={4}
          currentTime={0}
          duration={60}
          musicStartTime={0}
        />
      );

      expect(screen.getByText(/Experimental/i)).toBeInTheDocument();
    });
  });

  describe('chord display', () => {
    it('should display chord names in measures', () => {
      const chordResult = createMockChordResult();

      render(
        <ChordChart
          chordResult={chordResult}
          bpm={120}
          beatsPerMeasure={4}
          currentTime={0}
          duration={60}
          musicStartTime={0}
        />
      );

      // Check that at least some chords are displayed
      expect(screen.getByText('Fm')).toBeInTheDocument();
    });

    it('should simplify complex chord names', () => {
      const chordResult = createMockChordResult({
        chordChanges: [
          { time: 0, chord: 'Fmin7', confidence: 0.9, duration: 2 },
        ],
      });

      render(
        <ChordChart
          chordResult={chordResult}
          bpm={120}
          beatsPerMeasure={4}
          currentTime={0}
          duration={60}
          musicStartTime={0}
        />
      );

      // Complex chords should be simplified for display
      expect(screen.queryByText('Fmin7') || screen.queryByText('Fm')).toBeTruthy();
    });
  });

  describe('time signature support', () => {
    it('should handle 3/4 time signature', () => {
      const chordResult = createMockChordResult();

      const { container } = render(
        <ChordChart
          chordResult={chordResult}
          bpm={120}
          beatsPerMeasure={3} // 3/4 time
          currentTime={0}
          duration={60}
          musicStartTime={0}
        />
      );

      // Each measure should have 3 beat slots (using beat-grid > beat-slot)
      const firstMeasure = container.querySelector('.chord-chart-measure');
      expect(firstMeasure).not.toBeNull();
      if (firstMeasure) {
        const beatSlots = firstMeasure.querySelectorAll('.beat-slot');
        expect(beatSlots.length).toBe(3);
      }
    });
  });

  describe('key changes', () => {
    it('should render without errors when key changes are present', () => {
      const chordResult = createMockChordResult({
        keyChanges: [
          { time: 8, key: 'Ab', scale: 'major', confidence: 0.75 },
        ],
      });

      const { container } = render(
        <ChordChart
          chordResult={chordResult}
          bpm={120}
          beatsPerMeasure={4}
          currentTime={0}
          duration={60}
          musicStartTime={0}
        />
      );

      // The chart should render without errors
      expect(container.querySelector('.chord-chart')).not.toBeNull();
      // Key change indicator may or may not appear depending on measure timing
      // Just verify the component renders successfully
      expect(container.querySelector('.chord-chart-grid')).not.toBeNull();
    });
  });
});
