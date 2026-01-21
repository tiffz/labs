
import { describe, it, expect } from 'vitest';
import { parseRhythm } from './rhythmParser';

describe('rhythmParser edge cases', () => {

    // User Case:
    // D-__D-__S-______ |x3D-__K-__D-__S-__
    // D-__D-__S-______ |x3D-__K-__D-__S-__ 
    // Should produce 8 measures total.


    it('should pad incomplete measures before repeating', () => {
        const notation = 'D-T- |x4';
        const rhythm = parseRhythm(notation, { numerator: 4, denominator: 4 });

        expect(rhythm.measures.length).toBe(4);
        expect(rhythm.measures[0].notes.length).toBeGreaterThan(0);

        const dur = rhythm.measures[0].notes.reduce((s, n) => s + n.durationInSixteenths, 0);
        expect(dur).toBe(16);

        // Verify repeats
        const rep = rhythm.repeats?.find(r => r.type === 'measure' && r.sourceMeasure === 0);
        expect(rep).toBeDefined();
        if (rep && rep.type === 'measure') {
            expect(rep.repeatMeasures).toEqual([1, 2, 3]);
        }
    });

    it('should populate measureSourceMapping for repeats', () => {
        const rhythm = parseRhythm('D-T- |x3', { numerator: 4, denominator: 4 });

        expect(rhythm.measures.length).toBe(3);
        expect(rhythm.measureSourceMapping).toBeDefined();

        // M1 maps to M0
        expect(rhythm.measureSourceMapping?.[1]).toBe(0);
        // M2 maps to M0
        expect(rhythm.measureSourceMapping?.[2]).toBe(0);
        // M0 should not be in mapping (it is source)
        expect(rhythm.measureSourceMapping?.[0]).toBeUndefined();
    });
});

it('should only repeat the last measure if |xN follows multiple measures without newline', () => {
    // M1 | M2 |x3
    // Should be: M1 | M2 | M2 | M2 (Total 4 measures: M1 + 3*M2)
    // NOT: M1 | M2 | M1 | M2 | M1 | M2
    const notation = 'D-T-____D-T-____ D-K-____D-K-____|x3';
    const rhythm = parseRhythm(notation, { numerator: 4, denominator: 4 });

    expect(rhythm.measures.length).toBe(4);

    // M0: D-T-...
    expect(rhythm.measures[0].notes[0].sound).toBe('dum');
    // M1: D-K-... (The source of repeat)
    expect(rhythm.measures[1].notes[0].sound).toBe('dum');
    // M2: Repeat of M1
    expect(rhythm.measures[2].notes[0].sound).toBe('dum');
    // Check repeat mapping
    // M2 should map to M1
    expect(rhythm.measureSourceMapping?.[2]).toBe(1);
    // M3 should map to M1
    expect(rhythm.measureSourceMapping?.[3]).toBe(1);
    // M1 should NOT map to M0
    expect(rhythm.measureSourceMapping?.[1]).toBeUndefined();
});

it('should handle the exact complex multi-line repeat case from user', () => {
    const notation = `D-__D-__S-______ |x3
D-__K-__D-__S-__ D-__D-__S-______ |x3
D-__K-__D-__S-__`;

    const rhythm = parseRhythm(notation, { numerator: 4, denominator: 4 });

    // Line 1: M0 |x3 -> M0 (Source), M1, M2 (Repeats). Total 3.
    // Line 2: M3 (D-K...), M4 (D-D...), |x3 (Repeats M4).
    //         M4 is Source. M5, M6 are repeats.
    //         Total 3 for that block? Or is |x3 applied to "M3 M4"?
    //         Regex `([^|:]+?)\|x` captures content before |x.
    //         In line 2, content before |x3 is `D-__K-__D-__S-__ D-__D-__S-______`.
    //         That is 2 measures.
    //         So it repeats [M3 M4] 3 times total?
    //         M3 M4 (Source) -> M5 M6 (Copy1) -> M7 M8 (Copy2).
    //         Total 6 measures for Line 2?

    // Let's see what the user expects.
    // User Screenshot shows:
    // M1 (D-D-S)
    // M2 (%)
    // M3 (%)
    // -- End Line 1 -- (Total 3 measures)

    // M4 (D-K-D-S)
    // M5 (D-D-S)
    // M6 (D-D-S) <- This is unexpected if it's a repeat of M5? It should be %.
    // M7 (%) <- This is a repeat.
    // M8 (D-K-D-S)

    // If the parser captured BOTH M4 and M5 as the content for |x3:
    // Then it would produce: [M4 M5] [M4 M5] [M4 M5].
    // Pattern: A B | A B | A B.
    // M4=A, M5=B.
    // M6=A (D-K-D-S). M7=B (D-D-S).
    // User screenshot shows M6 is D-D-S (B).
    // This implies M6 is a copy of M5?
    // If M6 is B, where did A go?

    // Maybe the parser captured ONLY M5?
    // content = `D-__D-__S-______`.
    // preMatch = `D-__K-__D-__S-__`.
    // If so:
    // M4 (preMatch).
    // M5 (content) |x3 -> M5(Src), M6(Rep), M7(Rep).
    // M6 should be %. M7 should be %.
    // Why is M6 notes?

    // Verify structure first
    expect(rhythm.measures.length).toBeGreaterThan(5);
});
