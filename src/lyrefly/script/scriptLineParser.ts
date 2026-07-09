import type { ScriptBlock, ScriptBeatSheetLineBlock } from '../types';

const PAGE_SECTION_RE = /^##\s+Page\s+(\d+)(?:\s*:\s*(.+))?$/i;
const PANEL_RE = /^\[P(\d+)\]$/i;
const BEAT_SHEET_RE = /^-\s+Page\s+(\d+)\s*:\s*(.+)$/i;
const BEAT_SHEET_MODE_HEADER = /^#\s+Beat\s+Sheet\s*$/i;
const DIALOGUE_BLOCKQUOTE_RE = /^>\s*(.+)$/;
const DIALOGUE_AT_RE = /^@([^:]+):\s*(.*)$/;
const SFX_STAR_RE = /^\*(.+)\*$/;
const SFX_PREFIX_RE = /^SFX:\s*(.+)$/i;

export { DIALOGUE_AT_RE, SFX_PREFIX_RE, SFX_STAR_RE };

export interface ScriptParseOptions {
  /** When true, lines under "# Beat Sheet" are parsed as beat_sheet_line blocks. */
  beatSheetMode?: boolean;
}

export interface ScriptParseContext {
  pageNumber: number;
  panelNumber: number;
  inBeatSheetMode: boolean;
}

function newBlockId(): string {
  return crypto.randomUUID();
}

function detectBeatSheetMode(lines: readonly string[]): boolean {
  return lines.some((line) => BEAT_SHEET_MODE_HEADER.test(line.trim()));
}

export function parseScriptLines(
  lines: readonly string[],
  options: ScriptParseOptions = {},
): ScriptBlock[] {
  const beatSheetMode = options.beatSheetMode ?? detectBeatSheetMode(lines);
  const blocks: ScriptBlock[] = [];
  const ctx: ScriptParseContext = {
    pageNumber: 0,
    panelNumber: 0,
    inBeatSheetMode: beatSheetMode,
  };

  for (let i = 0; i < lines.length; i += 1) {
    const lineNumber = i + 1;
    const raw = lines[i] ?? '';
    const trimmed = raw.trim();

    if (trimmed.length === 0) continue;

    if (BEAT_SHEET_MODE_HEADER.test(trimmed)) {
      ctx.inBeatSheetMode = true;
      continue;
    }

    const pageMatch = trimmed.match(PAGE_SECTION_RE);
    if (pageMatch) {
      ctx.inBeatSheetMode = false;
      ctx.pageNumber = Number(pageMatch[1]);
      ctx.panelNumber = 0;
      blocks.push({
        type: 'page_section',
        id: newBlockId(),
        pageNumber: ctx.pageNumber,
        pinnedBeatText: pageMatch[2]?.trim() || undefined,
        sourceLineStart: lineNumber,
        sourceLineEnd: lineNumber,
      });
      continue;
    }

    const beatMatch = trimmed.match(BEAT_SHEET_RE);
    if (ctx.inBeatSheetMode && beatMatch) {
      blocks.push({
        type: 'beat_sheet_line',
        id: newBlockId(),
        pageHint: Number(beatMatch[1]),
        text: beatMatch[2]!.trim(),
        sourceLineStart: lineNumber,
        sourceLineEnd: lineNumber,
      });
      continue;
    }

    const panelMatch = trimmed.match(PANEL_RE);
    if (panelMatch) {
      ctx.panelNumber = Number(panelMatch[1]);
      blocks.push({
        type: 'panel',
        id: newBlockId(),
        pageNumber: ctx.pageNumber,
        panelNumber: ctx.panelNumber,
        sourceLineStart: lineNumber,
        sourceLineEnd: lineNumber,
      });
      continue;
    }

    const atDialogue = trimmed.match(DIALOGUE_AT_RE);
    if (atDialogue) {
      blocks.push({
        type: 'dialogue',
        id: newBlockId(),
        pageNumber: ctx.pageNumber,
        panelNumber: ctx.panelNumber || 1,
        character: atDialogue[1]!.trim(),
        lines: [atDialogue[2]!.trim()],
        sourceLineStart: lineNumber,
        sourceLineEnd: lineNumber,
      });
      continue;
    }

    const blockquoteDialogue = trimmed.match(DIALOGUE_BLOCKQUOTE_RE);
    if (blockquoteDialogue) {
      blocks.push({
        type: 'dialogue',
        id: newBlockId(),
        pageNumber: ctx.pageNumber,
        panelNumber: ctx.panelNumber || 1,
        character: 'Unknown',
        lines: [blockquoteDialogue[1]!.trim()],
        sourceLineStart: lineNumber,
        sourceLineEnd: lineNumber,
      });
      continue;
    }

    const sfxStar = trimmed.match(SFX_STAR_RE);
    if (sfxStar) {
      blocks.push({
        type: 'sfx',
        id: newBlockId(),
        pageNumber: ctx.pageNumber,
        panelNumber: ctx.panelNumber || 1,
        text: sfxStar[1]!.trim(),
        sourceLineStart: lineNumber,
        sourceLineEnd: lineNumber,
      });
      continue;
    }

    const sfxPrefix = trimmed.match(SFX_PREFIX_RE);
    if (sfxPrefix) {
      blocks.push({
        type: 'sfx',
        id: newBlockId(),
        pageNumber: ctx.pageNumber,
        panelNumber: ctx.panelNumber || 1,
        text: sfxPrefix[1]!.trim(),
        sourceLineStart: lineNumber,
        sourceLineEnd: lineNumber,
      });
      continue;
    }

    blocks.push({
      type: 'narration',
      id: newBlockId(),
      pageNumber: ctx.pageNumber,
      panelNumber: ctx.panelNumber || 1,
      text: trimmed,
      sourceLineStart: lineNumber,
      sourceLineEnd: lineNumber,
    });
  }

  return blocks;
}

export function parseScriptMarkdown(
  markdown: string,
  options: ScriptParseOptions = {},
): ScriptBlock[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  return parseScriptLines(lines, options);
}

export function extractBeatSheetBlocks(blocks: readonly ScriptBlock[]): ScriptBeatSheetLineBlock[] {
  return blocks.filter((b): b is ScriptBeatSheetLineBlock => b.type === 'beat_sheet_line');
}

export const DIALOGUE_DENSITY_LIMIT = 120;
export const PANEL_OVERCROWDED_LIMIT = 3;
