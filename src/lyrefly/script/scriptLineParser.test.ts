import { describe, expect, it } from 'vitest';

import { expandBeatSheetMarkdown } from './beatSheetExpander';
import { parseScriptMarkdown } from './scriptLineParser';
import { analyzeScriptPacing } from './scriptPacingAnalyzer';
import { serializeScriptMarkdownFromBlocks } from './scriptSerializer';

describe('parseScriptMarkdown', () => {
  it('parses page sections and panels', () => {
    const md = `## Page 1: Opening\n\n[P1]\n\nHero enters the room.`;
    const blocks = parseScriptMarkdown(md);
    expect(blocks.filter((b) => b.type === 'page_section')).toHaveLength(1);
    expect(blocks.find((b) => b.type === 'page_section')).toMatchObject({
      pageNumber: 1,
      pinnedBeatText: 'Opening',
    });
    expect(blocks.find((b) => b.type === 'panel')).toMatchObject({ panelNumber: 1 });
    expect(blocks.find((b) => b.type === 'narration')).toMatchObject({
      text: 'Hero enters the room.',
    });
  });

  it('parses dialogue shortcuts', () => {
    const md = `## Page 1\n\n[P1]\n\n@Hero: Hello world.\n\n> Side comment`;
    const blocks = parseScriptMarkdown(md);
    expect(blocks.filter((b) => b.type === 'dialogue')).toHaveLength(2);
    expect(blocks.find((b) => b.type === 'dialogue' && b.character === 'Hero')).toBeTruthy();
  });

  it('parses sfx lines', () => {
    const md = `## Page 1\n\n[P1]\n\n*CRASH*\n\nSFX: BOOM`;
    const blocks = parseScriptMarkdown(md);
    expect(blocks.filter((b) => b.type === 'sfx')).toHaveLength(2);
  });

  it('parses beat sheet lines under header', () => {
    const md = `# Beat Sheet\n\n- Page 1: Hero wakes\n- Page 2: Chase begins`;
    const blocks = parseScriptMarkdown(md);
    expect(blocks.filter((b) => b.type === 'beat_sheet_line')).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ pageHint: 1, text: 'Hero wakes' });
  });
});

describe('expandBeatSheetMarkdown', () => {
  it('expands three beat lines into page sections with panels', () => {
    const input = `# Beat Sheet\n\n- Page 1: Hero wakes\n- Page 2: Chase\n- Page 3: End`;
    const expanded = expandBeatSheetMarkdown(input);
    const blocks = parseScriptMarkdown(expanded);
    expect(blocks.filter((b) => b.type === 'page_section')).toHaveLength(3);
    expect(blocks.filter((b) => b.type === 'panel')).toHaveLength(3);
    expect(blocks.find((b) => b.type === 'page_section' && b.pageNumber === 1)).toMatchObject({
      pinnedBeatText: 'Hero wakes',
    });
  });
});

describe('scriptSerializer round-trip', () => {
  it('preserves page and panel structure', () => {
    const md = `## Page 1: Title\n\n[P1]\n\n@A: Hi\n\nNarration line.`;
    const blocks = parseScriptMarkdown(md);
    const reserialized = serializeScriptMarkdownFromBlocks(blocks);
    const roundTripped = parseScriptMarkdown(reserialized);
    expect(roundTripped.filter((b) => b.type === 'page_section')).toHaveLength(1);
    expect(roundTripped.filter((b) => b.type === 'panel')).toHaveLength(1);
    expect(roundTripped.filter((b) => b.type === 'dialogue')).toHaveLength(1);
    expect(roundTripped.filter((b) => b.type === 'narration')).toHaveLength(1);
  });
});

describe('analyzeScriptPacing', () => {
  it('warns on dialogue density over limit', () => {
    const longLine = 'x'.repeat(130);
    const blocks = parseScriptMarkdown(`## Page 1\n\n[P1]\n\n@Hero: ${longLine}`);
    const warnings = analyzeScriptPacing(blocks);
    expect(warnings.some((w) => w.kind === 'dialogue_density')).toBe(true);
  });

  it('warns when panel has more than three child blocks', () => {
    const md = `## Page 1\n\n[P1]\n\nLine one.\n\nLine two.\n\n*SFX*\n\n@A: Hi\n\nLine four.`;
    const blocks = parseScriptMarkdown(md);
    const warnings = analyzeScriptPacing(blocks);
    expect(warnings.some((w) => w.kind === 'panel_overcrowded')).toBe(true);
  });

  it('returns no warnings for sparse panels', () => {
    const blocks = parseScriptMarkdown(`## Page 1\n\n[P1]\n\n@Hero: Short line.`);
    expect(analyzeScriptPacing(blocks)).toHaveLength(0);
  });
});
