import { describe, it, expect } from 'vitest';
import { parseUniversalTom, detectTimeSignature } from './universalTomParser';

describe('universalTomParser', () => {
    it('parses simple tokens correctly', () => {
        // aj = AX = D (Quarter) = D--- (4 ticks)
        // Grouping: Ends at 4 ticks -> Space added.
        expect(parseUniversalTom('aj')).toBe('D---');

        // al = BX = T (Quarter) = T--- (4 ticks)
        expect(parseUniversalTom('al')).toBe('T---');

        // qj = A4 = D (Whole) = 16 ticks
        // 4 beats. Space after each?
        // Logic: accumulatedTicks += 16. 
        // 16 % 4 === 0. Adds ONE space at end.
        expect(parseUniversalTom('qj')).toBe('D---------------');
    });

    it('parses compounds with beat grouping', () => {
        // alda;dalda; = T(1) K(1) T(1) K(1)
        // 1: T (acc 1)
        // 2: K (acc 2)
        // 3: T (acc 3)
        // 4: K (acc 4) -> Space
        // Result: "TKTK"
        expect(parseUniversalTom('alda;dalda;')).toBe('TKTK');

        // ajda; = D(1) K(1) = 2 ticks. No space at end because not divisible by 4?
        // Wait, loop finishes. trim() removes trailing space.
        // If 2 ticks, 2 % 4 != 0. No space added.
        expect(parseUniversalTom('ajda;')).toBe('DK');
    });

    it('parses user test cases with clean formatting', () => {
        // Case 1: 4J  alda;dalda; aj  alda;dalda;  al ...
        // alda;dalda; -> "TKTK" (4 ticks)
        // aj -> "D---" (4 ticks)
        // alda;dalda; -> "TKTK"
        // al -> "T---"
        // Result: "TKTK D--- TKTK T---"

        const input = '4J  alda;dalda; aj  alda;dalda;  al';
        const output = parseUniversalTom(input);

        expect(output).toBe('TKTK D--- TKTK T---');
    });

    it('detects time signature correctly', () => {
        // DigitsJ
        expect(detectTimeSignature('4J alda...')).toEqual({ numerator: 4, denominator: 4 });
        expect(detectTimeSignature('3J alda...')).toEqual({ numerator: 3, denominator: 4 });
        expect(detectTimeSignature('2J alda...')).toEqual({ numerator: 2, denominator: 4 });

        // Invalid
        expect(detectTimeSignature('random text')).toBeNull();
    });

    it('maps Halgh tokens to Slap with grouping', () => {
        // ah (Quarter Halgh) -> S---
        expect(parseUniversalTom('ah')).toBe('S---');
        // rh (16th Halgh) -> S (1 tick)
        expect(parseUniversalTom('rh')).toBe('S');
    });

    it('parses Dotted Eighth (N) correctly', () => {
        // aj.ssga; maps to ANCZ -> D(4?? No AX is D---)
        // aj.ssga; -> ANCZ
        // A(D), N(3 ticks), C(K), Z(1 tick)
        // D-- (3 ticks)
        // K (1 tick) -> Total 4 ticks -> Space
        // Result: "D--K"

        // Check universalTomParser.ts DURATION_MAP
        // 'N': 3
        // decodeValue('AN') -> "D--" (3 chars)
        // decodeValue('CZ') -> "K" (1 char)
        expect(parseUniversalTom('aj.ssga;')).toBe('D--K');
    });

    it('detects complex time signatures', () => {
        expect(detectTimeSignature('5J')).toEqual({ numerator: 5, denominator: 4 });
        expect(detectTimeSignature('3J')).toEqual({ numerator: 3, denominator: 4 });
        expect(detectTimeSignature('6J')).toEqual({ numerator: 6, denominator: 4 });
    });
});

it('should ignore line numbers prefix (e.g. 1. 4J)', () => {
    // User reported issue: "1.4J ..." causes extra notes. 
    // "1." should be ignored. "4J" is time sig.
    const input = `1.4J aj`;
    // Expect: "4J" detected as Time Sig (handled by detectTimeSignature, removed by parser).
    // "aj" -> "A-" -> "D---" (4 ticks, since X=4).

    const result = parseUniversalTom(input);
    expect(result).toBe('D---');
});
