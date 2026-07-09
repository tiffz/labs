import { richTextPlainText } from '../../shared/utils/richTextContent';
import type { ScriptBlock } from '../types';
import { DIALOGUE_AT_RE, SFX_PREFIX_RE, SFX_STAR_RE } from './scriptLineParser';

function newBlockId(): string {
  return crypto.randomUUID();
}

function getLiLabel(li: Element): string {
  const clone = li.cloneNode(true) as Element;
  clone.querySelectorAll('ul, ol').forEach((el) => el.remove());
  return richTextPlainText(clone.innerHTML).trim();
}

const PAGE_LABEL_RE = /^page\s+(\d+)\s*(?:[:\u2014-]\s*(.+))?$/i;
const DIALOGUE_COLON_RE = /^([^:]{1,40}):\s*(.+)$/s;

function parsePageBeat(text: string): string | undefined {
  const match = text.match(PAGE_LABEL_RE);
  if (match) return match[2]?.trim() || undefined;
  return text.trim() || undefined;
}

function classifyPanelLine(
  text: string,
  pageNumber: number,
  panelNumber: number,
  lineNumber: number,
): ScriptBlock | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const atDialogue = trimmed.match(DIALOGUE_AT_RE);
  if (atDialogue) {
    return {
      type: 'dialogue',
      id: newBlockId(),
      pageNumber,
      panelNumber,
      character: atDialogue[1]!.trim(),
      lines: [atDialogue[2]!.trim()],
      sourceLineStart: lineNumber,
      sourceLineEnd: lineNumber,
    };
  }

  const colonDialogue = trimmed.match(DIALOGUE_COLON_RE);
  if (colonDialogue && !colonDialogue[1]!.includes('http')) {
    const character = colonDialogue[1]!.trim();
    const line = colonDialogue[2]!.trim();
    if (character.length > 0 && line.length > 0) {
      return {
        type: 'dialogue',
        id: newBlockId(),
        pageNumber,
        panelNumber,
        character,
        lines: [line],
        sourceLineStart: lineNumber,
        sourceLineEnd: lineNumber,
      };
    }
  }

  const sfxStar = trimmed.match(SFX_STAR_RE);
  if (sfxStar) {
    return {
      type: 'sfx',
      id: newBlockId(),
      pageNumber,
      panelNumber,
      text: sfxStar[1]!.trim(),
      sourceLineStart: lineNumber,
      sourceLineEnd: lineNumber,
    };
  }

  const sfxPrefix = trimmed.match(SFX_PREFIX_RE);
  if (sfxPrefix) {
    return {
      type: 'sfx',
      id: newBlockId(),
      pageNumber,
      panelNumber,
      text: sfxPrefix[1]!.trim(),
      sourceLineStart: lineNumber,
      sourceLineEnd: lineNumber,
    };
  }

  return {
    type: 'narration',
    id: newBlockId(),
    pageNumber,
    panelNumber,
    text: trimmed,
    sourceLineStart: lineNumber,
    sourceLineEnd: lineNumber,
  };
}

type ParseCtx = {
  pageNumber: number;
  panelNumber: number;
  lineCounter: number;
};

function processContentList(
  list: HTMLUListElement | HTMLOListElement,
  blocks: ScriptBlock[],
  ctx: ParseCtx,
): void {
  for (const child of list.children) {
    if (!(child instanceof HTMLLIElement)) continue;
    ctx.lineCounter += 1;
    const label = getLiLabel(child);
    const block = classifyPanelLine(label, ctx.pageNumber, ctx.panelNumber, ctx.lineCounter);
    if (block) blocks.push(block);
    const nested = child.querySelector(':scope > ul, :scope > ol');
    if (nested instanceof HTMLUListElement || nested instanceof HTMLOListElement) {
      processContentList(nested, blocks, ctx);
    }
  }
}

