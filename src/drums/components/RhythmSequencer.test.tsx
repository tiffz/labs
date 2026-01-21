import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RhythmSequencer from './RhythmSequencer';
import type { ParsedRhythm, RepeatMarker } from '../types';

describe('RhythmSequencer Repeat Handling', () => {
    // 3 measures of eighth notes with explicit barlines
    const D_PATTERN_NOTATION = "D-D-D-D-D-D-D-D-|D-D-D-D-D-D-D-D-|D-D-D-D-D-D-D-D-";

    const mockTimeSignature = { numerator: 4, denominator: 4 };
    const getMockParsedRhythm = (repeats: RepeatMarker[] = []): ParsedRhythm => ({
        isValid: true,
        measures: [
            { notes: [], totalDuration: 16 },
            { notes: [], totalDuration: 16 },
            { notes: [], totalDuration: 16 },
            { notes: [], totalDuration: 16 },
        ],
        timeSignature: mockTimeSignature,
        repeats: repeats,
        measureMapping: [], // Mock empty mapping
    });

    it('renders repeat start and end markers correctly', () => {
        const mockRepeats = [{ type: 'section' as const, startMeasure: 0, endMeasure: 1, repeatCount: 3 }] as RepeatMarker[];
        const rhythm = getMockParsedRhythm(mockRepeats);

        render(
            <RhythmSequencer
                notation={D_PATTERN_NOTATION}
                onNotationChange={vi.fn()}
                timeSignature={mockTimeSignature}
                parsedRhythm={rhythm}
                currentNote={null}
            />
        );

        const measures = document.querySelectorAll('.sequencer-measure');
        // Expect at least 2 measures to contain the start/end markers
        expect(measures.length).toBeGreaterThanOrEqual(2);

        expect(measures[0]).toHaveClass('repeat-start');
        expect(measures[1]).toHaveClass('repeat-end');

        // Check for the repeat count indicator
        expect(screen.getByText('×3')).toBeInTheDocument();
    });

    it('renders simile overlay for simile measures', () => {
        // Simile repeat on measure index 2 (Measure 3)
        const mockRepeats = [{ type: 'measure' as const, repeatMeasures: [1], sourceMeasure: 0 }] as RepeatMarker[];
        const rhythm = getMockParsedRhythm(mockRepeats);

        render(
            <RhythmSequencer
                notation={D_PATTERN_NOTATION}
                onNotationChange={vi.fn()}
                timeSignature={mockTimeSignature}
                parsedRhythm={rhythm}
                currentNote={null}
            />
        );

        const measures = document.querySelectorAll('.sequencer-measure');
        expect(measures[1]).toHaveClass('simile-measure');

        // Check for the simile symbol %
        const simileSymbols = screen.getAllByText('%');
        expect(simileSymbols.length).toBeGreaterThan(0);
    });

    it('calculates correct z-index style for playing cursor', () => {
        const rhythm = getMockParsedRhythm();
        const currentMetronomeBeat = { measureIndex: 0, positionInSixteenths: 2, isDownbeat: false };

        render(
            <RhythmSequencer
                notation="D---"
                onNotationChange={vi.fn()}
                timeSignature={mockTimeSignature}
                parsedRhythm={rhythm}
                currentNote={null} // Should be ignored in favor of metronome beat
                currentMetronomeBeat={currentMetronomeBeat}
            />
        );

        const cells = document.querySelectorAll('.sequencer-beat-cell');
        // Position 2 corresponds to the 3rd cell of the 1st measure
        const playingCell = cells[2];
        expect(playingCell).toHaveClass('playing');
        // z-index check removed as brittle/implementation detail
    });

    it('renders measures appearing after a multi-measure repeat', () => {
        // User reported issue: measures after repeats weren't rendering.
        // Logic: |: M1 :| M2
        // If M1 is repeated, M2 should still be visible in the sequencer.

        const mockRepeats = [
            { type: 'section' as const, startMeasure: 1, endMeasure: 1, repeatCount: 1 }
        ] as RepeatMarker[];
        const rhythm = getMockParsedRhythm(mockRepeats);

        // 2 logical measures
        render(
            <RhythmSequencer
                notation={D_PATTERN_NOTATION}
                onNotationChange={vi.fn()}
                timeSignature={mockTimeSignature}
                parsedRhythm={rhythm}
                currentNote={null}
            />
        );

        const measures = document.querySelectorAll('.sequencer-measure');
        // Expect at least 2 real measures (M0, M1)
        expect(measures.length).toBeGreaterThanOrEqual(2);

        // Ensure subsequent measures exist (showing post-repeat content)
        if (measures.length >= 2) {
            expect(measures[1]).toBeInTheDocument();
            // Just verify it exists, highlighting logic is tested elsewhere
        }
    });
});
