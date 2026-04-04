import 'material-symbols/outlined.css';
import '@fontsource/material-icons';
// Ensures `document.fonts` can satisfy the Noto Music check on every micro-app entrypoint.
import '@fontsource/noto-music';
import './materialIcons.css';
import { visibleMaterialIconsLookReady } from './materialIconGlyphReadiness';

let initialized = false;

export function initMaterialIconRuntime(): void {
  if (initialized) return;
  initialized = true;

  const startedAt = performance.now();
  const root = document.documentElement;
  root.classList.add('icons-pending');

  const markReady = () => {
    const apply = () => {
      root.classList.remove('icons-pending');
      root.classList.add('icons-ready');
      // Backward-compatible class used by some existing CSS selectors.
      root.classList.add('fonts-loaded');
    };
    // Wait two frames so first paint after dropping `icons-pending` uses shaped glyphs.
    requestAnimationFrame(() => {
      requestAnimationFrame(apply);
    });
  };

  if (!('fonts' in document) || !document.fonts) {
    markReady();
    return;
  }

  let settled = false;
  const settleOnce = () => {
    if (settled) return;
    settled = true;
    markReady();
  };

  const REQUIRED_FONTS = [
    '400 24px "Material Symbols Outlined"',
    '400 24px "Material Icons"',
    '400 20px "Material Symbols Outlined"',
    '400 20px "Material Icons"',
    '400 16px "Noto Music"',
    // Palette / theory UI uses 1.5rem (typically 24px) for `.note-symbol`.
    '400 24px "Noto Music"',
  ] as const;

  const areRequiredFontsReady = () => REQUIRED_FONTS.every((descriptor) => document.fonts.check(descriptor));
  const areLigaturesRendering = () => {
    const parent = document.body ?? document.documentElement;
    const shell = document.createElement('div');
    shell.style.position = 'fixed';
    shell.style.left = '-9999px';
    shell.style.top = '-9999px';
    shell.style.visibility = 'hidden';
    shell.style.pointerEvents = 'none';

    const shortProbe = document.createElement('span');
    shortProbe.textContent = 'pets';
    shortProbe.style.fontFamily = '"Material Symbols Outlined", "Material Icons", sans-serif';
    shortProbe.style.fontFeatureSettings = '"liga"';
    shortProbe.style.whiteSpace = 'nowrap';
    shortProbe.style.display = 'inline-block';
    shortProbe.style.fontSize = '24px';
    shortProbe.style.lineHeight = '1';

    const longProbe = document.createElement('span');
    longProbe.textContent = 'directions_run';
    longProbe.style.fontFamily = shortProbe.style.fontFamily;
    longProbe.style.fontFeatureSettings = shortProbe.style.fontFeatureSettings;
    longProbe.style.whiteSpace = shortProbe.style.whiteSpace;
    longProbe.style.display = shortProbe.style.display;
    longProbe.style.fontSize = shortProbe.style.fontSize;
    longProbe.style.lineHeight = shortProbe.style.lineHeight;

    shell.appendChild(shortProbe);
    shell.appendChild(longProbe);
    parent.appendChild(shell);

    const shortWidth = shortProbe.getBoundingClientRect().width;
    const longWidth = longProbe.getBoundingClientRect().width;
    const styles = window.getComputedStyle(shortProbe);
    const fontSize = Number.parseFloat(styles.fontSize || '24') || 24;
    const hasIconFamily = /Material Symbols Outlined|Material Icons/i.test(styles.fontFamily || '');

    parent.removeChild(shell);

    if (!hasIconFamily || shortWidth <= 0 || longWidth <= 0 || fontSize <= 0) return false;
    const longToShortRatio = longWidth / shortWidth;
    const shortToFontRatio = shortWidth / fontSize;
    // With ligatures active, both names render as single glyphs with similar widths.
    return longToShortRatio <= 1.6 && shortToFontRatio <= 1.8;
  };
  const anyIconNodeInDocument = () =>
    document.querySelector('.material-symbols-outlined, .material-icons') !== null;

  const canMarkReady = () => {
    if (!areRequiredFontsReady() || !areLigaturesRendering()) return false;
    // Yield a few frames so React (and other boot code) can mount real icon nodes.
    if (performance.now() - startedAt < 80) return false;
    if (!anyIconNodeInDocument()) {
      // No in-app material icon nodes yet (e.g. Cat Clicker empty Events tab). Do not inject
      // hidden probe spans with ligature names — that text shows up in DOM/a11y snapshots and
      // confuses PNG/text tooling. After ~1.2s + font checks, allow clearing `icons-pending`.
      return performance.now() - startedAt > 1200;
    }
    return visibleMaterialIconsLookReady(document);
  };

  void Promise.all(REQUIRED_FONTS.map((descriptor) => document.fonts.load(descriptor)))
    .then(() => {
      if (canMarkReady()) settleOnce();
    })
    .catch(() => {
      // Keep pending until readiness poll resolves.
    });

  const pollInterval = window.setInterval(() => {
    if (settled) {
      window.clearInterval(pollInterval);
      return;
    }
    if (canMarkReady()) {
      window.clearInterval(pollInterval);
      settleOnce();
    }
  }, 100);

  window.setTimeout(() => {
    if (settled) return;
    // Never force-ready if ligatures are not rendering; keep pending to avoid FOUC text.
    if (canMarkReady()) {
      window.clearInterval(pollInterval);
      settleOnce();
    }
  }, 10000);
}