function processPanelList(
  list: HTMLUListElement | HTMLOListElement,
  blocks: ScriptBlock[],
  ctx: ParseCtx,
): void {
  for (const child of list.children) {
    if (!(child instanceof HTMLLIElement)) continue;
    ctx.lineCounter += 1;
    ctx.panelNumber += 1;
    blocks.push({
      type: 'panel',
      id: newBlockId(),
      pageNumber: ctx.pageNumber,
      panelNumber: ctx.panelNumber,
      sourceLineStart: ctx.lineCounter,
      sourceLineEnd: ctx.lineCounter,
    });
    const label = getLiLabel(child);
    const contentList = child.querySelector(':scope > ul, :scope > ol');
    if (contentList instanceof HTMLUListElement || contentList instanceof HTMLOListElement) {
      processContentList(contentList, blocks, ctx);
    } else if (label) {
      const block = classifyPanelLine(label, ctx.pageNumber, ctx.panelNumber, ctx.lineCounter);
      if (block) blocks.push(block);
    }
  }
}

function processPageList(
  list: HTMLUListElement | HTMLOListElement,
  blocks: ScriptBlock[],
  ctx: ParseCtx,
): void {
  for (const child of list.children) {
    if (!(child instanceof HTMLLIElement)) continue;
    ctx.lineCounter += 1;
    ctx.pageNumber += 1;
    ctx.panelNumber = 0;
    const label = getLiLabel(child);
    blocks.push({
      type: 'page_section',
      id: newBlockId(),
      pageNumber: ctx.pageNumber,
      pinnedBeatText: parsePageBeat(label),
      sourceLineStart: ctx.lineCounter,
      sourceLineEnd: ctx.lineCounter,
    });
    const panelList = child.querySelector(':scope > ul, :scope > ol');
    if (panelList instanceof HTMLUListElement || panelList instanceof HTMLOListElement) {
      processPanelList(panelList, blocks, ctx);
    } else if (label && !PAGE_LABEL_RE.test(label)) {
      ctx.panelNumber = 1;
      blocks.push({
        type: 'panel',
        id: newBlockId(),
        pageNumber: ctx.pageNumber,
        panelNumber: 1,
        sourceLineStart: ctx.lineCounter,
        sourceLineEnd: ctx.lineCounter,
      });
      const block = classifyPanelLine(label, ctx.pageNumber, 1, ctx.lineCounter);
      if (block) blocks.push(block);
    }
  }
}

/**
 * Parses comic script structure from TipTap HTML (nested bullet lists).
 *
 * Depth convention (matches common Google Docs / Word comic scripts):
 * - Top-level bullet → page
 * - Nested bullet → panel
 * - Deeper bullets → description, CHARACTER: dialogue, *SFX*, etc.
 */
export function parseScriptHtml(html: string): ScriptBlock[] {
  const trimmed = html.trim();
  if (!trimmed || trimmed === '<p></p>') return [];

  const doc = new DOMParser().parseFromString(trimmed, 'text/html');
  const ctx: ParseCtx = { pageNumber: 0, panelNumber: 0, lineCounter: 0 };
  const blocks: ScriptBlock[] = [];

  const topLists = Array.from(doc.body.children).filter(
    (n): n is HTMLUListElement | HTMLOListElement =>
      n instanceof HTMLUListElement || n instanceof HTMLOListElement,
  );

  if (topLists.length === 0) {
    const plain = richTextPlainText(trimmed);
    if (!plain.trim()) return [];
    ctx.pageNumber = 1;
    ctx.panelNumber = 1;
    blocks.push({
      type: 'page_section',
      id: newBlockId(),
      pageNumber: 1,
      sourceLineStart: 1,
      sourceLineEnd: 1,
    });
    blocks.push({
      type: 'panel',
      id: newBlockId(),
      pageNumber: 1,
      panelNumber: 1,
      sourceLineStart: 1,
      sourceLineEnd: 1,
    });
    const block = classifyPanelLine(plain, 1, 1, 1);
    if (block) blocks.push(block);
    return blocks;
  }

  for (const list of topLists) {
    processPageList(list, blocks, ctx);
  }
  return blocks;
}

export function isScriptHtmlContent(value: string): boolean {
  const t = value.trim();
  return t.startsWith('<') && (t.includes('<ul') || t.includes('<ol') || t.includes('<p'));
}

export const DEFAULT_SCRIPT_HTML = `<ul><li>Page 1<ul><li>Opening<ul><li>Courier receives a sealed package.</li></ul></li></ul></li><li>Page 2<ul><li>Chase<ul><li>Neon alleys, pursuit.</li></ul></li></ul></li></ul>`;
