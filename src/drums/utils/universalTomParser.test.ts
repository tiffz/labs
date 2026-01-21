import { describe, it, expect } from 'vitest';
import { parseUniversalTom, detectTimeSignature } from './universalTomParser';

describe('universalTomParser', () => {
    it('parses simple tokens correctly', () => {
        // aj = AX = D (Quarter) = D--- (4 ticks)
        expect(parseUniversalTom('aj')).toBe('D---');

        // al = BX = T (Quarter) = T--- (4 ticks)
        expect(parseUniversalTom('al')).toBe('T---');

        // qj = A4 = D (Whole) = 16 ticks
        expect(parseUniversalTom('qj')).toBe('D---------------');

        // rj = AZ = D (16th) = D (1 tick)
        expect(parseUniversalTom('rj')).toBe('D');
    });

    it('parses compounds correctly', () => {
        // ajda; = AZCZ = D(Z) K(Z) = D K (1 tick each, 16th notes)
        expect(parseUniversalTom('ajda;')).toBe('D K');

        // alda;dalda; = BZCZBZCZ = T(Z) K(Z) T(Z) K(Z)
        // T K T K (1 tick each) -> 4 ticks total (Quarter duration space)
        expect(parseUniversalTom('alda;dalda;')).toBe('T K T K');
    });

    it('parses user test cases correctly', () => {
        // Case 1: 1.4J  alda;dalda; aj  alda;dalda;  al [alda;dalda; ajssaj  alda;dalda;  al  :{
        // Expected: TKTK D--- TKTK T--- | TKTK D-D- TKTK T--- 
        // 16th grid: TKTK (4 ticks), D--- (4 ticks), TKTK (4 ticks), T--- (4 ticks) = 16 ticks (1 measure)
        // Wait, 4/4 = 16 ticks. Correct.

        const input = '1.4J  alda;dalda; aj  alda;dalda;  al [alda;dalda; ajssaj  alda;dalda;  al  :{';
        // Mock 4J handling? Parser strips digits+dot+J.

        const output = parseUniversalTom(input);
        // T(avg 0.5?) No, let's look at mapping.
        // alda;dalda; -> BZCZBZCZ -> T(1) K(1) T(1) K(1) = 4 ticks.
        // aj -> AX -> D(4) = 4 ticks. (D---)
        // [ -> | 
        // ajssaj -> AYAY -> D(2) D(2) = D- D- (4 ticks)

        // Expected string roughly: "T K T K D--- T K T K T--- T K T K D- D- T K T K T---"
        // (No barlines or repeats)

        const tokens = output.split(' ').filter(t => t);

        // Measure 1
        // T K T K
        expect(tokens.slice(0, 4).join('')).toBe('TKTK');
        // D---
        expect(tokens[4]).toBe('D---');
        // T K T K
        expect(tokens.slice(5, 9).join('')).toBe('TKTK');
        // T---
        expect(tokens[9]).toBe('T---');

        // Measure 2 continues directly
        // T K T K
        expect(tokens.slice(10, 14).join('')).toBe('TKTK');
        // D- D- (ajssaj)
        expect(tokens[14]).toBe('D-');
        expect(tokens[15]).toBe('D-');
    });

    it('detects time signature correctly', () => {
        // Updated logic: Num.DenomJ -> Num/Denom
        expect(detectTimeSignature('4.4J alda...')).toEqual({ numerator: 4, denominator: 4 });
        expect(detectTimeSignature('3.4J alda...')).toEqual({ numerator: 3, denominator: 4 });
        expect(detectTimeSignature('random text')).toBeNull();
        // Leading check
        expect(detectTimeSignature('   2.4J  ')).toEqual({ numerator: 2, denominator: 4 });
    });

    it('maps Halgh tokens to Slap (fallback)', () => {
        // ah (Quarter Halgh) -> Should be S---
        expect(parseUniversalTom('ah')).toContain('S---');
        // eh (Eighth Halgh) -> Should be S-
        expect(parseUniversalTom('eh')).toContain('S-');
        // rh (Sixteenth Halgh) -> Should be S
        expect(parseUniversalTom('rh')).toBe('S');
    });

    it('parses Dotted Eighth (N) correctly', () => {
        // aj.ssga; maps to ANCZ
        // A=D, N=3 ticks (Ddotted8th), C=K, Z=1 tick

        const result = parseUniversalTom('aj.ssga;');
        // Expected: D-- K
        expect(result).toContain('D-- K');
    });

    it('detects complex time signatures', () => {
        expect(detectTimeSignature('5.2J')).toEqual({ numerator: 5, denominator: 2 });
        expect(detectTimeSignature('3.4J')).toEqual({ numerator: 3, denominator: 4 });
        expect(detectTimeSignature('6.8J')).toEqual({ numerator: 6, denominator: 8 });
    });
});
