import fontkit from '@pdf-lib/fontkit';
import type { PDFDocument, PDFFont } from 'pdf-lib';

/**
 * Hinted TTFs from Noto’s distribution (Latin, Greek, Cyrillic, and more).
 * pdf-lib standard fonts are WinAnsi-only and throw on Cyrillic and most non‑Latin text.
 *
 * @see https://github.com/notofonts/notofonts.github.io
 */
const NOTO_REGULAR_TTF =
  'https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io@main/fonts/NotoSans/hinted/ttf/NotoSans-Regular.ttf';
const NOTO_BOLD_TTF =
  'https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io@main/fonts/NotoSans/hinted/ttf/NotoSans-Bold.ttf';

async function fetchFontBytes(url: string, label: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `PDF export could not load the ${label} font (HTTP ${res.status}). Check your network and try again.`,
    );
  }
  return new Uint8Array(await res.arrayBuffer());
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
