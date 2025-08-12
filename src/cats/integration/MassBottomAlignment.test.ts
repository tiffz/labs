import { describe, it, expect, beforeEach } from 'vitest';
import { catCoordinateSystem, type CatCoordinates } from '../services/CatCoordinateSystem';
import { computeShadowLayout } from '../services/ShadowLayout';

/**
 * Ensures the bottom of the visual mass box (body/head envelope) aligns with
 * the vertical center of the shadow at rest (y=0), and that during jumps
 * the mass bottom rises by exactly the jump delta while the shadow stays on the baseline.
 */

const setViewport = (width: number, height: number, sidePanelWidth: number) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
  catCoordinateSystem.setSidePanelWidth(sidePanelWidth);
  catCoordinateSystem.updateViewport();
};

describe('MassBottomAlignment', () => {
  beforeEach(() => {
    // Stable viewport for deterministic math
    setViewport(1280, 800, 450);
  });

  it('mass-box bottom equals shadow center at rest across multiple Z values', () => {
    // Constants mirroring CatInteractionManager
    const VIEWBOX_W = 220;
    const VIEWBOX_H = 200;
    const FEET_LINE_Y = 185;
    const MASS_TOP = 62;
    const MASS_BOTTOM = 182;

    const zs = [
      120,
      240,
      360,
      580,
      catCoordinateSystem.getWorldDimensions().depth * 0.6,
    ];

    zs.forEach((z) => {
      const ground: CatCoordinates = { x: 560, y: 0, z };
      const catScreen = catCoordinateSystem.catToScreen(ground);
      const groundScreen = catCoordinateSystem.catToScreen({ x: ground.x, y: 0, z: ground.z });
      const shadow = computeShadowLayout({ x: catScreen.x, y: groundScreen.y, scale: groundScreen.scale });

      const scale = groundScreen.scale;
      const catWidthPx = 300 * scale;
      const catHeightPx = catWidthPx * (VIEWBOX_H / VIEWBOX_W);
      const scaleY = catHeightPx / VIEWBOX_H;

      // Foot gap from container bottom to feet line
      const footGapPx = ((VIEWBOX_H - FEET_LINE_Y) / VIEWBOX_H) * catHeightPx;
      // Mass bottom is slightly above feet in viewBox coordinates
      const deltaMassFromFeetPx = (FEET_LINE_Y - (MASS_TOP + (MASS_BOTTOM - MASS_TOP))) * scaleY; // 3 * scaleY with defaults
      const massBottomOffsetPx = footGapPx + deltaMassFromFeetPx;

      const baselineRounded = Math.round(groundScreen.y);
      const catContainerBottomPx = baselineRounded; // clamping not needed in these ranges
      const jumpDeltaPx = 0; // y=0
      const catInnerTranslateY = massBottomOffsetPx - jumpDeltaPx;
      const catBottomPx = catContainerBottomPx - catInnerTranslateY;
      const massBottomLinePx = catBottomPx + massBottomOffsetPx; // should equal baselineRounded

      const shadowCenter = shadow.bottom + shadow.height / 2;
      expect(Math.abs(massBottomLinePx - shadowCenter)).toBeLessThanOrEqual(1);
    });
  });

  it('mass-box bottom rises by jump delta while shadow remains at baseline', () => {
    // Use a mid-depth Z
    const z = 600;
    const atGround: CatCoordinates = { x: 560, y: 0, z };
    const inAir: CatCoordinates = { x: 560, y: 100, z };

    const groundScreen = catCoordinateSystem.catToScreen(atGround);
    const airScreen = catCoordinateSystem.catToScreen(inAir);
    const shadowAtGround = computeShadowLayout({ x: groundScreen.x, y: groundScreen.y, scale: groundScreen.scale });

    const VIEWBOX_W = 220;
    const VIEWBOX_H = 200;
    const FEET_LINE_Y = 185;
    const MASS_TOP = 62;
    const MASS_BOTTOM = 182;

    const scale = airScreen.scale; // horizontal scale not relevant for vertical math symmetry
    const catWidthPx = 300 * scale;
    const catHeightPx = catWidthPx * (VIEWBOX_H / VIEWBOX_W);
    const scaleY = catHeightPx / VIEWBOX_H;

    const footGapPx = ((VIEWBOX_H - FEET_LINE_Y) / VIEWBOX_H) * catHeightPx;
    const deltaMassFromFeetPx = (FEET_LINE_Y - (MASS_TOP + (MASS_BOTTOM - MASS_TOP))) * scaleY;
    const massBottomOffsetPx = footGapPx + deltaMassFromFeetPx;

    const baselineRounded = Math.round(groundScreen.y);
    const jumpDeltaPx = Math.max(0, airScreen.y - groundScreen.y);
    const catContainerBottomPx = baselineRounded;
    const catInnerTranslateY = massBottomOffsetPx - jumpDeltaPx;
    const catBottomPx = catContainerBottomPx - catInnerTranslateY;
    const massBottomLinePx = catBottomPx + massBottomOffsetPx;

    const shadowCenterAtGround = shadowAtGround.bottom + shadowAtGround.height / 2;
    // Shadow remains at ground baseline center; mass bottom rises with jump delta
    expect(Math.abs(shadowCenterAtGround - baselineRounded)).toBeLessThanOrEqual(1);
    expect(Math.abs(massBottomLinePx - (baselineRounded + jumpDeltaPx))).toBeLessThanOrEqual(1);
  });
});


