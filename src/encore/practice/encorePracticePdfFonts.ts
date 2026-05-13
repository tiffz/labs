import fontkit from '@pdf-lib/fontkit';
import type { PDFDocument, PDFFont } from 'pdf-lib';

/**
 * Hinted TTFs from Noto’s distribution (Latin, Greek, Cyrillic, and more).
 * pdf-lib standard fonts are WinAnsi-only and throw on Cyrillic and most non‑Latin text.
 *
 * Use raw.githubusercontent.com (not jsDelivr): some environments return 403 / hang on gh CDN.
 *
 * @see https://github.com/googlefonts/noto-fonts
 */
const NOTO_REGULAR_TTF =
  'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf';
const NOTO_BOLD_TTF =
  'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Bold.ttf';

async function fetchFontBytes(url: string, label: string): Promise<Uint8Array> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 45_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(
        `PDF export could not load the ${label} font (HTTP ${res.status}). Check your network and try again.`,
      );
    }
    return new Uint8Array(await res.arrayBuffer());
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error(`PDF export timed out loading the ${label} font. Check your network and try again.`);
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

let regularBytesPromise: Promise<Uint8Array> | null = null;
let boldBytesPromise: Promise<Uint8Array> | null = null;

function getNotoSansRegularBytes(): Promise<Uint8Array> {
  if (!regularBytesPromise) {
    regularBytesPromise = fetchFontBytes(NOTO_REGULAR_TTF, 'Noto Sans Regular');
  }
  return regularBytesPromise;
}

function getNotoSansBoldBytes(): Promise<Uint8Array> {
  if (!boldBytesPromise) {
    boldBytesPromise = fetchFontBytes(NOTO_BOLD_TTF, 'Noto Sans Bold');
  }
  return boldBytesPromise;
}

/** Registers fontkit and embeds subset Noto Sans for Unicode body text (single weight). */
export async function embedPracticePdfBodyFont(pdf: PDFDocument): Promise<PDFFont> {
  pdf.registerFontkit(fontkit);
  const regular = await getNotoSansRegularBytes();
  return pdf.embedFont(regular, { subset: true });
}

/** Registers fontkit and embeds regular + bold Noto Sans for lyrics table exports. */
export async function embedPracticePdfLyricsFonts(
  pdf: PDFDocument,
): Promise<{ font: PDFFont; fontBold: PDFFont }> {
  pdf.registerFontkit(fontkit);
  const [regular, bold] = await Promise.all([getNotoSansRegularBytes(), getNotoSansBoldBytes()]);
  const [font, fontBold] = await Promise.all([
    pdf.embedFont(regular, { subset: true }),
    pdf.embedFont(bold, { subset: true }),
  ]);
  return { font, fontBold };
}
