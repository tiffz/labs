import type { PanelRect } from './types';

type PanelOrderMeta = {
  index: number;
  top: number;
  left: number;
  bottom: number;
  cx: number;
  cy: number;
};

function panelOrderMeta(panels: PanelRect[]): PanelOrderMeta[] {
  return panels.map((panel, index) => ({
    index,
    top: panel.y,
    left: panel.x,
    bottom: panel.y + panel.height,
    cx: panel.x + panel.width / 2,
    cy: panel.y + panel.height / 2,
  }));
}

/**
 * Western comic reading order: group panels into horizontal rows by vertical overlap,
 * sort rows top-to-bottom, panels within each row left-to-right.
 */
export function readingOrderForPanels(panels: PanelRect[]): number[] {
  if (panels.length <= 1) return panels.map((_, index) => index);

  const sortedByTop = panelOrderMeta(panels).sort((a, b) => a.top - b.top || a.left - b.left);
  const rows: PanelOrderMeta[][] = [];

  for (const panel of sortedByTop) {
    let placed = false;
    for (const row of rows) {
      const rowTop = Math.min(...row.map((entry) => entry.top));
      const rowBottom = Math.max(...row.map((entry) => entry.bottom));
      const overlaps = panel.cy >= rowTop - 0.02 && panel.cy <= rowBottom + 0.02;
      if (overlaps) {
        row.push(panel);
        placed = true;
        break;
      }
    }
    if (!placed) rows.push([panel]);
  }

  rows.sort(
    (a, b) => Math.min(...a.map((entry) => entry.top)) - Math.min(...b.map((entry) => entry.top)),
  );
  for (const row of rows) {
    row.sort((a, b) => a.left - b.left);
  }

  return rows.flat().map((entry) => entry.index);
}
