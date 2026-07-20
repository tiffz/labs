import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Unlayered assignment of --app-slider-track on .app-slider beats app host
 * tokens that live in @layer components (zines teal → purple regression).
 */
describe('appSlider.css cascade contract', () => {
  it('does not assign --app-slider-track (use var(--app-slider-track, fallback) instead)', () => {
    const cssPath = path.join(process.cwd(), 'src/shared/components/appSlider.css');
    const css = fs.readFileSync(cssPath, 'utf8');
    // Assignment form only — `var(--app-slider-track, …)` must still be allowed.
    expect(css).not.toMatch(/--app-slider-track\s*:/);
    expect(css).toMatch(
      /var\(\s*--app-slider-track\s*,\s*var\(\s*--accent-primary/,
    );
  });
});
