import type { PDFFont } from 'pdf-lib';
import type {
  EncoreLyricsExerciseSection,
  EncoreLyricsInOwnWordsExerciseRun,
  EncorePracticeExerciseRun,
  EncoreSong,
} from '../types';
import {
  ENCORE_CHARACTER_NINE_QUESTION_TITLES,
  ENCORE_PRACTICE_EXERCISE_CATALOG,
  characterNineAnswerToEditorHtml,
  effectiveLyricsSections,
  lyricsExerciseSectionExportHeading,
  parseGeniusLyricsIntoSections,
} from './encorePracticeExerciseModel';
import { sanitizeTextForGoogleDocsInsert } from './googleDocsTextSanitize';

export { sanitizeTextForGoogleDocsInsert } from './googleDocsTextSanitize';
const EXERCISE_FILE_SLUG: Record<EncorePracticeExerciseRun['kind'], string> = {
  lyricsInOwnWords: 'lyrics-in-your-own-words',
  lyricsSectionNarrative: 'section-by-section',
  characterNineQuestions: 'nine-character-questions',
};

function stripHtmlTagsIteratively(value: string): string {
  let s = value;
  let prev = '';
  while (s !== prev) {
    prev = s;
    s = s.replace(/<[^>]*>/g, '');
  }
  return s;
}

