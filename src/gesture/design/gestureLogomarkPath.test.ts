import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  GESTURE_FAVICON_STROKE_WIDTH,
  GESTURE_LOGOMARK_STROKE_PATH,
} from './gestureLogomarkPath';

const here = dirname(fileURLToPath(import.meta.url));
const faviconPath = join(here, '../../../public/icons/favicon-gesture.svg');

describe('gestureLogomarkPath', () => {
  it('matches the favicon SVG stroke path (O2 upward hook)', () => {
    const svg = readFileSync(faviconPath, 'utf8');
    const normalizedPath = GESTURE_LOGOMARK_STROKE_PATH.replace(/\s+/g, ' ').trim();
    expect(svg.replace(/\s+/g, ' ')).toContain(`d="${normalizedPath}"`);
    expect(svg).toContain('fill="none"');
    expect(svg).toContain(`stroke-width="${GESTURE_FAVICON_STROKE_WIDTH}"`);
  });

  it('uses the open-tail upward hook silhouette', () => {
    expect(GESTURE_LOGOMARK_STROKE_PATH).toContain('9.5 24.8');
    expect(GESTURE_LOGOMARK_STROKE_PATH).not.toContain('13.8 18.4');
  });
});
