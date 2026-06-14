import { describe, expect, it } from 'vitest';
import { displayPackSourceUrl, normalizePackSourceUrl } from './gesturePackSourceUrl';

describe('gesturePackSourceUrl', () => {
  it('normalizes bare domains and rejects invalid input', () => {
    expect(normalizePackSourceUrl('example.com/album')).toBe('https://example.com/album');
    expect(normalizePackSourceUrl('https://example.com/x')).toBe('https://example.com/x');
    expect(normalizePackSourceUrl('')).toBeNull();
    expect(normalizePackSourceUrl('not a url')).toBeNull();
  });

  it('shortens display labels', () => {
    expect(displayPackSourceUrl('https://www.example.com/path/to/page')).toBe('example.com/path/to/page');
  });
});
