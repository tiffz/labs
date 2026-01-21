import { describe, it, expect } from 'vitest';
import {
  isGuitarTab,
  parseGuitarTab,
  DEFAULT_GUITAR_OPTIONS,
} from './guitarTabParser';

describe('guitarTabParser', () => {
  describe('isGuitarTab', () => {
    it('returns true for standard guitar tab format', () => {
      const tab = `
e|---0--------0--------|
B|---1--------1--------|
G|---2--------2--------|
D|---2--------2--------|
A|-0--------0----------|
E|---------------------|
      `;
      expect(isGuitarTab(tab)).toBe(true);
    });

    it('returns false for drum tab format', () => {
      const tab = `
HH x-x-x-x-x-x-x-x-|
SD ----o-------o---|
BD o------oo-o-----|
      `;
      expect(isGuitarTab(tab)).toBe(false);
    });

    it('returns false for plain text', () => {
      expect(isGuitarTab('Hello world')).toBe(false);
      expect(isGuitarTab('')).toBe(false);
      expect(isGuitarTab('Short')).toBe(false);
    });

    it('requires fret numbers to detect guitar tabs', () => {
      // No fret numbers - should not detect
      const noFrets = `
e|-----------------|
B|-----------------|
G|-----------------|
D|-----------------|
A|-----------------|
E|-----------------|
      `;
      expect(isGuitarTab(noFrets)).toBe(false);
    });

    it('detects guitar tabs with various fret numbers', () => {
      const tab = `
e|-0--3--5--7--12--|
B|-1--3--5--8--13--|
G|-0--4--5--9--12--|
D|-2--5--7--10-14--|
A|-3--5--7--10-15--|
E|-0--3--5--8--12--|
      `;
      expect(isGuitarTab(tab)).toBe(true);
    });
  });

  describe('parseGuitarTab - strumming extraction', () => {
    it('extracts strumming pattern from footer line', () => {
      const tab = `
e|---0--------0--------|
B|---1--------1--------|
G|---2--------2--------|
D|---2--------2--------|
A|-0--------0----------|
E|---------------------|
   d d      d d
      `;
      const result = parseGuitarTab(tab);
      expect(result.strummingSource).toBe('footer');
      expect(result.elementsFound).toContain('d');
    });

    it('extracts strumming with PM (palm mute)', () => {
      const tab = `
e|---0-PM-----0--------|
B|---1--------1--------|
G|---2--------2--------|
D|---2--------2--------|
A|-0--------0----------|
E|---------------------|
   d d PM   d d PM
      `;
      const result = parseGuitarTab(tab);
      expect(result.elementsFound).toContain('d');
      expect(result.elementsFound).toContain('PM');
    });

    it('extracts upstrokes', () => {
      const tab = `
e|---0------|
B|---1------|
G|---2------|
D|---2------|
A|-0--------|
E|----------|
   d u d u
      `;
      const result = parseGuitarTab(tab);
      expect(result.elementsFound).toContain('d');
      expect(result.elementsFound).toContain('u');
    });

    it('returns warning when no strumming pattern found', () => {
      const tab = `
e|---0--------0--------|
B|---1--------1--------|
G|---2--------2--------|
D|---2--------2--------|
A|-0--------0----------|
E|---------------------|
      `;
      const result = parseGuitarTab(tab);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.strummingSource).toBe('none');
    });
  });

  describe('parseGuitarTab - conversion', () => {
    it('converts downstrokes to D (Dum)', () => {
      const tab = `
e|---0---|
B|---1---|
G|---2---|
D|---2---|
A|-0-----|
E|-------|
   d d d d
      `;
      const result = parseGuitarTab(tab);
      expect(result.notation).toContain('D');
      expect(result.notation).not.toContain('K');
      expect(result.notation).not.toContain('T');
    });

    it('converts upstrokes to K (Ka) by default', () => {
      const tab = `
e|---0---|
B|---1---|
G|---2---|
D|---2---|
A|-0-----|
E|-------|
   u u u u
      `;
      const result = parseGuitarTab(tab, DEFAULT_GUITAR_OPTIONS);
      expect(result.notation).toContain('K');
    });

    it('converts upstrokes to T (Tek) when option set', () => {
      const tab = `
e|---0---|
B|---1---|
G|---2---|
D|---2---|
A|-0-----|
E|-------|
   u u u u
      `;
      const result = parseGuitarTab(tab, { ...DEFAULT_GUITAR_OPTIONS, upstrokeAsKa: false });
      expect(result.notation).toContain('T');
      expect(result.notation).not.toContain('K');
    });

    it('converts palm mutes to S (Slap)', () => {
      const tab = `
e|---0---|
B|---1---|
G|---2---|
D|---2---|
A|-0-----|
E|-------|
   d PM d PM
      `;
      const result = parseGuitarTab(tab);
      expect(result.notation).toContain('S');
      expect(result.notation).toContain('D');
    });

    it('respects includeDownstroke option', () => {
      const tab = `
e|---0---|
B|---1---|
G|---2---|
D|---2---|
A|-0-----|
E|-------|
   d d d d
      `;
      const result = parseGuitarTab(tab, { ...DEFAULT_GUITAR_OPTIONS, includeDownstroke: false });
      // With downstrokes disabled, should have no selected elements warning
      expect(result.warnings.some(w => w.includes('No selected'))).toBe(true);
    });

    it('respects includeUpstroke option', () => {
      const tab = `
e|---0---|
B|---1---|
G|---2---|
D|---2---|
A|-0-----|
E|-------|
   d u d u
      `;
      const result = parseGuitarTab(tab, { ...DEFAULT_GUITAR_OPTIONS, includeUpstroke: false });
      // Upstrokes should become rests
      expect(result.notation).toContain('D');
      // Should still work since downstrokes are present
      expect(result.notation.length).toBeGreaterThan(0);
    });

    it('respects includePalmMute option', () => {
      const tab = `
e|---0---|
B|---1---|
G|---2---|
D|---2---|
A|-0-----|
E|-------|
   d PM d PM
      `;
      const result = parseGuitarTab(tab, { ...DEFAULT_GUITAR_OPTIONS, includePalmMute: false });
      // Palm mutes should become rests, not S
      expect(result.notation).not.toContain('S');
    });
  });

  describe('parseGuitarTab - Sister Rosetta example', () => {
    it('parses the intro strumming pattern', () => {
      const tab = `
Am Am

e|---0--------0--------0----------0-0------|---0--------0---------0--------0-0------|
B|---1--------1--------1----------1-1------|---1--------1---------1--------1-1------|
G|---2-PM-----2-PM-----2-PM-------2-2-PM---|---2-PM-----2-PM------2-PM-----2-2-PM---|
D|---2--------2--------2----------2-2------|---2--------2---------2--------2-2------|
A|-0--------0--------0----------0----------|-0-0------0-0-------0-0------0-0-0------|
E|-----------------------------------------|----------------------------------------|
   d d PM   d d PM   d d PM   d u d PM       d d PM   d d PM    d d PM   d u d PM
      `;
      const result = parseGuitarTab(tab);
      expect(result.strummingSource).toBe('footer');
      expect(result.elementsFound).toContain('d');
      expect(result.elementsFound).toContain('PM');
      expect(result.elementsFound).toContain('u');
      expect(result.notation).toContain('D');
      expect(result.notation).toContain('S');
      expect(result.notation).toContain('K'); // upstroke as Ka
    });
  });

  describe('parseGuitarTab - measure grouping', () => {
    it('groups repeating measures', () => {
      const tab = `
e|---0---|---0---|
B|---1---|---1---|
G|---2---|---2---|
D|---2---|---2---|
A|-0-----|---0---|
E|-------|-------|
   d d d d|d d d d
      `;
      const result = parseGuitarTab(tab);
      expect(result.uniqueMeasures.length).toBeGreaterThan(0);
      expect(result.measureCount).toBeGreaterThanOrEqual(1);
    });

    it('creates simplified notation', () => {
      const tab = `
e|---0---|---0---|
B|---1---|---1---|
G|---2---|---2---|
D|---2---|---2---|
A|-0-----|---0---|
E|-------|-------|
   d d d d|d d d d
      `;
      const result = parseGuitarTab(tab);
      // Simplified should be shorter or equal to full notation
      expect(result.simplifiedNotation.length).toBeLessThanOrEqual(result.notation.length);
    });
  });
});
