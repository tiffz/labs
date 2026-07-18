import { describe, expect, it } from 'vitest';

import { parseScriptHtml } from '../script/scriptHtmlParser';
import { parseScriptMarkdown } from '../script/scriptLineParser';
import { DEFAULT_SCRIPT_HTML } from '../script/defaultScriptSample';
import {
  buildPanelFillsFromScriptBlocks,
  panelCountForPage,
  presetIdForPanelCount,
  scriptBlocksForPage,
  scriptPageNumbers,
} from './lyreflyScriptMockup';

describe('scriptPageNumbers', () => {
  it('lists distinct pages from the default sample script', () => {
    const blocks = parseScriptHtml(DEFAULT_SCRIPT_HTML);
    expect(scriptPageNumbers(blocks)).toEqual([1, 2]);
  });

  it('falls back to page 1 when the script has no page sections', () => {
    expect(scriptPageNumbers([])).toEqual([1]);
  });
});

describe('scriptBlocksForPage + panelCountForPage', () => {
  it('scopes blocks to one page and counts its panels', () => {
    const blocks = parseScriptHtml(DEFAULT_SCRIPT_HTML);
    const page1 = scriptBlocksForPage(blocks, 1);
    const page2 = scriptBlocksForPage(blocks, 2);

    expect(page1.every((b) => b.type === 'page_section' || b.pageNumber === 1)).toBe(true);
    expect(page2.every((b) => b.type === 'page_section' || b.pageNumber === 2)).toBe(true);
    expect(panelCountForPage(page1)).toBe(1);
    expect(panelCountForPage(page2)).toBe(1);
  });

  it('excludes beat sheet rows, which use pageHint instead of pageNumber', () => {
    const markdown = ['# Beat Sheet', '- Page 1: Hero wakes up', '## Page 1', '[P1]', 'Hero wakes.'].join('\n');
    const blocks = parseScriptMarkdown(markdown);
    const page1 = scriptBlocksForPage(blocks, 1);
    expect(page1.some((b) => b.type === 'beat_sheet_line')).toBe(false);
    expect(page1.some((b) => b.type === 'narration')).toBe(true);
  });
});

describe('presetIdForPanelCount', () => {
  it('maps panel counts to the nearest static layout preset', () => {
    expect(presetIdForPanelCount(0)).toBe('single');
    expect(presetIdForPanelCount(1)).toBe('single');
    expect(presetIdForPanelCount(2)).toBe('strip-2');
    expect(presetIdForPanelCount(3)).toBe('strip-3');
    expect(presetIdForPanelCount(4)).toBe('grid-2x2');
    expect(presetIdForPanelCount(5)).toBe('grid-2x3');
    expect(presetIdForPanelCount(6)).toBe('grid-2x3');
    expect(presetIdForPanelCount(9)).toBe('grid-2x3');
  });
});

describe('buildPanelFillsFromScriptBlocks', () => {
  it('maps dialogue, sfx, and panel caption into panel 1 blocks (default sample page 1)', () => {
    const blocks = parseScriptHtml(DEFAULT_SCRIPT_HTML);
    const page1 = scriptBlocksForPage(blocks, 1);
    const fills = buildPanelFillsFromScriptBlocks(page1, 1);

    expect(fills).toHaveLength(1);
    const [panel] = fills;
    expect(panel!.panelIndex).toBe(0);
    const kinds = panel!.blocks!.map((b) => b.kind);
    expect(kinds).toEqual(['caption', 'caption', 'dialogue', 'sfx']);
    expect(panel!.blocks![0]).toMatchObject({ kind: 'caption', content: 'Opening spread' });
    expect(panel!.blocks!.some((b) => b.kind === 'dialogue' && b.content.includes('manifest'))).toBe(true);
  });

  it('drops panels beyond the requested panel count and leaves scriptless panels empty', () => {
    const markdown = [
      '## Page 1',
      '[P1]',
      '@Hero: Line one.',
      '[P2]',
      '@Villain: Line two.',
      '[P3]',
      '@Hero: Line three.',
    ].join('\n');
    const blocks = parseScriptMarkdown(markdown);
    const page1 = scriptBlocksForPage(blocks, 1);

    const fills = buildPanelFillsFromScriptBlocks(page1, 2);
    expect(fills).toHaveLength(2);
    expect(fills[0]!.blocks!.some((b) => b.kind === 'dialogue' && b.content === 'Line one.')).toBe(true);
    expect(fills[1]!.blocks!.some((b) => b.kind === 'dialogue' && b.content === 'Line two.')).toBe(true);
    expect(fills.every((fill) => fill.blocks!.every((b) => b.kind !== 'dialogue' || b.content !== 'Line three.'))).toBe(
      true,
    );
  });

  it('assigns distinct characters to bubble slots a/b/c, sharing the last slot beyond 3', () => {
    const markdown = [
      '## Page 1',
      '[P1]',
      '@Alice: Hi.',
      '@Bob: Hey.',
      '@Cara: Yo.',
      '@Dana: Sup.',
    ].join('\n');
    const blocks = parseScriptMarkdown(markdown);
    const page1 = scriptBlocksForPage(blocks, 1);
    const fills = buildPanelFillsFromScriptBlocks(page1, 1);

    const dialogueBlocks = fills[0]!.blocks!.filter((b) => b.kind === 'dialogue');
    expect(dialogueBlocks.map((b) => (b.kind === 'dialogue' ? b.characterId : null))).toEqual([
      'a',
      'b',
      'c',
      'c',
    ]);
  });

  it('returns empty blocks for a panel with no matching script content', () => {
    const fills = buildPanelFillsFromScriptBlocks([], 2);
    expect(fills).toHaveLength(2);
    expect(fills[0]!.blocks).toEqual([]);
    expect(fills[1]!.blocks).toEqual([]);
  });
});
