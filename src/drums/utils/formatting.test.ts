import { describe, it, expect } from 'vitest';
import { formatRhythm } from './formatting';
import type { TimeSignature } from '../types';

const ts44: TimeSignature = { numerator: 4, denominator: 4 };
const ts68: TimeSignature = { numerator: 6, denominator: 8 };

describe('formatRhythm', () => {
  it('returns empty string for empty input', () => {
    expect(formatRhythm('', ts44)).toBe('');
  });

  it('inserts barlines at measure boundaries in 4/4', () => {
    // 16 sixteenths = 1 measure in 4/4
    const input = 'D-D-TKT-D---T-TKD-D-TKT-D---T-TK';
    // 34 chars = 2 measures (32) + 2 extra
    const result = formatRhythm(input, ts44);
    // Should have a barline after the first 16 sixteenths
    expect(result).toContain('|');
    // First 16 chars should be the first measure
    const parts = result.split('|');
    expect(parts[0].trim().replace(/\s/g, '').length).toBe(16);
  });

  it('does not add barline at the very end', () => {
    const input = 'D-D-TKT-D---T-TK'; // exactly 1 measure
    const result = formatRhythm(input, ts44);
    expect(result).toBe('D-D-TKT-D---T-TK');
  });

  it('adds spaces after barlines', () => {
    const input = 'D-D-TKT-D---T-TKD-D-TKT-D---T-TK';
    const result = formatRhythm(input, ts44);
    // Should have "| " or "|\n" after barline
    expect(result).toMatch(/\|[\s\n]/);
  });

  it('preserves repeat markers', () => {
    const input = 'D-D-TKT-D---T-TK|x3D-D-TKT-D---T-TK';
    const result = formatRhythm(input, ts44);
    expect(result).toContain('|x3');
  });

  it('adds space after repeat marker', () => {
    const input = 'D-D-TKT-D---T-TK|x3D-D-TKT-D---T-TK';
    const result = formatRhythm(input, ts44);
    // Should have space or newline after |x3
    expect(result).toMatch(/\|x3[\s\n]/);
  });

  it('preserves simile markers', () => {
    const input = 'D-D-TKT-D---T-TK%';
    const result = formatRhythm(input, ts44);
    expect(result).toContain('%');
  });

  it('adds line breaks at appropriate intervals', () => {
    // 4 measures in 4/4 = 64 sixteenths
    // With 4/4, measuresPerLine should be ~4
    const oneMeasure = 'D-D-TKT-D---T-TK';
    const input = oneMeasure.repeat(6); // 6 measures
    const result = formatRhythm(input, ts44);
    expect(result).toContain('\n');
  });

  it('handles 6/8 time signature', () => {
    // 12 sixteenths per measure in 6/8
    const input = 'D-T-K-D-T-K-D-T-K-D-T-K-';
    // 24 chars = exactly 2 measures
    const result = formatRhythm(input, ts68);
    expect(result).toContain('|');
    const parts = result.split('|');
    expect(parts[0].trim().replace(/\s/g, '').length).toBe(12);
  });

  it('handles existing barlines by re-inserting at correct positions', () => {
    const input = 'D-D-TKT-D---T-TK | D-D-TKT-D---T-TK';
    const result = formatRhythm(input, ts44);
    // Should still have barline but without the extra spaces around it
    expect(result).toContain('|');
    // Should parse the same way
  });

  it('handles section repeat markers', () => {
    const input = '|:D-D-TKT-D---T-TK:|';
    const result = formatRhythm(input, ts44);
    expect(result).toContain('|:');
    expect(result).toContain(':|');
  });

  it('formats a long piece with multiple repeats correctly', () => {
    const input = 'D-D-TKT-D---T-TKD-D-TKT-D---__TKD-D-TKT-D-TKT-TK|x3D-D-TKT-D---__TKD-S-TKD-D-TKS-TK|x2D-S-TKD-D-TKS-TK|x2D-D-D-D-TKTKTKTKD-S-TKD-D-TKS-TK|x2D-S-TKD-D-TKS-TK|x2D-T-TKD-D-TKTKTKD-T-TKD-D---____TKTKD-D-TKTKD-D-TKD-TKD-T-T-D-D-TKD-TKD-TKTKD-D-TKD-TKD-TKTKD---D-S-TKD-D-TKS-TK|x2D-S-TKD-D-TKS-TK|x2D-T-TKD-D-TKTKTK|x3D-T-TKD-T---TKTKD---';
    const result = formatRhythm(input, ts44);
    
    // Should have barlines
    expect(result).toContain('|');
    // Should have line breaks for readability
    expect(result).toContain('\n');
    // Should preserve all repeat markers
    expect(result).toContain('|x3');
    expect(result).toContain('|x2');
    // Should not lose any note characters
    const inputNotes = input.replace(/[|x\d%:\s]/g, '');
    const outputNotes = result.replace(/[|x\d%:\s\n]/g, '');
    expect(outputNotes).toBe(inputNotes);
  });

  it('does not change parsed rhythm after formatting', () => {
    // Two measures worth of notes
    const input = 'D-D-TKT-D---T-TKD-D-TKT-D---T-TK';
    const result = formatRhythm(input, ts44);
    // The note content should be identical (ignoring structure chars)
    const inputNotes = input.replace(/[|x\d%:\s\n]/g, '');
    const outputNotes = result.replace(/[|x\d%:\s\n]/g, '');
    expect(outputNotes).toBe(inputNotes);
  });
});
