import type { ScriptBlock } from '../types';
import { extractBeatSheetBlocks } from './scriptLineParser';

/**
 * Replaces beat sheet lines with full page sections and default [P1] panels.
 */
export function expandBeatSheetMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let inBeatSheet = false;
  let beatLines: Array<{ pageNumber: number; text: string }> = [];

  const flushBeatSheet = (): void => {
    if (beatLines.length === 0) return;
    for (const beat of beatLines) {
      out.push(`## Page ${beat.pageNumber}: ${beat.text}`);
      out.push('');
      out.push('[P1]');
      out.push('');
    }
    beatLines = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^#\s+Beat\s+Sheet\s*$/i.test(trimmed)) {
      inBeatSheet = true;
      continue;
    }

    const beatMatch = trimmed.match(/^-\s+Page\s+(\d+)\s*:\s*(.+)$/i);
    if (inBeatSheet && beatMatch) {
      beatLines.push({
        pageNumber: Number(beatMatch[1]),
        text: beatMatch[2]!.trim(),
      });
      continue;
    }

    if (inBeatSheet && trimmed.length > 0 && !beatMatch) {
      flushBeatSheet();
      inBeatSheet = false;
    }

    if (!inBeatSheet) {
      out.push(line);
    }
  }

  flushBeatSheet();
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();
}

export function expandBeatSheetFromBlocks(blocks: readonly ScriptBlock[], markdown: string): string {
  const beats = extractBeatSheetBlocks(blocks);
  if (beats.length === 0) return markdown;
  return expandBeatSheetMarkdown(markdown);
}
