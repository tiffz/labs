import { expect, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type VisualRouteSpec = {
  id: string;
  route: string;
  title: RegExp;
  readySelector: string;
};

const BLOCKED_EXTERNAL_REGEX = /google-analytics|googletagmanager|fonts\.googleapis|fonts\.gstatic/;
const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(CURRENT_DIR, '../..');

const FONT_FILE_BYTES: Record<string, Buffer> = {
  'material-symbols-outlined.woff2': readFileSync(
    path.join(
      WORKSPACE_ROOT,
      'node_modules/material-symbols/material-symbols-outlined.woff2'
    )
  ),
  'material-icons-regular.woff2': readFileSync(
    path.join(
      WORKSPACE_ROOT,
      'node_modules/@fontsource/material-icons/files/material-icons-latin-400-normal.woff2'
    )
  ),
  'inter-latin-400-normal.woff2': readFileSync(
    path.join(WORKSPACE_ROOT, 'node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2')
  ),
  'inter-latin-500-normal.woff2': readFileSync(
    path.join(WORKSPACE_ROOT, 'node_modules/@fontsource/inter/files/inter-latin-500-normal.woff2')
  ),
  'inter-latin-600-normal.woff2': readFileSync(
    path.join(WORKSPACE_ROOT, 'node_modules/@fontsource/inter/files/inter-latin-600-normal.woff2')
  ),
  'inter-latin-700-normal.woff2': readFileSync(
    path.join(WORKSPACE_ROOT, 'node_modules/@fontsource/inter/files/inter-latin-700-normal.woff2')
  ),
  'caveat-latin-400-normal.woff2': readFileSync(
    path.join(WORKSPACE_ROOT, 'node_modules/@fontsource/caveat/files/caveat-latin-400-normal.woff2')
  ),
  'caveat-latin-700-normal.woff2': readFileSync(
    path.join(WORKSPACE_ROOT, 'node_modules/@fontsource/caveat/files/caveat-latin-700-normal.woff2')
  ),
  'roboto-latin-300-normal.woff2': readFileSync(
    path.join(WORKSPACE_ROOT, 'node_modules/@fontsource/roboto/files/roboto-latin-300-normal.woff2')
  ),
  'roboto-latin-400-normal.woff2': readFileSync(
    path.join(WORKSPACE_ROOT, 'node_modules/@fontsource/roboto/files/roboto-latin-400-normal.woff2')
  ),
  'roboto-latin-500-normal.woff2': readFileSync(
    path.join(WORKSPACE_ROOT, 'node_modules/@fontsource/roboto/files/roboto-latin-500-normal.woff2')
  ),
  'roboto-latin-700-normal.woff2': readFileSync(
    path.join(WORKSPACE_ROOT, 'node_modules/@fontsource/roboto/files/roboto-latin-700-normal.woff2')
  ),
  'noto-music-music-400-normal.woff2': readFileSync(
    path.join(
      WORKSPACE_ROOT,
      'node_modules/@fontsource/noto-music/files/noto-music-music-400-normal.woff2'
    )
  ),
};

const LOCAL_GOOGLE_FONTS_CSS = `
@font-face { font-family: 'Roboto'; font-style: normal; font-display: swap; font-weight: 300; src: url('https://fonts.gstatic.com/labs-local/roboto-latin-300-normal.woff2') format('woff2'); }
@font-face { font-family: 'Roboto'; font-style: normal; font-display: swap; font-weight: 400; src: url('https://fonts.gstatic.com/labs-local/roboto-latin-400-normal.woff2') format('woff2'); }
@font-face { font-family: 'Roboto'; font-style: normal; font-display: swap; font-weight: 500; src: url('https://fonts.gstatic.com/labs-local/roboto-latin-500-normal.woff2') format('woff2'); }
@font-face { font-family: 'Roboto'; font-style: normal; font-display: swap; font-weight: 700; src: url('https://fonts.gstatic.com/labs-local/roboto-latin-700-normal.woff2') format('woff2'); }
@font-face { font-family: 'Inter'; font-style: normal; font-display: swap; font-weight: 400; src: url('https://fonts.gstatic.com/labs-local/inter-latin-400-normal.woff2') format('woff2'); }
@font-face { font-family: 'Inter'; font-style: normal; font-display: swap; font-weight: 500; src: url('https://fonts.gstatic.com/labs-local/inter-latin-500-normal.woff2') format('woff2'); }
@font-face { font-family: 'Inter'; font-style: normal; font-display: swap; font-weight: 600; src: url('https://fonts.gstatic.com/labs-local/inter-latin-600-normal.woff2') format('woff2'); }
@font-face { font-family: 'Inter'; font-style: normal; font-display: swap; font-weight: 700; src: url('https://fonts.gstatic.com/labs-local/inter-latin-700-normal.woff2') format('woff2'); }
@font-face { font-family: 'Caveat'; font-style: normal; font-display: swap; font-weight: 400; src: url('https://fonts.gstatic.com/labs-local/caveat-latin-400-normal.woff2') format('woff2'); }
@font-face { font-family: 'Caveat'; font-style: normal; font-display: swap; font-weight: 700; src: url('https://fonts.gstatic.com/labs-local/caveat-latin-700-normal.woff2') format('woff2'); }
@font-face { font-family: 'Material Symbols Outlined'; font-style: normal; font-display: block; font-weight: 100 700; src: url('https://fonts.gstatic.com/labs-local/material-symbols-outlined.woff2') format('woff2'); }
@font-face { font-family: 'Material Icons'; font-style: normal; font-display: block; font-weight: 400; src: url('https://fonts.gstatic.com/labs-local/material-icons-regular.woff2') format('woff2'); }
@font-face { font-family: 'Noto Music'; font-style: normal; font-display: block; font-weight: 400; src: url('https://fonts.gstatic.com/labs-local/noto-music-music-400-normal.woff2') format('woff2'); }
.material-symbols-outlined {
  font-family: "Material Symbols Outlined";
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  font-feature-settings: "liga";
}
.material-icons {
  font-family: "Material Icons";
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  font-feature-settings: "liga";
}
`;

export async function configureDeterministicBrowserState(page: Page): Promise<void> {
  await page.addInitScript(() => {
    type E2EWindow = Window & {
      __E2E__?: boolean;
      labsAnalyticsInitialized?: boolean;
      gtag?: (...args: unknown[]) => void;
    };
    const win = window as unknown as E2EWindow;
    win.__E2E__ = true;
    win.labsAnalyticsInitialized = true;
    win.gtag = () => {};
    // Force deterministic RNG for apps that randomize initial state on boot.
    let seed = 123456789;
    Math.random = () => {
      seed += 0x6d2b79f5;
      let t = Math.imul(seed ^ (seed >>> 15), seed | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const injectStabilityStyles = () => {
      const style = document.createElement('style');
      style.innerHTML = `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
          caret-color: transparent !important;
        }
      `;
      const root = document.head ?? document.documentElement;
      root?.appendChild(style);
    };

    if (document.head || document.documentElement) {
      injectStabilityStyles();
    } else {
      document.addEventListener('DOMContentLoaded', injectStabilityStyles, { once: true });
    }
  });

  await page.route('**/*googletagmanager.com/**', route =>
    route.fulfill({ status: 204, contentType: 'text/plain', body: '' })
  );
  await page.route('**/*google-analytics.com/**', route =>
    route.fulfill({ status: 204, contentType: 'text/plain', body: '' })
  );
  await page.route('**/*fonts.googleapis.com/**', route =>
    route.fulfill({
      status: 200,
      contentType: 'text/css',
      body: LOCAL_GOOGLE_FONTS_CSS,
    })
  );
  await page.route('**/*fonts.gstatic.com/**', route => {
    const url = route.request().url();
    const fileName = url.split('/').pop() || '';
    const bytes = FONT_FILE_BYTES[fileName];
    if (!bytes) {
      return route.fulfill({ status: 404, contentType: 'text/plain', body: '' });
    }
    return route.fulfill({ status: 200, contentType: 'font/woff2', body: bytes });
  });
  await page.route('**/scripts/analytics.js', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: 'window.__E2E__=true;window.labsAnalyticsInitialized=true;window.gtag=function(){};',
    })
  );
  await page.route('**/__debug_log', route => route.fulfill({ status: 204 }));
  await page.route('**/__debug_snapshot', route => route.fulfill({ status: 204 }));
}

/** Prime common webfont faces (matches apps using Roboto / Inter / Caveat / Material). */
async function primeDocumentFontFaces(page: Page): Promise<void> {
  await page.evaluate(async () => {
    if (!('fonts' in document)) return;
    const fonts = (document as Document & { fonts: FontFaceSet }).fonts;
    try {
      await fonts.ready;
      await Promise.all([
        fonts.load('400 16px Roboto'),
        fonts.load('400 16px Inter'),
        fonts.load('400 16px Caveat'),
        fonts.load('400 24px "Material Symbols Outlined"'),
        fonts.load('400 24px "Material Icons"'),
        fonts.load('400 20px "Material Symbols Outlined"'),
        fonts.load('400 20px "Material Icons"'),
        fonts.load('400 18px "Material Symbols Outlined"'),
        fonts.load('400 18px "Material Icons"'),
        fonts.load('400 48px "Material Symbols Outlined"'),
        fonts.load('400 48px "Material Icons"'),
        fonts.load('400 14px "Material Symbols Outlined"'),
        fonts.load('400 14px "Material Icons"'),
        fonts.load('400 16px "Noto Music"'),
        fonts.load('400 18px "Noto Music"'),
        fonts.load('400 20px "Noto Music"'),
        fonts.load('400 24px "Noto Music"'),
      ]);
    } catch {
      // Use fallbacks if any custom font fails; visual assertions will still catch regressions.
    }
  });
}

/**
 * Always wait for `icons-pending` to clear (see `materialIconsBootstrap`).
 * Do not short-circuit when no material icon nodes are visible yet (e.g. Cat Clicker Events tab):
 * returning early used to race ahead before fonts finished loading, leaving ligature text in later paints.
 */
async function waitForBootstrapIconsPendingCleared(page: Page): Promise<void> {
  await page.waitForFunction(
    () => !document.documentElement.classList.contains('icons-pending'),
    undefined,
    { timeout: 12_000 }
  );
  await page.waitForTimeout(300);
  await page.waitForFunction(
    () => !document.documentElement.classList.contains('icons-pending'),
    undefined,
    { timeout: 3000 }
  );
}

async function loadComputedFontsForVisibleMaterialIcons(page: Page): Promise<void> {
  await page.evaluate(async () => {
    if (!('fonts' in document)) return;
    const doc = document as Document & { fonts: FontFaceSet };
    try {
      await doc.fonts.ready;
      const elements = Array.from(
        document.querySelectorAll<HTMLElement>('.material-symbols-outlined, .material-icons')
      ).filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      await Promise.all(
        elements.map((el) => {
          const s = getComputedStyle(el);
          const primary = (s.fontFamily || '')
            .split(',')[0]
            ?.replace(/["']/g, '')
            .trim();
          if (!primary) return Promise.resolve();
          const spec = `${s.fontWeight || '400'} ${s.fontSize} ${primary}`;
          return doc.fonts.load(spec).catch(() => undefined);
        })
      );
      await doc.fonts.ready;
    } catch {
      // ignore
    }
  });
}

/** Noto Music (e.g. drums/piano `.note-symbol`) — same pattern as material icons, not covered by ligature width checks. */
async function loadComputedFontsForVisibleNoteSymbols(page: Page): Promise<void> {
  await page.evaluate(async () => {
    if (!('fonts' in document)) return;
    const doc = document as Document & { fonts: FontFaceSet };
    try {
      await doc.fonts.ready;
      const elements = Array.from(document.querySelectorAll<HTMLElement>('.note-symbol')).filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      await Promise.all(
        elements.map((el) => {
          const s = getComputedStyle(el);
          const primary = (s.fontFamily || '')
            .split(',')[0]
            ?.replace(/["']/g, '')
            .trim();
          if (!primary) return Promise.resolve();
          const spec = `${s.fontWeight || '400'} ${s.fontSize} ${primary}`;
          return doc.fonts.load(spec).catch(() => undefined);
        })
      );
      await doc.fonts.ready;
    } catch {
      // ignore
    }
  });
}

async function waitForDocumentImagesIdle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await Promise.all(
      Array.from(document.images).map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.addEventListener('load', () => resolve(), { once: true });
              img.addEventListener('error', () => resolve(), { once: true });
            })
      )
    );
  });
}

