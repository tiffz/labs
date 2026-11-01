import academicoUrl from '@vexflow-fonts/academico/academico.woff2?url';
import bravuraUrl from '@vexflow-fonts/bravura/bravura.woff2?url';

/** VexFlow SMuFL fonts used for notation glyphs rendered as SVG `<text>`. */
export const VEXFLOW_NOTATION_FONTS = ['Bravura'] as const;

/**
 * Served from this site, never from VexFlow's default CDN. `VexFlow.loadFonts` fetches from
 * cdn.jsdelivr.net, so a CDN outage dropped every notehead in the portfolio, and every e2e spec
 * that drew notation raced the CDN.
 */
const VEXFLOW_FONT_URLS: Record<string, string> = {
  Bravura: bravuraUrl,
  Academico: academicoUrl,
};

const fontDataUrlCache = new Map<string, string>();

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function fetchVexFlowFontDataUrl(fontName: string): Promise<string> {
  const cached = fontDataUrlCache.get(fontName);
  if (cached) {
    return cached;
  }

  const url = VEXFLOW_FONT_URLS[fontName];
  if (!url) {
    throw new Error(`Unknown VexFlow font: ${fontName}`);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch VexFlow font ${fontName}.`);
  }

  const dataUrl = `data:font/woff2;base64,${bytesToBase64(new Uint8Array(await response.arrayBuffer()))}`;
  fontDataUrlCache.set(fontName, dataUrl);
  return dataUrl;
}

export async function buildVexFlowSvgFontStyles(fontNames: readonly string[]): Promise<string> {
  const faces = await Promise.all(
    fontNames.map(async (name) => {
      const dataUrl = await fetchVexFlowFontDataUrl(name);
      return `@font-face{font-family:'${name}';src:url('${dataUrl}') format('woff2');font-display:block;}`;
    }),
  );
  return faces.join('');
}

export function injectSvgStyle(svg: SVGSVGElement, css: string): void {
  const ns = 'http://www.w3.org/2000/svg';
  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS(ns, 'defs');
    svg.insertBefore(defs, svg.firstChild);
  }

  const style = document.createElementNS(ns, 'style');
  style.setAttribute('type', 'text/css');
  style.textContent = css;
  defs.appendChild(style);
}

export async function ensureVexFlowFontsLoaded(
  fontNames: readonly string[] = VEXFLOW_NOTATION_FONTS,
): Promise<void> {
  const { Font, VexFlow } = await import('vexflow');
  await Promise.all(
    fontNames.map((name) => {
      const url = VEXFLOW_FONT_URLS[name];
      if (!url) throw new Error(`Unknown VexFlow font: ${name}`);
      return Font.load(name, url);
    }),
  );
  VexFlow.setFonts(...fontNames);
  if (typeof document !== 'undefined' && document.fonts) {
    await document.fonts.ready;
  }
}
