/**
 * Tests for Kimberly System core utilities
 */

import { describe, it, expect, vi } from 'vitest';
import { pick, pickGenerator, pickWeightedGenerator, capitalize, article } from './core';

describe('pick', () => {
  it('picks an item from an array', () => {
    const items = ['a', 'b', 'c'];
    const result = pick(items);
    expect(items).toContain(result);
  });

  it('throws error for empty array', () => {
    expect(() => pick([])).toThrow('Cannot pick from empty array');
  });

  it('uses weighted selection when weights provided', () => {
    // Mock Math.random to return 0.5
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    
    const items = ['a', 'b', 'c'];
    const weights = [1, 98, 1]; // 'b' should be heavily weighted
    const result = pick(items, weights);
    
    expect(result).toBe('b');
    vi.restoreAllMocks();
  });

  it('throws error if weights length does not match items length', () => {
    expect(() => pick(['a', 'b'], [1])).toThrow('Weights array must match items array length');
  });
});

describe('pickGenerator', () => {
  it('picks and executes a generator function', () => {
    const gen1 = () => 'result1';
    const gen2 = () => 'result2';
    const generators = [gen1, gen2];
    
    const result = pickGenerator(generators);
    expect(['result1', 'result2']).toContain(result);
  });
});

describe('pickWeightedGenerator', () => {
  it('picks and executes a weighted generator', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01);
    
    const generators = [
      { fn: () => 'result1', weight: 99 },
      { fn: () => 'result2', weight: 1 }
    ];
    
    const result = pickWeightedGenerator(generators);
    expect(result).toBe('result1');
    
    vi.restoreAllMocks();
  });
});

describe('capitalize', () => {
  it('capitalizes first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
    expect(capitalize('world')).toBe('World');
  });

  it('handles already capitalized strings', () => {
    expect(capitalize('Hello')).toBe('Hello');
  });

  it('handles single character', () => {
    expect(capitalize('a')).toBe('A');
  });

  it('handles empty string', () => {
    expect(capitalize('')).toBe('');
  });
});

describe('article', () => {
  it('returns "an" for vowel sounds', () => {
    expect(article('apple')).toBe('an');
    expect(article('elephant')).toBe('an');
    expect(article('igloo')).toBe('an');
    expect(article('orange')).toBe('an');
    expect(article('umbrella')).toBe('an');
  });

  it('returns "a" for consonant sounds', () => {
    expect(article('banana')).toBe('a');
    expect(article('cat')).toBe('a');
    expect(article('dog')).toBe('a');
    expect(article('zebra')).toBe('a');
  });

  it('handles capitalized words', () => {
    expect(article('Apple')).toBe('an');
    expect(article('Banana')).toBe('a');
  });
});

