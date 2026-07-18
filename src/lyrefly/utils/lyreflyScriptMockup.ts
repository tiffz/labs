import type { PanelCharacterId, PanelFillSpec, PanelLayoutPresetId, PanelTextBlock } from '../../shared/comic';
import type { ScriptBlock, ScriptPanelBlock } from '../types';

/** Distinct page numbers present in a parsed script, sorted ascending. Falls back to page 1. */
export function scriptPageNumbers(blocks: readonly ScriptBlock[]): number[] {
  const pages = new Set<number>();
  for (const block of blocks) {
    if (block.type === 'page_section') pages.add(block.pageNumber);
  }
  if (pages.size === 0) return [1];
  return [...pages].sort((a, b) => a - b);
}

/** All blocks belonging to one script page (excludes pre-expansion beat sheet rows). */
export function scriptBlocksForPage(blocks: readonly ScriptBlock[], pageNumber: number): ScriptBlock[] {
  return blocks.filter((block) => block.type !== 'beat_sheet_line' && block.pageNumber === pageNumber);
}

/** Number of distinct panels called out in a page's blocks. */
export function panelCountForPage(pageBlocks: readonly ScriptBlock[]): number {
  const panelNumbers = new Set<number>();
  for (const block of pageBlocks) {
    if (block.type === 'panel') panelNumbers.add(block.panelNumber);
  }
  return panelNumbers.size;
}

/** Nearest static mockup layout preset for a script page's panel count. */
export function presetIdForPanelCount(count: number): PanelLayoutPresetId {
  if (count <= 1) return 'single';
  if (count === 2) return 'strip-2';
  if (count === 3) return 'strip-3';
  if (count === 4) return 'grid-2x2';
  return 'grid-2x3';
}

const CHARACTER_SLOTS: readonly PanelCharacterId[] = ['a', 'b', 'c'];

/** Maps character names to the 3 supported bubble slots; extra characters share the last slot. */
function characterSlotFor(name: string, assigned: Map<string, PanelCharacterId>): PanelCharacterId {
  const existing = assigned.get(name);
  if (existing) return existing;
  const slot = CHARACTER_SLOTS[assigned.size] ?? CHARACTER_SLOTS[CHARACTER_SLOTS.length - 1]!;
  assigned.set(name, slot);
  return slot;
}

function groupBlocksByPanel(pageBlocks: readonly ScriptBlock[]): Map<number, ScriptBlock[]> {
  const groups = new Map<number, ScriptBlock[]>();
  for (const block of pageBlocks) {
    if (block.type === 'page_section' || block.type === 'beat_sheet_line') continue;
    const list = groups.get(block.panelNumber) ?? [];
    list.push(block);
    groups.set(block.panelNumber, list);
  }
  return groups;
}

/**
 * Maps a script page's panel/dialogue/sfx/narration blocks into mockup panel fills, preserving
 * script order within each panel. Panels beyond `panelCount` (the chosen mockup layout) are
 * dropped; panels with no script content are left empty.
 */
export function buildPanelFillsFromScriptBlocks(
  pageBlocks: readonly ScriptBlock[],
  panelCount: number,
): PanelFillSpec[] {
  const groups = groupBlocksByPanel(pageBlocks);
  const characterSlots = new Map<string, PanelCharacterId>();
  const fills: PanelFillSpec[] = [];

  for (let index = 0; index < panelCount; index += 1) {
    const panelNumber = index + 1;
    const group = groups.get(panelNumber) ?? [];
    const blocks: PanelTextBlock[] = [];

    const panelBlock = group.find((block): block is ScriptPanelBlock => block.type === 'panel');
    if (panelBlock?.caption) {
      blocks.push({ kind: 'caption', content: panelBlock.caption });
    }

    for (const block of group) {
      if (block.type === 'narration' && block.text.trim()) {
        blocks.push({ kind: 'caption', content: block.text, placement: 'after' });
      } else if (block.type === 'sfx' && block.text.trim()) {
        blocks.push({ kind: 'sfx', content: block.text });
      } else if (block.type === 'dialogue') {
        const characterId = characterSlotFor(block.character, characterSlots);
        for (const line of block.lines) {
          if (line.trim()) blocks.push({ kind: 'dialogue', characterId, content: line });
        }
      }
    }

    fills.push({ panelIndex: index, composition: 'empty', blocks });
  }

  return fills;
}
