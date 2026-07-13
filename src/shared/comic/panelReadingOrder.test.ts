import { describe, expect, it } from 'vitest';

import { DEFAULT_LABS_PRINT_SPEC } from '../zine/labsPrintSpec';
import { generateLayoutsForPanelCount } from './layoutGenerate';
import { readingOrderForPanels } from './panelReadingOrder';

describe('readingOrderForPanels', () => {
  it('orders L-shape top row left-to-right (upper-left is 1)', () => {
    const panels = [
      { x: 0, y: 0, width: 0.62, height: 0.62 },
      { x: 0.64, y: 0, width: 0.36, height: 0.3 },
      { x: 0.64, y: 0.32, width: 0.36, height: 0.3 },
      { x: 0, y: 0.64, width: 1, height: 0.36 },
    ];
    expect(readingOrderForPanels(panels)).toEqual([0, 1, 2, 3]);
  });

  it('orders 2x2 grid left-to-right, top-to-bottom', () => {
    const panels = [
      { x: 0, y: 0, width: 0.49, height: 0.49 },
      { x: 0.51, y: 0, width: 0.49, height: 0.49 },
      { x: 0, y: 0.51, width: 0.49, height: 0.49 },
      { x: 0.51, y: 0.51, width: 0.49, height: 0.49 },
    ];
    expect(readingOrderForPanels(panels)).toEqual([0, 1, 2, 3]);
  });
});

describe('generateLayoutsForPanelCount reading order', () => {
  it('labels L-shape upper-left panel as first in reading order', () => {
    const layouts = generateLayoutsForPanelCount(4, { printSpec: DEFAULT_LABS_PRINT_SPEC });
    const lShape = layouts.find((row) => row.heuristic === 'l-shape');
    expect(lShape).toBeTruthy();
    expect(lShape!.readingOrder[0]).toBe(0);
    expect(lShape!.readingOrder.indexOf(0)).toBe(0);
  });
});
