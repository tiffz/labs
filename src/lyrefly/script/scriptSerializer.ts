import type { ScriptBlock } from '../types';

export function serializeScriptBlock(block: ScriptBlock): string {
  switch (block.type) {
    case 'beat_sheet_line':
      return `- Page ${block.pageHint ?? 1}: ${block.text}`;
    case 'page_section':
      return block.pinnedBeatText
        ? `## Page ${block.pageNumber}: ${block.pinnedBeatText}`
        : `## Page ${block.pageNumber}`;
    case 'panel':
      return `[P${block.panelNumber}]`;
    case 'dialogue':
      return `@${block.character}: ${block.lines.join(' ')}`;
    case 'sfx':
      return `SFX: ${block.text}`;
    case 'narration':
      return block.text;
    default:
      return '';
  }
}

export function serializeScriptBlocks(blocks: readonly ScriptBlock[]): string {
  const lines: string[] = [];
  let lastType: ScriptBlock['type'] | null = null;

  for (const block of blocks) {
    if (block.type === 'beat_sheet_line' && lastType !== 'beat_sheet_line') {
      if (lines.length > 0) lines.push('');
      lines.push('# Beat Sheet');
    }

    if (
      lastType != null &&
      block.type !== 'beat_sheet_line' &&
      (block.type === 'page_section' || block.type === 'panel') &&
      lines.length > 0 &&
      lines[lines.length - 1] !== ''
    ) {
      lines.push('');
    }

    lines.push(serializeScriptBlock(block));
    lastType = block.type;
  }

  return lines.join('\n');
}

export function serializeScriptMarkdownFromBlocks(blocks: readonly ScriptBlock[]): string {
  return serializeScriptBlocks(blocks);
}
