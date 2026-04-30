/**
 * Best-effort reader for embedded metadata in score files.
 *
 * Scope:
 *  - PDF: read the Document Information dictionary (Title / Author / Subject /
 *    Keywords) using `pdf-lib`. MusicNotes / PDFsharp exports do not populate
 *    these fields, but MuseScore and Sibelius (sometimes) do — we surface
 *    whatever is available so filename-only parses get a chance to enrich.
 *  - MusicXML: parse <work-title>, <creator type="composer">, <key>.
 *  - Other extensions: not supported (MIDI does not carry song titles in any
 *    reliable text form; we leave that to the filename parser).
 *
 * Implementation policy:
 *  - Always best-effort; never throw to the caller. Errors collapse to an
 *    empty result.
 *  - Reads only as many bytes as needed (PDF: full file via pdf-lib;
 *    MusicXML: full file as text). Files larger than 25MB are skipped.
 */

import { PDFDocument } from 'pdf-lib';

const MAX_BYTES = 25 * 1024 * 1024;

export interface ScoreFileMetadata {
  title?: string;
  artist?: string;
  /** "Db major" / "A minor" matching ENCORE_PERFORMANCE_KEY_OPTIONS, when discoverable. */
  key?: string;
  /** Free-form keywords (PDF /Keywords) the caller may turn into tags. */
  keywords?: string;
}

const EMPTY: ScoreFileMetadata = {};

const EXT_RE = /\.([a-z0-9]+)$/i;

function getExtension(name: string): string {
  return EXT_RE.exec(name.trim())?.[1]?.toLowerCase() ?? '';
}

function nonEmpty(s: string | null | undefined): string | undefined {
  if (typeof s !== 'string') return undefined;
  const t = s.trim();
  return t ? t : undefined;
}

async function readPdfMetadata(buffer: ArrayBuffer): Promise<ScoreFileMetadata> {
  try {
    const pdf = await PDFDocument.load(buffer, { updateMetadata: false });
    return {
      title: nonEmpty(pdf.getTitle()),
      artist: nonEmpty(pdf.getAuthor()),
      keywords: nonEmpty(pdf.getKeywords()),
    };
  } catch {
    return EMPTY;
  }
}

const KEY_FIFTHS_TO_PITCH: Record<string, { major: string; minor: string }> = {
  '0': { major: 'C', minor: 'A' },
  '1': { major: 'G', minor: 'E' },
  '2': { major: 'D', minor: 'B' },
  '3': { major: 'A', minor: 'F#' },
  '4': { major: 'E', minor: 'C#' },
  '5': { major: 'B', minor: 'G#' },
  '6': { major: 'F#', minor: 'D#' },
  '7': { major: 'C#', minor: 'A#' },
  '-1': { major: 'F', minor: 'D' },
  '-2': { major: 'Bb', minor: 'G' },
  '-3': { major: 'Eb', minor: 'C' },
  '-4': { major: 'Ab', minor: 'F' },
  '-5': { major: 'Db', minor: 'Bb' },
  '-6': { major: 'Gb', minor: 'Eb' },
  '-7': { major: 'Cb', minor: 'Ab' },
};

function readXmlText(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8').decode(new Uint8Array(buffer));
  } catch {
    return '';
  }
}

function captureXmlField(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m = re.exec(xml);
  return nonEmpty(m?.[1]?.replace(/<[^>]+>/g, '').replace(/\s+/g, ' '));
}

function captureMusicXmlKey(xml: string): string | undefined {
  const fifthsMatch = /<fifths>(-?\d+)<\/fifths>/i.exec(xml);
  if (!fifthsMatch) return undefined;
  const modeMatch = /<mode>(major|minor)<\/mode>/i.exec(xml);
  const mode = (modeMatch?.[1] ?? 'major').toLowerCase() as 'major' | 'minor';
  const lookup = KEY_FIFTHS_TO_PITCH[fifthsMatch[1]!];
  if (!lookup) return undefined;
  const root = lookup[mode];
  return `${root} ${mode}`;
}

function readMusicXmlMetadata(xml: string): ScoreFileMetadata {
  if (!xml) return EMPTY;
  return {
    title: captureXmlField(xml, 'work-title') ?? captureXmlField(xml, 'movement-title'),
    artist: captureXmlField(xml, 'creator'),
    key: captureMusicXmlKey(xml),
  };
}

/**
 * Parse score-file metadata from an in-memory buffer. Pure function (no I/O)
 * so tests can drive it directly with synthetic buffers.
 */
export async function parseScoreBuffer(buffer: ArrayBuffer, fileName: string): Promise<ScoreFileMetadata> {
  if (buffer.byteLength > MAX_BYTES) return EMPTY;
  const ext = getExtension(fileName);
  try {
    if (ext === 'pdf') {
      return await readPdfMetadata(buffer);
    }
    if (ext === 'xml' || ext === 'musicxml') {
      return readMusicXmlMetadata(readXmlText(buffer));
    }
    /* .mxl is a zipped MusicXML; without a zip lib here we skip — filename
       parser still wins for those files. */
    return EMPTY;
  } catch {
    return EMPTY;
  }
}

/**
 * Extract metadata from a score file. Returns an empty object on any failure.
 * Caller decides whether/how to merge with filename-derived metadata.
 */
export async function readScoreFileMetadata(file: File): Promise<ScoreFileMetadata> {
  if (file.size > MAX_BYTES) return EMPTY;
  try {
    const buffer = await file.arrayBuffer();
    return await parseScoreBuffer(buffer, file.name);
  } catch {
    return EMPTY;
  }
}
