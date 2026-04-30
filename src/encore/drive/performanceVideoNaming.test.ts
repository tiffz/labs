import { describe, expect, it } from 'vitest';
import { buildPerformanceVideoName, splitFileNameExtension } from './performanceVideoNaming';

describe('buildPerformanceVideoName', () => {
  it('joins date, song title, and venue with " - "', () => {
    const name = buildPerformanceVideoName(
      { date: '2026-04-30', venueTag: 'Cafe Bach' },
      { title: 'All of Me', artist: 'Frank Sinatra' },
      '.mp4',
    );
    expect(name).toBe('2026-04-30 - All of Me - Cafe Bach.mp4');
  });

  it('omits venue when set to the placeholder "Venue"', () => {
    const name = buildPerformanceVideoName(
      { date: '2026-04-30', venueTag: 'Venue' },
      { title: 'All of Me', artist: '' },
      '.mp4',
    );
    expect(name).toBe('2026-04-30 - All of Me.mp4');
  });

  it('omits venue when blank', () => {
    const name = buildPerformanceVideoName(
      { date: '2026-04-30', venueTag: '' },
      { title: 'All of Me', artist: '' },
      '',
    );
    expect(name).toBe('2026-04-30 - All of Me');
  });

  it('strips Drive-disallowed characters from inputs', () => {
    const name = buildPerformanceVideoName(
      { date: '2026-04-30', venueTag: 'cafe / bach' },
      { title: 'song: with bad/chars*', artist: '' },
      '.mp4',
    );
    expect(name).toBe('2026-04-30 - song with bad chars - cafe bach.mp4');
  });

  it('falls back to "Undated" when date is malformed', () => {
    const name = buildPerformanceVideoName(
      { date: 'tomorrow', venueTag: 'home' },
      { title: 'A song', artist: '' },
      '',
    );
    expect(name).toBe('Undated - A song - home');
  });

  it('falls back to "Untitled song" when no song row is provided', () => {
    const name = buildPerformanceVideoName(
      { date: '2026-04-30', venueTag: 'home' },
      null,
      '',
    );
    expect(name).toBe('2026-04-30 - Untitled song - home');
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
