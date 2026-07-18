import { describe, expect, it } from 'vitest';

import {
  parseFlashDateToIso,
  parseSketchbookImportFile,
  parseSketchbookJsonlImport,
  parseSketchbookMarkdownImport,
} from './sketchbookImportParser';

describe('parseFlashDateToIso', () => {
  it('parses ISO dates unchanged', () => {
    expect(parseFlashDateToIso('2025-12-23')).toBe('2025-12-23');
  });

  it('parses abbreviated month names', () => {
    expect(parseFlashDateToIso('Dec 23, 2025')).toBe('2025-12-23');
  });

  it('parses full month names', () => {
    expect(parseFlashDateToIso('December 3, 2025')).toBe('2025-12-03');
  });

  it('returns undefined for unrecognized formats', () => {
    expect(parseFlashDateToIso('sometime last week')).toBeUndefined();
  });
});

describe('parseSketchbookMarkdownImport', () => {
  it('splits multiple daily-flash headings into separate items', () => {
    const md = [
      '## Daily Flash 87 - Dec 23, 2025 - A group of friends',
      'They wait at a bus stop that never comes.',
      '',
      '## Daily Flash 88 - Dec 24, 2025 - A locked door',
      'Someone left a note taped to the glass.',
    ].join('\n');

    const items = parseSketchbookMarkdownImport(md);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      kind: 'daily_flash',
      title: 'Daily Flash 87 - A group of friends',
      bodyHtml: 'They wait at a bus stop that never comes.',
      occurredOn: '2025-12-23',
    });
    expect(items[1]).toEqual({
      kind: 'daily_flash',
      title: 'Daily Flash 88 - A locked door',
      bodyHtml: 'Someone left a note taped to the glass.',
      occurredOn: '2025-12-24',
    });
  });

  it('keeps multi-paragraph body text until the next heading', () => {
    const md = [
      '## Daily Flash 1 - Jan 1, 2025 - A quiet morning',
      'First paragraph.',
      '',
      'Second paragraph.',
      '## Daily Flash 2 - Jan 2, 2025 - A loud afternoon',
      'Only paragraph.',
    ].join('\n');

    const items = parseSketchbookMarkdownImport(md);
    expect(items[0]?.bodyHtml).toBe('First paragraph.\n\nSecond paragraph.');
  });

  it('ignores text before the first heading', () => {
    const md = ['stray preamble', '## Daily Flash 1 - Jan 1, 2025 - A title', 'body'].join('\n');
    const items = parseSketchbookMarkdownImport(md);
    expect(items).toHaveLength(1);
    expect(items[0]?.bodyHtml).toBe('body');
  });

  it('falls back to a single idea when there are no headings', () => {
    const items = parseSketchbookMarkdownImport('Just a loose note with no heading.');
    expect(items).toHaveLength(1);
    expect(items[0]?.kind).toBe('idea');
    expect(items[0]?.title).toBe('Just a loose note with no heading.');
  });

  it('returns an empty array for blank input', () => {
    expect(parseSketchbookMarkdownImport('   \n  ')).toEqual([]);
  });

  it('handles a heading with no date or title segment', () => {
    const items = parseSketchbookMarkdownImport('## Daily Flash 5\nbody text');
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe('Daily Flash 5');
    expect(items[0]?.occurredOn).toBeUndefined();
  });
});

describe('parseSketchbookJsonlImport', () => {
  it('parses one JSON object per line', () => {
    const jsonl = [
      '{"title":"A group of friends","body":"They wait at a bus stop.","createdAt":"2025-12-23"}',
      '{"title":"A locked door","body":"Someone left a note.","createdAt":"2025-12-24"}',
    ].join('\n');

    const { items, skippedCount } = parseSketchbookJsonlImport(jsonl);
    expect(skippedCount).toBe(0);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      kind: 'daily_flash',
      title: 'A group of friends',
      bodyHtml: 'They wait at a bus stop.',
      occurredOn: '2025-12-23',
    });
  });

  it('skips blank lines without counting them', () => {
    const jsonl = '{"title":"One","body":"x"}\n\n{"title":"Two","body":"y"}';
    const { items, skippedCount } = parseSketchbookJsonlImport(jsonl);
    expect(items).toHaveLength(2);
    expect(skippedCount).toBe(0);
  });

  it('counts unparsable lines as skipped', () => {
    const jsonl = '{"title":"One","body":"x"}\nnot json\n{"title":"Two","body":"y"}';
    const { items, skippedCount } = parseSketchbookJsonlImport(jsonl);
    expect(items).toHaveLength(2);
    expect(skippedCount).toBe(1);
  });

  it('counts rows with neither title nor body as skipped', () => {
    const jsonl = '{"createdAt":"2025-12-23"}';
    const { items, skippedCount } = parseSketchbookJsonlImport(jsonl);
    expect(items).toHaveLength(0);
    expect(skippedCount).toBe(1);
  });

  it('falls back to the first body line when title is missing', () => {
    const jsonl = '{"body":"First line of body.\\nMore text."}';
    const { items } = parseSketchbookJsonlImport(jsonl);
    expect(items[0]?.title).toBe('First line of body.');
  });
});

describe('parseSketchbookImportFile', () => {
  it('dispatches .jsonl files to the JSONL parser', () => {
    const result = parseSketchbookImportFile('flashes.jsonl', '{"title":"One","body":"x"}');
    expect(result?.items).toHaveLength(1);
    expect(result?.skippedCount).toBe(0);
  });

  it('dispatches .md and .txt files to the Markdown parser', () => {
    const md = '## Daily Flash 1 - Jan 1, 2025 - A title\nbody';
    expect(parseSketchbookImportFile('flashes.md', md)?.items).toHaveLength(1);
    expect(parseSketchbookImportFile('flashes.txt', md)?.items).toHaveLength(1);
  });

  it('returns null for unsupported extensions like PDF', () => {
    expect(parseSketchbookImportFile('flashes.pdf', '%PDF-1.4')).toBeNull();
  });
});
