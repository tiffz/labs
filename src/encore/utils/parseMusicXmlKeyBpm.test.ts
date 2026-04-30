import { describe, expect, it } from 'vitest';
import { parseMusicXmlKeyBpm } from './parseMusicXmlKeyBpm';

describe('parseMusicXmlKeyBpm', () => {
  it('reads fifths and tempo', () => {
    const xml = `<?xml version="1.0"?>
<score-partwise><part><measure><attributes><key><fifths>-2</fifths><mode>major</mode></key></attributes><sound tempo="92"/></measure></part></score-partwise>`;
    expect(parseMusicXmlKeyBpm(xml)).toMatchObject({ key: 'Bb major', bpm: 92 });
  });
});
