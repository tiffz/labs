import { describe, expect, it } from 'vitest';
import { buildBulkVideoFilenameCandidates } from './bulkVideoFilenameCandidates';

describe('buildBulkVideoFilenameCandidates', () => {
  it('splits on hyphen and underscore', () => {
    const c = [...buildBulkVideoFilenameCandidates("Let It Go - Martuni's.mov")];
    expect(c.some((x) => x.toLowerCase().includes('let it go'))).toBe(true);
    expect(c.some((x) => x.toLowerCase().includes('martuni'))).toBe(true);
  });

  it('handles underscores', () => {
    const c = [...buildBulkVideoFilenameCandidates('vampire_martuni_oct22.mp4')];
    expect(c.some((x) => x.includes('vampire'))).toBe(true);
    expect(c.some((x) => x.includes('martuni'))).toBe(true);
  });

});
