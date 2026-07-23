/** VexFlow SMuFL fonts used for notation glyphs rendered as SVG `<text>`. */
export const VEXFLOW_NOTATION_FONTS = ['Bravura'] as const;

const VEXFLOW_FONT_CDN = 'https://cdn.jsdelivr.net/npm/@vexflow-fonts/';

const VEXFLOW_FONT_FILES: Record<string, string> = {
  Bravura: 'bravura/bravura.woff2',
  Academico: 'academico/academico.woff2',
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

  const path = VEXFLOW_FONT_FILES[fontName];
  if (!path) {
    throw new Error(`Unknown VexFlow font: ${fontName}`);
  }

  const response = await fetch(`${VEXFLOW_FONT_CDN}${path}`);
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
  const { VexFlow } = await import('vexflow');
  await VexFlow.loadFonts(...fontNames);
  VexFlow.setFonts(...fontNames);
  if (typeof document !== 'undefined' && document.fonts) {
    await document.fonts.ready;
  }
}