/**
 * Full-page scroll tour so below-the-fold UI (and any lazy observers) mounts before capture.
 * Ends at scrollY=0 so behavior matches a fresh visit for fixed headers.
 */
async function scrollDocumentForFullPagePaint(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const scrollHeight =
      document.documentElement.scrollHeight ||
      (document.body && document.body.scrollHeight) ||
      0;
    const viewport = window.innerHeight || 600;
    const step = Math.max(240, Math.floor(viewport * 0.72));
    for (let y = 0; y < scrollHeight; y += step) {
      window.scrollTo(0, y);
      await delay(40);
    }
    window.scrollTo(0, Math.max(0, scrollHeight - 1));
    await delay(60);
    window.scrollTo(0, 0);
    await delay(40);
  });
}

/** Same heuristic as `src/shared/ui/icons/materialIconGlyphReadiness.ts` (in-browser). */
async function waitForVisibleMaterialGlyphsShaped(page: Page, timeoutMs: number): Promise<void> {
  await page.waitForFunction(() => {
    const host = document.body;
    if (!host) return true;
    const maxWidthForMaterialGlyph = (fontSizePx: number, textLength: number) => {
      const len = Math.min(textLength, 24);
      return fontSizePx * Math.min(2.55, Math.max(1.32, 0.92 + len * 0.11));
    };
    const measureOffDom = (el: HTMLElement) => {
      const text = el.textContent?.trim() ?? '';
      if (text.length < 2) return 0;
      const cs = getComputedStyle(el);
      const shell = document.createElement('div');
      shell.setAttribute('aria-hidden', 'true');
      shell.style.cssText =
        'position:fixed;left:-9999px;top:0;visibility:hidden;pointer-events:none;contain:layout';
      const probe = document.createElement('span');
      probe.setAttribute('data-labs-material-icon-probe', '1');
      probe.textContent = text;
      probe.style.fontFamily = cs.fontFamily;
      probe.style.fontSize = cs.fontSize;
      probe.style.fontWeight = cs.fontWeight;
      probe.style.fontStyle = cs.fontStyle;
      probe.style.fontFeatureSettings = cs.fontFeatureSettings;
      probe.style.fontVariationSettings = cs.fontVariationSettings;
      probe.style.letterSpacing = cs.letterSpacing;
      probe.style.whiteSpace = 'nowrap';
      probe.style.display = 'inline-block';
      probe.style.lineHeight = cs.lineHeight || '1';
      shell.appendChild(probe);
      host.appendChild(shell);
      const w = probe.getBoundingClientRect().width;
      host.removeChild(shell);
      return w;
    };
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>('.material-symbols-outlined, .material-icons')
    ).filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    if (elements.length === 0) return true;
    for (const el of elements) {
      const text = el.textContent?.trim() ?? '';
      if (text.length < 2) continue;
      const fs = Number.parseFloat(getComputedStyle(el).fontSize || '24') || 24;
      if (fs <= 0) continue;
      const maxW = maxWidthForMaterialGlyph(fs, text.length);
      const offDomW = measureOffDom(el);
      if (offDomW <= 0) return false;
      if (offDomW > maxW) return false;
    }
    return true;
  }, undefined, { timeout: timeoutMs });
}

