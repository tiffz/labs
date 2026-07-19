import { describe, expect, it } from 'vitest';
import { hostnameMatches, hostnameMatchesAny } from './safeUrlHost';

describe('safeUrlHost', () => {
  it('rejects hostnames that only appear as a query substring', () => {
    expect(hostnameMatches('https://evil.example/?q=youtube.com', 'youtube.com')).toBe(false);
  });

  it('accepts exact host and subdomains', () => {
    expect(hostnameMatches('https://youtube.com/watch?v=1', 'youtube.com')).toBe(true);
    expect(hostnameMatches('https://www.youtube.com/watch?v=1', 'youtube.com')).toBe(true);
  });

  it('matches any listed host', () => {
    expect(
      hostnameMatchesAny('https://music.youtube.com/', ['youtube.com', 'youtu.be']),
    ).toBe(true);
  });
});
