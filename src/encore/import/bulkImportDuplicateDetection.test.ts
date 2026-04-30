import { describe, expect, it } from 'vitest';
import {
  bulkImportEffectiveSkip,
  bulkPerfDuplicateIdsInBatch,
  bulkPerfLibraryDuplicate,
  bulkScoreDuplicateIdsInBatch,
  bulkScoreLibraryDuplicate,
  normalizeImportFileName,
} from './bulkImportDuplicateDetection';
import type { EncorePerformance, EncoreSong } from '../types';

function f(name: string, size: number, lastModified: number): File {
  return new File([new Uint8Array(size)], name, { lastModified });
}

describe('normalizeImportFileName', () => {
  it('lower-cases and collapses space', () => {
    expect(normalizeImportFileName('  Foo  BAR.pdf ')).toBe('foo bar.pdf');
  });
});

describe('bulkScoreDuplicateIdsInBatch', () => {
  it('flags second row with same Drive id', () => {
    const rows = [
      { id: 'a', source: 'drive' as const, driveFileId: 'X1', name: 'a.pdf', guessedSongId: 's1' },
      { id: 'b', source: 'drive' as const, driveFileId: 'X1', name: 'b.pdf', guessedSongId: 's1' },
    ];
    expect(bulkScoreDuplicateIdsInBatch(rows).has('b')).toBe(true);
    expect(bulkScoreDuplicateIdsInBatch(rows).has('a')).toBe(false);
  });

  it('flags second local row with same name, size, and lastModified', () => {
    const file1 = f('x.pdf', 10, 1000);
    const file2 = f('x.pdf', 10, 1000);
    const rows = [
      { id: 'a', source: 'upload' as const, name: 'x.pdf', file: file1, guessedSongId: 's1' },
      { id: 'b', source: 'upload' as const, name: 'x.pdf', file: file2, guessedSongId: 's1' },
    ];
    expect(bulkScoreDuplicateIdsInBatch(rows).has('b')).toBe(true);
  });

  it('does not flag when lastModified differs (edited re-export)', () => {
    const file1 = f('x.pdf', 10, 1000);
    const file2 = f('x.pdf', 10, 2000);
    const rows = [
      { id: 'a', source: 'upload' as const, name: 'x.pdf', file: file1, guessedSongId: 's1' },
      { id: 'b', source: 'upload' as const, name: 'x.pdf', file: file2, guessedSongId: 's1' },
    ];
    expect(bulkScoreDuplicateIdsInBatch(rows).size).toBe(0);
  });
});

describe('bulkScoreLibraryDuplicate', () => {
  it('detects same Drive chart id on target song', () => {
    const song: EncoreSong = {
      id: 's1',
      title: 'T',
      artist: 'A',
      journalMarkdown: '',
      attachments: [{ kind: 'chart', driveFileId: 'D1', label: 'Chart' }],
      createdAt: '',
      updatedAt: '',
    };
    const row = { id: 'r', source: 'drive' as const, driveFileId: 'D1', name: 'x.pdf', guessedSongId: 's1' };
    expect(bulkScoreLibraryDuplicate(row, song)).toBe(true);
  });

  it('detects upload filename matching chart label for target song', () => {
    const song: EncoreSong = {
      id: 's1',
      title: 'T',
      artist: 'A',
      journalMarkdown: '',
      attachments: [{ kind: 'chart', driveFileId: 'D99', label: 'Let It Go.pdf' }],
      createdAt: '',
      updatedAt: '',
    };
    const row = {
      id: 'r',
      source: 'upload' as const,
      name: 'Let It Go.pdf',
      file: f('Let It Go.pdf', 5, 1),
      guessedSongId: 's1',
    };
    expect(bulkScoreLibraryDuplicate(row, song)).toBe(true);
  });
});

describe('bulkPerfDuplicateIdsInBatch', () => {
  it('flags duplicate drive ids', () => {
    const rows = [
      { id: 'a', driveFileId: 'V1', name: 'a.mov' },
      { id: 'b', driveFileId: 'V1', name: 'b.mov' },
    ];
    expect(bulkPerfDuplicateIdsInBatch(rows).has('b')).toBe(true);
  });
});

describe('bulkPerfLibraryDuplicate', () => {
  it('detects existing performance for Drive file when row is not linked', () => {
    const performances: EncorePerformance[] = [
      {
        id: 'p1',
        songId: 's1',
        date: '2024-01-01',
        venueTag: 'X',
        videoTargetDriveFileId: 'VF1',
        createdAt: '',
        updatedAt: '',
      },
    ];
    expect(bulkPerfLibraryDuplicate({ id: 'r', driveFileId: 'VF1', name: 'x.mov' }, performances)).toBe(true);
  });

  it('returns false when row is the linked update row', () => {
    const performances: EncorePerformance[] = [
      {
        id: 'p1',
        songId: 's1',
        date: '2024-01-01',
        venueTag: 'X',
        videoTargetDriveFileId: 'VF1',
        createdAt: '',
        updatedAt: '',
      },
    ];
    expect(
      bulkPerfLibraryDuplicate(
        { id: 'r', driveFileId: 'VF1', name: 'x.mov', linkedPerformanceId: 'p1' },
        performances,
      ),
    ).toBe(false);
  });
});

describe('bulkImportEffectiveSkip', () => {
  it('respects force include', () => {
    expect(bulkImportEffectiveSkip(false, true)).toBe(false);
  });

  it('skips duplicate by default', () => {
    expect(bulkImportEffectiveSkip(undefined, true)).toBe(true);
  });
});
