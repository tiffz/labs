/**
 * Heuristic: material icon ligature names (e.g. "directions_run") are much wider when
 * rendered as plain text than when shaped as a single glyph. Used to avoid removing
 * `icons-pending` (and to gate visual baselines) before real icons have painted.
 *
 * Important: icons inside fixed-size flex buttons often report a **narrow**
 * getBoundingClientRect() even while ligature plaintext is still painting (flex
 * min-size / clipping), so we always confirm with an off-DOM measurement when the
 * in-layout box looks "glyph-sized".
 */

export function maxWidthForMaterialGlyph(fontSizePx: number, textLength: number): number {
  const len = Math.min(textLength, 24);
  return (
    fontSizePx * Math.min(2.55, Math.max(1.32, 0.92 + len * 0.11))
  );
}

function measureMaterialIconTextOffDom(el: HTMLElement, host: HTMLElement): number {
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
}

export function visibleMaterialIconsLookReady(root: Document | HTMLElement = document): boolean {
  const doc = root instanceof Document ? root : root.ownerDocument ?? document;
  const host = doc.body;
  if (!host) return true;

  const elements = Array.from(
    root.querySelectorAll<HTMLElement>('.material-symbols-outlined, .material-icons')
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
    const offDomW = measureMaterialIconTextOffDom(el, host);
    if (offDomW <= 0) return false;
    if (offDomW > maxW) return false;
  }

  return true;
}

/**
 * FOUC boxes often set `width`/`height` equal to `font-size` and then
 * `overflow: hidden`. Material Symbol ink routinely exceeds that em-box
 * (undo/redo/backspace/delete / settings gear), so the glyph looks "cropped"
 * even when the ligature has shaped correctly (width heuristic still passes).
 *
 * Also flags:
 * - `font-size` larger than the reserved box (unlayered Google 24px vs layered FOUC)
 * - button/chrome parents shorter than ~1.35× font-size (ink overflows into the border)
 * - ancestor `overflow: hidden` boxes sized to the icon (split-button halves)
 */
export function materialIconCssWouldClipInk(el: HTMLElement): boolean {
  const cs = getComputedStyle(el);
  const fs = Number.parseFloat(cs.fontSize || '0') || 0;
  const boxH = el.getBoundingClientRect().height;
  if (fs <= 0 || boxH <= 0) return false;

  // Glyph metrics larger than the reserved FOUC box (cascade-layer miss).
  if (fs > boxH + 1) return true;

  const overflowY = cs.overflowY || cs.overflow;
  if (
    (overflowY === 'hidden' || overflowY === 'clip') &&
    Math.abs(boxH - fs) <= 2
  ) {
    return true;
  }

  // Material Symbol ink is typically ~1.2× the em-box. A chrome button needs
  // ~1.5× font-size so ink clears a 2px border with a few px of optical padding.
  const CHROME_MIN_HEIGHT_RATIO = 1.5;
  let parent: HTMLElement | null = el.parentElement;
  while (parent && parent !== document.body) {
    const tag = parent.tagName;
    const role = parent.getAttribute('role');
    const isChrome =
      tag === 'BUTTON' ||
      role === 'button' ||
      parent.classList.contains('settings-button') ||
      parent.classList.contains('icon-button') ||
      parent.classList.contains('play-button') ||
      parent.classList.contains('stop-button') ||
      parent.classList.contains('labs-split-action-button__primary') ||
      parent.classList.contains('labs-split-action-button__menu');
    const pcs = getComputedStyle(parent);
    const pOverflow = pcs.overflowY || pcs.overflow;
    const pr = parent.getBoundingClientRect();
    if (pr.height > 0) {
      if (
        (pOverflow === 'hidden' || pOverflow === 'clip') &&
        (boxH > pr.height - 2 || pr.height < fs * 1.15)
      ) {
        return true;
      }
      if (isChrome && pr.height < fs * CHROME_MIN_HEIGHT_RATIO) {
        return true;
      }
    }
    if (isChrome) break;
    parent = parent.parentElement;
  }

  return false;
}

