/** Pair chord line + lyric line heuristics after PDF text extraction. */
export async function extractPdfLines(file: File): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const lines: string[] = [];
  for (let p = 1; p <= doc.numPages; p += 1) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? String(item.str) : ''))
      .join(' ');
    for (const line of pageText.split(/\s{2,}|\n/)) {
      const t = line.trim();
      if (t) lines.push(t);
    }
  }
  return lines;
}

export function compilePdfLinesToChordPro(lines: string[], mode: 'chords_first' | 'lyrics_first'): string {
  const out: string[] = [];
  for (let i = 0; i < lines.length; i += 2) {
    const a = lines[i] ?? '';
    const b = lines[i + 1] ?? '';
    const chordLine = mode === 'chords_first' ? a : b;
    const lyricLine = mode === 'chords_first' ? b : a;
    const chordTokens = chordLine.match(/\b[A-G][#b]?(?:m|maj7|m7|7|sus\d?|dim|aug)?(?:\/[A-G][#b]?)?\b/gi);
    let merged = lyricLine;
    if (chordTokens?.length) {
      merged = chordTokens.map((c) => `[${c}]`).join('') + lyricLine;
    }
    if (merged.trim()) out.push(merged);
  }
  return out.join('\n');
}
