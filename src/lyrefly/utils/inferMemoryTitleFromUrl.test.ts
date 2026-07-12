import { describe, expect, it } from 'vitest';

import { inferMemoryTitleFromUrl, normalizeMemoryUrl } from './inferMemoryTitleFromUrl';

describe('normalizeMemoryUrl', () => {
  it('adds https when missing', () => {
    expect(normalizeMemoryUrl('example.com/story')).toBe('https://example.com/story');
  });

  it('returns undefined for invalid input', () => {
    expect(normalizeMemoryUrl('')).toBeUndefined();
    expect(normalizeMemoryUrl('not a url')).toBeUndefined();
  });
});

describe('inferMemoryTitleFromUrl', () => {
  it('uses known host labels', () => {
    expect(inferMemoryTitleFromUrl('https://www.youtube.com/watch?v=abc')).toBe('YouTube video');
  });

  it('humanizes the last meaningful path segment', () => {
    expect(inferMemoryTitleFromUrl('https://news.example.com/arts/class-caption-results')).toBe(
      'Class caption results',
    );
  });

  it('falls back to hostname', () => {
    expect(inferMemoryTitleFromUrl('https://bravelittlecomic.net/')).toBe('bravelittlecomic.net');
  });
});
