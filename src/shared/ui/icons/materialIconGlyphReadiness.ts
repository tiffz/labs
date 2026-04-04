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
