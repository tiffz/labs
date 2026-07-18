import { describe, expect, it } from 'vitest';

import {
  CHARACTER_ARRANGEMENTS,
  markerPlacementFromArrangement,
} from './characterArrangements';
import { characterMarkerBox, emojiPaintHalfExtent } from './characterMarkers';
import { markerLayoutBounds } from './panelClipPath';

describe('emoji marker paint bounds', () => {
  it('keeps painted bitmaps inside panel bounds for every arrangement', () => {
    const panels = [
      { x: 0, y: 0, w: 160, h: 140 },
      { x: 10, y: 20, w: 90, h: 110 },
      { x: 0, y: 0, w: 220, h: 80 },
    ];
    for (const panel of panels) {
      const layout = markerLayoutBounds(panel, 'rect', 3.25);
      for (const def of CHARACTER_ARRANGEMENTS) {
        const placement = markerPlacementFromArrangement(def.id, def.speakerCount);
        for (let i = 0; i < def.speakerCount; i++) {
          const id = (['a', 'b', 'c'] as const)[i]!;
          const box = characterMarkerBox(layout, id, placement);
          const half = emojiPaintHalfExtent(box.size);
          expect(box.cx - half, `${def.id}/${id} left`).toBeGreaterThanOrEqual(layout.x - 0.5);
          expect(box.cx + half, `${def.id}/${id} right`).toBeLessThanOrEqual(layout.x + layout.w + 0.5);
          expect(box.cy - half, `${def.id}/${id} top`).toBeGreaterThanOrEqual(layout.y - 0.5);
          expect(box.cy + half, `${def.id}/${id} bottom`).toBeLessThanOrEqual(layout.y + layout.h + 0.5);
          /* Also stay inside the outer panel (layout is inset). */
          expect(box.cy + half).toBeLessThanOrEqual(panel.y + panel.h - 1);
        }
      }
    }
  });
});