export async function stabilizeFontsAndMaterialGlyphs(
  page: Page,
  options: { glyphTimeoutMs: number }
): Promise<void> {
  await waitForDocumentImagesIdle(page);
  await primeDocumentFontFaces(page);
  await waitForBootstrapIconsPendingCleared(page);
  await loadComputedFontsForVisibleMaterialIcons(page);
  await loadComputedFontsForVisibleNoteSymbols(page);
  await waitForVisibleMaterialGlyphsShaped(page, options.glyphTimeoutMs);
}

async function finalizeVisualStabilizationAfterScroll(page: Page): Promise<void> {
  await scrollDocumentForFullPagePaint(page);
  await page.evaluate(async () => {
    if (!('fonts' in document)) return;
    await (document as Document & { fonts: FontFaceSet }).fonts.ready;
  });
  await waitForDocumentImagesIdle(page);
  await loadComputedFontsForVisibleMaterialIcons(page);
  await loadComputedFontsForVisibleNoteSymbols(page);
  await waitForVisibleMaterialGlyphsShaped(page, 22_000);

  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      })
  );
  await page.waitForTimeout(120);
}

async function clickCatsSidePanelTab(page: Page, label: string): Promise<void> {
  const tab = page.getByRole('button', { name: label, exact: true });
  await tab.scrollIntoViewIfNeeded();
  await tab.click();
}

