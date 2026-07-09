import type { ScriptBlock, ScriptPacingWarning } from '../types';
import { DIALOGUE_DENSITY_LIMIT, PANEL_OVERCROWDED_LIMIT } from './scriptLineParser';

function panelKey(pageNumber: number, panelNumber: number): string {
  return `${pageNumber}:${panelNumber}`;
}

export function analyzeScriptPacing(blocks: readonly ScriptBlock[]): ScriptPacingWarning[] {
  const warnings: ScriptPacingWarning[] = [];
  const panelChildCounts = new Map<string, number>();

  for (const block of blocks) {
    if (block.type === 'panel') continue;

    const pageNumber = 'pageNumber' in block ? block.pageNumber : 0;
    const panelNumber = 'panelNumber' in block ? block.panelNumber : 0;
    if (pageNumber <= 0) continue;

    const key = panelKey(pageNumber, panelNumber || 1);
    panelChildCounts.set(key, (panelChildCounts.get(key) ?? 0) + 1);

    if (block.type === 'dialogue') {
      const charCount = block.lines.join(' ').length;
      if (charCount > DIALOGUE_DENSITY_LIMIT) {
        warnings.push({
          blockId: block.id,
          kind: 'dialogue_density',
          message: `Panel ${panelNumber || 1} on page ${pageNumber} has dense dialogue (${charCount} chars). Consider trimming or splitting panels.`,
          severity: 'warn',
        });
      }
    }
  }

  for (const [key, count] of panelChildCounts) {
    if (count <= PANEL_OVERCROWDED_LIMIT) continue;
    const [pageStr, panelStr] = key.split(':');
    warnings.push({
      blockId: `panel-overcrowded-${key}`,
      kind: 'panel_overcrowded',
      message: `Page ${pageStr} panel ${panelStr} has ${count} script blocks. Consider splitting the panel or moving content.`,
      severity: 'warn',
    });
  }

  return warnings;
}
