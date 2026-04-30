import { describe, expect, it } from 'vitest';
import { parseScoreBuffer } from './readScoreFileMetadata';

function xmlBuf(s: string): ArrayBuffer {
  return new TextEncoder().encode(s).buffer as ArrayBuffer;
}

describe('parseScoreBuffer — MusicXML', () => {
  it('extracts work-title, composer, and key', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work>
    <work-title>Make You Feel My Love</work-title>
  </work>
  <identification>
    <creator type="composer">Bob Dylan</creator>
  </identification>
  <part-list><score-part id="P1"/></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <key>
          <fifths>-2</fifths>
          <mode>major</mode>
        </key>
      </attributes>
    </measure>
  </part>
</score-partwise>`;
    const meta = await parseScoreBuffer(xmlBuf(xml), 'test.musicxml');
    expect(meta.title).toBe('Make You Feel My Love');
    expect(meta.artist).toBe('Bob Dylan');
    expect(meta.key).toBe('Bb major');
  });

  it('falls back to movement-title when work-title is absent', async () => {
    const xml = `<score-partwise>
      <movement-title>Heart of Stone</movement-title>
    </score-partwise>`;
    const meta = await parseScoreBuffer(xmlBuf(xml), 'test.xml');
    expect(meta.title).toBe('Heart of Stone');
  });

  it('returns empty metadata for empty XML', async () => {
    const meta = await parseScoreBuffer(xmlBuf(''), 'test.musicxml');
    expect(meta).toEqual({});
  });

  it('handles minor keys via fifths', async () => {
    const xml = `<score-partwise>
      <part><measure>
        <attributes><key><fifths>1</fifths><mode>minor</mode></key></attributes>
      </measure></part>
    </score-partwise>`;
    const meta = await parseScoreBuffer(xmlBuf(xml), 'test.musicxml');
    expect(meta.key).toBe('E minor');
  });

  it('handles deeply flat minor keys', async () => {
    const xml = `<score-partwise>
      <part><measure>
        <attributes><key><fifths>-3</fifths><mode>minor</mode></key></attributes>
      </measure></part>
    </score-partwise>`;
    const meta = await parseScoreBuffer(xmlBuf(xml), 'test.musicxml');
    expect(meta.key).toBe('C minor');
  });
});

describe('parseScoreBuffer — defensive', () => {
  it('returns empty for unsupported extensions', async () => {
    const meta = await parseScoreBuffer(xmlBuf('binary'), 'test.mid');
    expect(meta).toEqual({});
  });

  it('returns empty for malformed PDF bytes', async () => {
    const meta = await parseScoreBuffer(xmlBuf('not really a pdf'), 'broken.pdf');
    expect(meta).toEqual({});
  });
});