export function stripHtmlToPlainText(html: string): string {
  const t = html.trim();
  if (!t) return '';
  if (typeof DOMParser === 'undefined') {
    const withBreaks = t.replace(/<\/(p|div|br)[^>]*>/gi, '\n');
    return stripHtmlTagsIteratively(withBreaks)
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
  const doc = new DOMParser().parseFromString(`<div>${t}</div>`, 'text/html');
  const text = doc.body.textContent ?? '';
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

function sectionSourceBodyText(sec: EncoreLyricsExerciseSection | undefined): string {
  if (!sec?.lines?.length) return '';
  return sec.lines.map((l) => l.original).join('\n');
}

function exerciseKindLabel(kind: EncorePracticeExerciseRun['kind']): string {
  return ENCORE_PRACTICE_EXERCISE_CATALOG[kind].title;
}

/** One visual row in the lyrics side-by-side export (Google Doc table + PDF). */
export type LyricsRewriteExportTableRow =
  | { kind: 'columnLabels' }
  | { kind: 'sectionHeader'; title: string }
  | { kind: 'lyricPair'; original: string; rewrite: string };

/** Preamble + table rows for “lyrics in your own words” (original | rewrite aligned per row). */
export function buildLyricsInOwnWordsExportTable(
  song: EncoreSong,
  run: EncoreLyricsInOwnWordsExerciseRun,
): { preamble: string; tableRows: LyricsRewriteExportTableRow[] } {
  const title = `${song.title} — ${song.artist}`.trim();
  const preamble = [
    `Song: ${title}`,
    `Exercise: ${exerciseKindLabel('lyricsInOwnWords')}`,
    `Status: ${run.status === 'completed' ? 'Completed' : 'Draft'}`,
    `Updated (UTC): ${run.updatedAt}`,
    '',
  ].join('\n');

  const tableRows: LyricsRewriteExportTableRow[] = [{ kind: 'columnLabels' }];
  const secs = effectiveLyricsSections(run);
  secs.forEach((sec, idx) => {
    const head = lyricsExerciseSectionExportHeading(sec, idx, secs.length);
    tableRows.push({ kind: 'sectionHeader', title: head });
    for (const line of sec.lines) {
      tableRows.push({
        kind: 'lyricPair',
        original: line.original,
        rewrite: line.rewrite.trim() ? line.rewrite : '(empty)',
      });
    }
  });
  return { preamble, tableRows };
}

/** UTF-16 half-open ranges into `text` for `updateTextStyle` (Google Doc indices match JS string units). */
export type GoogleDocBoldSpan = { start: number; end: number };

/**
 * Two short body lines before the lyrics table. Status and dates stay on the Drive file name
 * (`[Lyrics rephrase] …`) — not repeated in the document body.
 */
export function buildLyricsInOwnWordsGoogleDocPreambleLines(song: EncoreSong): [string, string] {
  const line1Raw = `${song.title} — ${song.artist}`.trim();
  const max = 200;
  const line1 = line1Raw.length > max ? `${line1Raw.slice(0, max - 1)}…` : line1Raw;
  const line2 = exerciseKindLabel('lyricsInOwnWords');
  return [line1, line2];
}

/**
 * Lyrics-in-own-words layout for **Google Docs**: one table row, two tall cells, newline-aligned
 * columns (original vs rewrite). Bold spans apply after per-line `sanitizeTextForGoogleDocsInsert`.
 */
export function buildLyricsInOwnWordsGoogleDocLayout(
  song: EncoreSong,
  run: EncoreLyricsInOwnWordsExerciseRun,
): {
  /** Sanitized two lines plus a trailing `\n` so the following table never shares a paragraph. */
  preamble: string;
  leftCell: string;
  rightCell: string;
  leftBold: GoogleDocBoldSpan[];
  rightBold: GoogleDocBoldSpan[];
} {
  const { tableRows } = buildLyricsInOwnWordsExportTable(song, run);
  const [p1, p2] = buildLyricsInOwnWordsGoogleDocPreambleLines(song);
  const preamble = `${[p1, p2].map((ln) => sanitizeTextForGoogleDocsInsert(ln)).join('\n')}\n`;

  const linesL: string[] = [];
  const linesR: string[] = [];
  const boldLLine = new Set<number>();
  const boldRLine = new Set<number>();

  const pushPair = (l: string, r: string, boldLeftLine: boolean, boldRightLine: boolean) => {
    const i = linesL.length;
    linesL.push(l);
    linesR.push(r);
    if (boldLeftLine) boldLLine.add(i);
    if (boldRightLine) boldRLine.add(i);
  };

  pushPair('Original', 'Rewrite (your words)', true, true);
  pushPair('', '', false, false);

  let needSectionGap = false;
  for (const row of tableRows) {
    if (row.kind === 'columnLabels') continue;
    if (row.kind === 'sectionHeader') {
      if (needSectionGap) {
        pushPair('', '', false, false);
        pushPair('', '', false, false);
      }
      pushPair(row.title, row.title, true, true);
      needSectionGap = false;
      continue;
    }
    needSectionGap = true;
    pushPair(row.original, row.rewrite.trim() ? row.rewrite : '(empty)', false, false);
  }

  const safeL = linesL.map((ln) => sanitizeTextForGoogleDocsInsert(ln));
  const safeR = linesR.map((ln) => sanitizeTextForGoogleDocsInsert(ln));

  const joinStarts = (lines: string[]): number[] => {
    const starts: number[] = [];
    let acc = 0;
    for (let i = 0; i < lines.length; i += 1) {
      starts.push(acc);
      acc += lines[i]!.length;
      if (i + 1 < lines.length) acc += 1;
    }
    return starts;
  };
  const startsL = joinStarts(safeL);
  const startsR = joinStarts(safeR);

  const leftBold: GoogleDocBoldSpan[] = [];
  const rightBold: GoogleDocBoldSpan[] = [];
  for (let i = 0; i < safeL.length; i += 1) {
    if (boldLLine.has(i) && safeL[i]!.length > 0) {
      leftBold.push({ start: startsL[i]!, end: startsL[i]! + safeL[i]!.length });
    }
    if (boldRLine.has(i) && safeR[i]!.length > 0) {
      rightBold.push({ start: startsR[i]!, end: startsR[i]! + safeR[i]!.length });
    }
  }

  const leftCell = safeL.join('\n');
  const rightCell = safeR.join('\n');

  return {
    preamble,
    leftCell,
    rightCell,
    leftBold,
    rightBold,
  };
}

export function buildPracticeExerciseExportPlainText(song: EncoreSong, run: EncorePracticeExerciseRun): string {
  const lines: string[] = [];
  const title = `${song.title} — ${song.artist}`.trim();
  lines.push(`Song: ${title}`);
  lines.push(`Exercise: ${exerciseKindLabel(run.kind)}`);
  lines.push(`Status: ${run.status === 'completed' ? 'Completed' : 'Draft'}`);
  lines.push(`Updated (UTC): ${run.updatedAt}`);
  lines.push('');
  lines.push('─'.repeat(48));
  lines.push('');

  if (run.kind === 'lyricsInOwnWords') {
    const secs = effectiveLyricsSections(run);
    secs.forEach((sec, idx) => {
      lines.push(lyricsExerciseSectionExportHeading(sec, idx, secs.length));
      lines.push('');
      for (const line of sec.lines) {
        lines.push(`Original: ${line.original}`);
        lines.push(`Rewrite: ${line.rewrite || '(empty)'}`);
        lines.push('');
      }
    });
  } else if (run.kind === 'lyricsSectionNarrative') {
    const parsed = parseGeniusLyricsIntoSections(song.lyricsSourceGenius?.trim() ?? '');
    run.sections.forEach((sec, i) => {
      // Narrative sections carry `{title, narrative}` but the heading helper only needs a `title`
      // (it ignores `lines`); pass an empty lines array purely to satisfy the section shape.
      lines.push(
        lyricsExerciseSectionExportHeading({ title: sec.title, lines: [] }, i, run.sections.length),
      );
      lines.push('');
      const src = sectionSourceBodyText(parsed[i]);
      lines.push(src ? `Source lyrics:\n${src}` : '(No matching source lines for this section.)');
      lines.push('');
      lines.push(
        `Notes:\n${stripHtmlToPlainText(characterNineAnswerToEditorHtml(sec.narrative)) || '(empty)'}`,
      );
      lines.push('');
    });
  } else {
    ENCORE_CHARACTER_NINE_QUESTION_TITLES.forEach((q, i) => {
      const raw = run.answers[i] ?? '';
      lines.push(q);
      lines.push(stripHtmlToPlainText(characterNineAnswerToEditorHtml(raw)) || '(empty)');
      lines.push('');
    });
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

export function sanitizePracticeExportFileStem(s: string): string {
  return s
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'Song';
}

export function practiceExercisePdfBaseName(song: EncoreSong, run: EncorePracticeExerciseRun): string {
  const songStem = sanitizePracticeExportFileStem(`${song.title} — ${song.artist}`);
  const slug = EXERCISE_FILE_SLUG[run.kind];
  return `Encore practice — ${songStem} — ${slug}.pdf`;
}

/** Title for the Google Doc export (no file extension). */
export function practiceExerciseGoogleDocTitle(song: EncoreSong, run: EncorePracticeExerciseRun): string {
  if (run.kind === 'lyricsInOwnWords') {
    const songPart = sanitizePracticeExportFileStem(`${song.title} - ${song.artist}`);
    return `[Lyrics rephrase] ${songPart}`.trim();
  }
  const songStem = sanitizePracticeExportFileStem(`${song.title} — ${song.artist}`);
  const slug = EXERCISE_FILE_SLUG[run.kind];
  return `Encore practice — ${songStem} — ${slug}`;
}

function wrapToWidth(text: string, maxWidth: number, font: PDFFont, size: number): string[] {
  const out: string[] = [];
  for (const rawPara of text.split(/\r?\n/)) {
    const para = rawPara.trimEnd();
    if (!para) {
      out.push('');
      continue;
    }
    const words = para.split(/\s+/);
    let line = '';
    for (const w of words) {
      const trial = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(trial, size) <= maxWidth) line = trial;
      else {
        if (line) out.push(line);
        let chunk = w;
        while (chunk.length > 0 && font.widthOfTextAtSize(chunk, size) > maxWidth) {
          let low = 1;
          let hi = chunk.length;
          while (low < hi) {
            const mid = Math.ceil((low + hi) / 2);
            const sub = chunk.slice(0, mid);
            if (font.widthOfTextAtSize(sub, size) <= maxWidth) low = mid;
            else hi = mid - 1;
          }
          const take = Math.max(1, low);
          out.push(chunk.slice(0, take));
          chunk = chunk.slice(take);
        }
        line = chunk;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

async function buildLyricsInOwnWordsPdfBytes(
  song: EncoreSong,
  run: EncoreLyricsInOwnWordsExerciseRun,
): Promise<Uint8Array> {
  const { PDFDocument, rgb } = await import('pdf-lib');
  const { embedPracticePdfLyricsFonts } = await import('./encorePracticePdfFonts');
  const { preamble, tableRows } = buildLyricsInOwnWordsExportTable(song, run);
  const pdf = await PDFDocument.create();
  const { font, fontBold } = await embedPracticePdfLyricsFonts(pdf);
  const pageWidth = 792;
  const pageHeight = 612;
  const margin = 40;
  const colGap = 20;
  const fullW = pageWidth - 2 * margin;
  const colW = (fullW - colGap) / 2;
  const leftX = margin;
  const rightX = margin + colW + colGap;
  const size = 9;
  const lineHeight = size * 1.35;
  const color = rgb(0.12, 0.12, 0.16);
  const faint = rgb(0.38, 0.38, 0.44);

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const newPage = () => {
    page = pdf.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
  };

  const ensureSpace = (minHeight: number) => {
    if (y < margin + minHeight) newPage();
  };

  for (const ln of wrapToWidth(preamble.trimEnd(), fullW, font, size)) {
    ensureSpace(lineHeight);
    page.drawText(ln || ' ', { x: margin, y: y - size, size, font, color });
    y -= lineHeight;
  }
  y -= lineHeight * 0.35;

  for (const row of tableRows) {
    if (row.kind === 'columnLabels') {
      ensureSpace(lineHeight + 6);
      page.drawText('Original', { x: leftX, y: y - size, size, font: fontBold, color });
      page.drawText('Rewrite (your words)', {
        x: rightX,
        y: y - size,
        size,
        font: fontBold,
        color,
      });
      y -= lineHeight + 8;
      continue;
    }
    if (row.kind === 'sectionHeader') {
      const lines = wrapToWidth(row.title, fullW, fontBold, size + 0.5);
      const blockH = Math.max(1, lines.length) * lineHeight + 6;
      ensureSpace(blockH);
      for (const ln of lines) {
        page.drawText(ln || ' ', {
          x: leftX,
          y: y - (size + 0.5),
          size: size + 0.5,
          font: fontBold,
          color,
        });
        y -= lineHeight;
      }
      y -= 4;
      continue;
    }
    const leftLines = wrapToWidth(row.original, colW, font, size);
    const rightLines = wrapToWidth(row.rewrite, colW, font, size);
    const n = Math.max(leftLines.length, rightLines.length, 1);
    const blockH = n * lineHeight + 8;
    ensureSpace(blockH);
    const rewriteMuted = row.rewrite === '(empty)';
    let lineY = y;
    for (let i = 0; i < n; i += 1) {
      page.drawText(leftLines[i] ?? ' ', {
        x: leftX,
        y: lineY - size,
        size,
        font,
        color,
      });
      page.drawText(rightLines[i] ?? ' ', {
        x: rightX,
        y: lineY - size,
        size,
        font,
        color: rewriteMuted ? faint : color,
      });
      lineY -= lineHeight;
    }
    y = lineY - 4;
  }

  return pdf.save();
}

export async function buildPracticeExercisePdfBytes(
  song: EncoreSong,
  run: EncorePracticeExerciseRun,
): Promise<Uint8Array> {
  if (run.kind === 'lyricsInOwnWords') {
    return buildLyricsInOwnWordsPdfBytes(song, run);
  }

  const { PDFDocument, rgb } = await import('pdf-lib');
  const { embedPracticePdfBodyFont } = await import('./encorePracticePdfFonts');
  const body = buildPracticeExerciseExportPlainText(song, run);
  const pdf = await PDFDocument.create();
  const font = await embedPracticePdfBodyFont(pdf);
  const size = 10;
  const lineHeight = size * 1.35;
  const margin = 48;
  const pageWidth = 612;
  const pageHeight = 792;
  const maxW = pageWidth - 2 * margin;

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const wrapLines = wrapToWidth(body, maxW, font, size);
  for (const ln of wrapLines) {
    if (y < margin + lineHeight) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    page.drawText(ln || ' ', {
      x: margin,
      y: y - size,
      size,
      font,
      color: rgb(0.12, 0.12, 0.16),
    });
    y -= lineHeight;
  }

  return pdf.save();
}

function downloadUint8ArrayAsFile(data: Uint8Array, filename: string): void {
  const blob = new Blob([new Uint8Array(data)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadPracticeExercisePdf(song: EncoreSong, run: EncorePracticeExerciseRun, bytes: Uint8Array): void {
  downloadUint8ArrayAsFile(bytes, practiceExercisePdfBaseName(song, run));
}
