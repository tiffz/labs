import { describe, expect, it } from 'vitest';

import {
  auditBubblePathElement,
  validateBubblePathD,
  validateBubbleTextPlacement,
  validateSpeechBubbleGeometry,
} from './speechBubblePathGeometry';
import { layoutPanelTextBlocks } from './speechBubbleLayout';
import { speechBubblePathD } from './speechBubblePath';
import type { PanelTextBlock } from './types';

describe('speechBubblePathGeometry', () => {
  it('accepts a properly formed bubble path', () => {
    const cx = 100;
    const cy = 50;
    const halfW = 40;
    const halfH = 22;
    const tailX = 100;
    const tailY = 120;
    const pathD = speechBubblePathD(cx, cy, halfW, halfH, tailX, tailY);
    expect(validateBubblePathD(pathD, cx, cy, halfW, halfH, tailX, tailY)).toEqual([]);
    expect(validateSpeechBubbleGeometry({
      cx,
      cy,
      halfW,
      halfH,
      tailX,
      tailY,
      lines: ['Hello there.'],
      characterId: 'a',
      metrics: {
        halfW,
        halfH,
        fontSize: 11,
        lineHeight: 14,
        padX: 12,
        padY: 10,
        shape: 'ellipse',
      },
    })).toEqual([]);
  });

  it('rejects legacy elliptical-arc paths', () => {
    const legacy =
      'M 60 50 A 40 22 0 1 0 140 50 A 40 22 0 1 0 60 50 L 95 70 Q 100 90 100 120 L 105 70 Z';
    const violations = validateBubblePathD(legacy, 100, 50, 40, 22, 100, 120);
    expect(violations.some((v) => v.code === 'path_legacy_ellipse_arc')).toBe(true);
  });

  it('flags unclosed paths', () => {
    const open = 'M 0 0 L 10 0 L 10 10';
    expect(validateBubblePathD(open, 5, 5, 4, 4, 5, 12).some((v) => v.code === 'path_not_closed')).toBe(
      true,
    );
  });

  it('audits DOM path elements for e2e', () => {
    const pathD = speechBubblePathD(50, 40, 30, 18, 50, 70);
    const audit = auditBubblePathElement(pathD);
    expect(audit.closed).toBe(true);
    expect(audit.hasLegacyArc).toBe(false);
    expect(audit.commandCount).toBeGreaterThan(4);
  });
});

describe('speechBubblePathGeometry on laid-out panels', () => {
  it('passes geometry for multi-speaker exchange', () => {
    const bounds = { x: 0, y: 0, w: 160, h: 140 };
    const blocks: PanelTextBlock[] = [
      { kind: 'dialogue', characterId: 'a', content: 'Is that a suspicious submarine?' },
      { kind: 'dialogue', characterId: 'b', content: 'Worse. It is mine.' },
    ];
    const layout = layoutPanelTextBlocks(blocks, bounds);
    for (const item of layout.items) {
      if (item.kind !== 'bubble') continue;
      expect(validateSpeechBubbleGeometry(item.layout)).toEqual([]);
      expect(validateBubbleTextPlacement(item.layout)).toEqual([]);
    }
  });
});