/**
 * Cat Clicker mounts Material icons only inside inactive tabs. Visit each tab so ligatures shape
 * while `icons-pending` is already false, then return to Events before screenshot.
 */
export async function warmUpCatsTabbedPanelMaterialFonts(page: Page): Promise<void> {
  await page.locator('.tabbed-panel .tab-headers').scrollIntoViewIfNeeded();

  for (const label of ['Jobs', 'Things', 'Merits'] as const) {
    await clickCatsSidePanelTab(page, label);
    await stabilizeFontsAndMaterialGlyphs(page, { glyphTimeoutMs: 15_000 });
  }
  await clickCatsSidePanelTab(page, 'Events');
  await stabilizeFontsAndMaterialGlyphs(page, { glyphTimeoutMs: 15_000 });
  await finalizeVisualStabilizationAfterScroll(page);

  // Bottom controls use inline SVG paths (not icon fonts). Wait until paths are in the DOM
  // with real geometry so full-page screenshots don't catch a pre-layout frame.
  await page.waitForFunction(
    () => {
      const paths = document.querySelectorAll('.bottom-controls .bottom-control-svg path');
      if (paths.length < 3) return false;
      return Array.from(paths).every((p) => (p.getAttribute('d') || '').length > 30);
    },
    undefined,
    { timeout: 10_000 }
  );
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      })
  );
  await page.waitForTimeout(150);
}

export async function waitForVisualReady(page: Page, spec: VisualRouteSpec): Promise<Locator> {
  await expect(page).toHaveTitle(spec.title);
  const root = page.locator(spec.readySelector);
  await expect(root).toBeVisible();

  // Pass 1: above-the-fold (initial route mount).
  await stabilizeFontsAndMaterialGlyphs(page, { glyphTimeoutMs: 15_000 });

  // Pass 2: full-page scroll exposes lazy / below-fold icon nodes, then re-check glyphs.
  await finalizeVisualStabilizationAfterScroll(page);

  return root;
}

export function shouldIgnoreRequestFailure(url: string): boolean {
  return BLOCKED_EXTERNAL_REGEX.test(url);
}
