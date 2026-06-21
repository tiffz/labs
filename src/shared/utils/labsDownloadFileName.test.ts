import { describe, expect, it } from 'vitest';
import {
  buildChordChartDownloadFileName,
  buildLabsDownloadFileName,
  labsDownloadFileNameWithExtension,
  sanitizeLabsDownloadFileStem,
} from './labsDownloadFileName';

describe('labsDownloadFileName', () => {
  it('sanitizes illegal filename characters', () => {
    expect(sanitizeLabsDownloadFileStem('A/B:C*Song?')).toBe('A B C Song');
  });

  it('builds readable multi-part names with extension', () => {
    expect(buildLabsDownloadFileName(['A Thousand Castles', 'Chord Chart'], 'pdf')).toBe(
      'A Thousand Castles - Chord Chart.pdf',
    );
  });

  it('builds chord chart names from song titles', () => {
    expect(buildChordChartDownloadFileName('A Thousand Castles')).toBe(
      'A Thousand Castles - Chord Chart',
    );
    expect(buildChordChartDownloadFileName('   ')).toBe('Untitled - Chord Chart');
  });

  it('appends extension to an existing stem', () => {
    expect(labsDownloadFileNameWithExtension('My Song - Audio', 'wav')).toBe('My Song - Audio.wav');
  });
});
