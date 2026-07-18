import { describe, expect, it } from 'vitest';

import {
  auditBubblePathElement,
  validateBubblePathD,
  validateBubbleTextPlacement,
  validateSpeechBubbleGeometry,
} from './speechBubblePathGeometry';
import { layoutPanelTextBlocks } from './speechBubbleLayout';
import { ellipseBubbleBodyPathD, ellipseBubbleTailPathD, speechBubblePathForLayout } from './speechBubblePath';
import type { PanelTextBlock } from './types';

describe('speechBubblePathGeometry', () => {
  it('accepts a unified roundRect outline that includes the tip', () => {
    const cx = 100;
    const cy = 50;
    const halfW = 40;
    const halfH = 22;
    const tipX = 100;
    const tipY = 120;
    const paths = speechBubblePathForLayout(cx, cy, halfW, halfH, tipX, tipY);
    expect(paths.tail).toBe('');
    expect(paths.body).toContain(`${tipX} ${tipY}`);
    expect(validateBubblePathD(paths, cx, cy, halfW, halfH, tipX, tipY)).toEqual([]);
    expect(
      validateSpeechBubbleGeometry({
        cx,
        cy,
        halfW,
        halfH,
        tailX: tipX,
        tailY: tipY,
        lines: ['Hello there.'],
        characterId: 'a',
        metrics: {
          halfW,
          halfH,
          fontSize: 11,
          lineHeight: 14,
          padX: 12,
          padY: 10,
          shape: 'roundRect',
        },
      }),
    ).toEqual([]);
  });

  it('accepts a unified ellipse outline', () => {
    const cx = 100;
    const cy = 50;
    const halfW = 40;
    const halfH = 22;
    const tipX = 100;
    const tipY = 120;
    const paths = speechBubblePathForLayout(cx, cy, halfW, halfH, tipX, tipY, 'ellipse');
    expect(paths.tail).toBe('');
    expect(validateBubblePathD(paths, cx, cy, halfW, halfH, tipX, tipY, 'ellipse')).toEqual([]);
  });

  it('rejects legacy elliptical-arc paths', () => {
    const legacy = {
      body: 'M 60 50 A 40 22 0 1 0 140 50 A 40 22 0 1 0 60 50 Z',
      tail: 'M 95 70 Q 100 90 100 120 L 105 70',
    };
    const violations = validateBubblePathD(legacy, 100, 50, 40, 22, 100, 120, 'ellipse');
    expect(violations.some((v) => v.code === 'path_legacy_ellipse_arc')).toBe(true);
  });

  it('flags an unclosed body path', () => {
    const open = { body: 'M 0 0 L 10 0 L 10 10', tail: 'M 10 10 L 5 12 Z' };
    expect(
      validateBubblePathD(open, 5, 5, 4, 4, 5, 12).some((v) => v.code === 'path_not_closed'),
    ).toBe(true);
  });

  it('flags an unclosed legacy tail path', () => {
    const openTail = { body: 'M 0 0 L 10 0 L 10 10 L 0 10 Z', tail: 'M 5 10 L 5 20 L 3 20' };
    expect(
      validateBubblePathD(openTail, 5, 5, 4, 4, 5, 20).some((v) => v.code === 'tail_not_closed'),
    ).toBe(true);
  });

  it('flags a unified outline that is missing the tip', () => {
    const missingTip = { body: 'M 0 0 L 10 0 L 10 10 L 0 10 Z', tail: '' };
    expect(
      validateBubblePathD(missingTip, 5, 5, 4, 4, 5, 20).some(
        (v) => v.code === 'path_missing_tail_tip',
      ),
    ).toBe(true);
  });

  it('audits the unified DOM path element for e2e', () => {
    const paths = speechBubblePathForLayout(50, 40, 30, 18, 50, 70);
    const bodyAudit = auditBubblePathElement(paths.body);
    expect(bodyAudit.closed).toBe(true);
    expect(bodyAudit.hasLegacyArc).toBe(false);
    expect(bodyAudit.commandCount).toBeGreaterThan(4);
  });

  it('legacy separate ellipse body/tail probes still validate as closed wedges', () => {
    const body = ellipseBubbleBodyPathD(50, 40, 30, 18);
    const tail = ellipseBubbleTailPathD(50, 40, 30, 18, 50, 70);
    expect(validateBubblePathD({ body, tail }, 50, 40, 30, 18, 50, 70, 'ellipse')).toEqual([]);
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
