import { describe, it, expect } from 'vitest';
import { importScore } from './importScore';

function makeFile(name: string, content: string, type = ''): File {
  return new File([content], name, { type });
}

const SIMPLE_MUSICXML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <movement-title>Test</movement-title>
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>
    </measure>
  </part>
</score-partwise>`;

describe('importScore', () => {
  it('detects and parses .musicxml files', async () => {
    const file = makeFile('score.musicxml', SIMPLE_MUSICXML);
    const stages: string[] = [];
    const result = await importScore(file, p => stages.push(p.stage));

    expect(result.score.title).toBe('Test');
    expect(result.score.key).toBe('C');
    expect(result.score.parts).toHaveLength(2);
    expect(stages).toContain('detecting');
    expect(stages).toContain('parsing');
    expect(stages).toContain('done');
  });

  it('detects and parses .xml files', async () => {
    const file = makeFile('score.xml', SIMPLE_MUSICXML);
    const result = await importScore(file);
    expect(result.score.title).toBe('Test');
  });

  it('falls back to content type for format detection', async () => {
    const file = makeFile('score', SIMPLE_MUSICXML, 'application/xml');
    const result = await importScore(file);
    expect(result.score.title).toBe('Test');
  });

  it('throws on unsupported format', async () => {
    const file = makeFile('music.pdf', 'not a score');
    await expect(importScore(file)).rejects.toThrow('Unsupported file format');
  });

  it('reports progress stages', async () => {
    const file = makeFile('test.musicxml', SIMPLE_MUSICXML);
    const stages: string[] = [];
    await importScore(file, p => stages.push(p.stage));
    expect(stages[0]).toBe('detecting');
    expect(stages[stages.length - 1]).toBe('done');
  });
});
