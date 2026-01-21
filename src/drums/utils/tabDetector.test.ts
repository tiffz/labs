import { describe, it, expect } from 'vitest';
import { detectTabType, isTab } from './tabDetector';

describe('tabDetector', () => {
  describe('detectTabType', () => {
    it('detects drum tabs', () => {
      const drumTab = `
HH x-x-x-x-x-x-x-x-|
SD ----o-------o---|
BD o------oo-o-----|
      `;
      expect(detectTabType(drumTab)).toBe('drum');
    });

    it('detects guitar tabs', () => {
      const guitarTab = `
e|---0--------0--------|
B|---1--------1--------|
G|---2--------2--------|
D|---2--------2--------|
A|-0--------0----------|
E|---------------------|
      `;
      expect(detectTabType(guitarTab)).toBe('guitar');
    });

    it('returns unknown for plain text', () => {
      expect(detectTabType('Hello world')).toBe('unknown');
      expect(detectTabType('Just some random text')).toBe('unknown');
    });

    it('returns unknown for empty or short text', () => {
      expect(detectTabType('')).toBe('unknown');
      expect(detectTabType('Short')).toBe('unknown');
    });

    it('prioritizes drum tab detection over guitar', () => {
      // A tab that has both drum-like and guitar-like patterns
      // Drum should win because it has more specific markers
      const mixedTab = `
BD o-------o-------|
SD ----o-------o---|
e|---0--------0----|
B|---1--------1----|
      `;
      expect(detectTabType(mixedTab)).toBe('drum');
    });
  });

  describe('isTab', () => {
    it('returns true for drum tabs', () => {
      const drumTab = `
HH x-x-x-x-x-x-x-x-|
SD ----o-------o---|
BD o------oo-o-----|
      `;
      expect(isTab(drumTab)).toBe(true);
    });

    it('returns true for guitar tabs', () => {
      const guitarTab = `
e|---0--------0--------|
B|---1--------1--------|
G|---2--------2--------|
D|---2--------2--------|
A|-0--------0----------|
E|---------------------|
      `;
      expect(isTab(guitarTab)).toBe(true);
    });

    it('returns false for plain text', () => {
      expect(isTab('Hello world')).toBe(false);
      expect(isTab('')).toBe(false);
    });
  });
});
