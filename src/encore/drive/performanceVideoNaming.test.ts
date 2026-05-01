import { describe, expect, it } from 'vitest';
import { buildPerformanceVideoName, splitFileNameExtension } from './performanceVideoNaming';

describe('buildPerformanceVideoName', () => {
  it('joins date, title, and artist with " - " (no venue)', () => {
    const name = buildPerformanceVideoName(
      { date: '2026-04-30', venueTag: 'Cafe Bach' },
      { title: 'All of Me', artist: 'Frank Sinatra' },
      '.mp4',
    );
    expect(name).toBe('2026-04-30 - All of Me - Frank Sinatra.mp4');
  });

  it('uses Unknown artist when song artist is blank', () => {
    const name = buildPerformanceVideoName(
      { date: '2026-04-30', venueTag: 'Cafe Bach' },
      { title: 'All of Me', artist: '' },
      '.mp4',
    );
    expect(name).toBe('2026-04-30 - All of Me - Unknown artist.mp4');
  });

  it('omits venue even when set to the placeholder "Venue"', () => {
    const name = buildPerformanceVideoName(
      { date: '2026-04-30', venueTag: 'Venue' },
      { title: 'All of Me', artist: '' },
      '.mp4',
    );
    expect(name).toBe('2026-04-30 - All of Me - Unknown artist.mp4');
  });

  it('strips Drive-disallowed characters from inputs', () => {
    const name = buildPerformanceVideoName(
      { date: '2026-04-30', venueTag: 'cafe / bach' },
      { title: 'song: with bad/chars*', artist: '' },
      '.mp4',
    );
    expect(name).toBe('2026-04-30 - song with bad chars - Unknown artist.mp4');
  });

  it('falls back to "Undated" when date is malformed', () => {
    const name = buildPerformanceVideoName(
      { date: 'tomorrow', venueTag: 'home' },
      { title: 'A song', artist: '' },
      '',
    );
    expect(name).toBe('Undated - A song - Unknown artist');
  });

  it('falls back to Untitled song and Unknown artist when no song row is provided', () => {
    const name = buildPerformanceVideoName({ date: '2026-04-30', venueTag: 'home' }, null, '');
    expect(name).toBe('2026-04-30 - Untitled song - Unknown artist');
  });
});

describe('splitFileNameExtension', () => {
  it('extracts a typical video extension', () => {
    expect(splitFileNameExtension('clip.mp4')).toEqual({ stem: 'clip', extension: '.mp4' });
  });

  it('returns no extension when none present', () => {
    expect(splitFileNameExtension('clip')).toEqual({ stem: 'clip', extension: '' });
  });

  it('treats overly long extensions as part of the stem', () => {
    expect(splitFileNameExtension('clip.notreallyext')).toEqual({
      stem: 'clip.notreallyext',
      extension: '',
    });
  });

  it('handles trailing dot as no extension', () => {
    expect(splitFileNameExtension('clip.')).toEqual({ stem: 'clip.', extension: '' });
  });
});
