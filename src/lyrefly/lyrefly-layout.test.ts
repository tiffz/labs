import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LYREFLY_LAYOUT_CSS = path.join(__dirname, 'lyrefly-layout.css');

describe('lyrefly layout guardrails', () => {
  const layoutCss = fs.readFileSync(LYREFLY_LAYOUT_CSS, 'utf8');

  it('does not double-pad gallery shell column and header shell-bar', () => {
    const galleryColumnRule = layoutCss.match(
      /\.lyrefly-layout \.app-shell-column:not\(:has\(\.lyrefly-workbench\)\)\s*\{[^}]+\}/,
    )?.[0];
    expect(galleryColumnRule, 'gallery column rule should exist').toBeTruthy();
    expect(galleryColumnRule).not.toMatch(/padding-inline:\s*var\(--app-shell-gutter\)/);
    expect(layoutCss).toMatch(/\.lyrefly-shell-bar\s*\{[^}]*padding-inline:\s*var\(--app-shell-gutter\)/);
  });

  it('applies gallery floor on showcase scroll region', () => {
    expect(layoutCss).toMatch(
      /\.lyrefly-layout[\s\S]*\.app-shell-column:not\(:has\(\.lyrefly-workbench\)\)[\s\S]*\.app-shell-scroll\s*\{[\s\S]*?background:\s*var\(--lyrefly-gallery-floor\)/,
    );
  });

  it('keeps workbench stage body gutter token', () => {
    expect(layoutCss).toMatch(
      /\.lyrefly-stage-body\s*\{[^}]*padding-inline:\s*var\(--app-shell-gutter\)/,
    );
  });
});
