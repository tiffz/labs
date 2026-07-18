import { describe, expect, it } from 'vitest';

import { characterMarkerBox } from './characterMarkers';
import { markerLayoutBounds, panelCircleClipAttrs } from './panelClipPath';

describe('markerLayoutBounds', () => {
  it('keeps circle-panel emoji slots inside the disc (not AABB corners)', () => {
    const bounds = { x: 0, y: 0, w: 200, h: 200 };
    const layout = markerLayoutBounds(bounds, 'circle', 4);
    const { cx, cy, r } = panelCircleClipAttrs(bounds);
    const box = characterMarkerBox(layout, 'a');
    const fontHalf = Math.max(14, box.size * 1.55) * 0.55;
    const dist = Math.hypot(box.cx - cx, box.cy + fontHalf - cy);
    expect(dist).toBeLessThan(r - 1);
  });

  it('insets rectangular panels slightly from the gutter', () => {
    const bounds = { x: 10, y: 20, w: 100, h: 120 };
    const layout = markerLayoutBounds(bounds, 'rect', 3);
    expect(layout.x).toBeGreaterThan(bounds.x);
    expect(layout.y).toBeGreaterThan(bounds.y);
    expect(layout.x + layout.w).toBeLessThan(bounds.x + bounds.w);
    expect(layout.y + layout.h).toBeLessThan(bounds.y + bounds.h);
  });
});
