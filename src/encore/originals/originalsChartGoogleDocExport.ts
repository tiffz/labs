import { buildLabsDownloadFileName } from '../../shared/utils/labsDownloadFileName';
import {
  docsCreateBlankDocument,
  docsReplaceBodyTwoColumnPlainTextTable,
} from '../practice/googleDocsExerciseExport';
import { sanitizeTextForGoogleDocsInsert } from '../practice/encorePracticeExerciseExport';
import { boldSectionHeaderSpans, chartLayoutToTwoColumnExport } from '../../shared/music/chordChartTwoColumnExport';
import { parseChordProToChartLayout } from '../../shared/music/chordPro/chordChartLayout';
import { driveGetFileMetadata, driveMoveFile } from '../drive/driveFetch';
import { ensureOriginalsDriveLayout } from './drive/originalsSharded';
import type { EncoreOriginalSong } from './types';

export function originalChartGoogleDocTitle(song: EncoreOriginalSong): string {
  return buildLabsDownloadFileName([song.title.trim() || 'Untitled', 'Chord Chart']);
}

export function googleDocEditUrl(documentId: string): string {
  return `https://docs.google.com/document/d/${encodeURIComponent(documentId)}/edit`;
}

export function openGoogleDocInNewTab(documentId: string): void {
  window.open(googleDocEditUrl(documentId), '_blank', 'noopener,noreferrer');
}

export type SyncOriginalChartGoogleDocResult = {
  driveChartGoogleDocId: string;
  created: boolean;
};

function buildTwoColumnGoogleDocCells(song: EncoreOriginalSong): {
  preamble: string;
  leftCell: string;
  rightCell: string;
  leftBold: Array<{ start: number; end: number }>;
  rightBold: Array<{ start: number; end: number }>;
} {
  const layout = parseChordProToChartLayout(song.lyricsAndChords);
  const { left, right } = chartLayoutToTwoColumnExport(layout);
  const title = song.title.trim() || 'Untitled original';
  const preamble = `${sanitizeTextForGoogleDocsInsert(title)}\n${sanitizeTextForGoogleDocsInsert(`Key: ${song.key} · ${song.tempo} BPM`)}\n\n`;
  const safeLeft = sanitizeTextForGoogleDocsInsert(left);
  const safeRight = sanitizeTextForGoogleDocsInsert(right);
  return {
    preamble,
    leftCell: safeLeft,
    rightCell: safeRight,
    leftBold: boldSectionHeaderSpans(safeLeft),
    rightBold: boldSectionHeaderSpans(safeRight),
  };
}

/** Ensure a two-column chord chart lives in a Google Doc under Encore originals. */
export async function syncOriginalChartGoogleDoc(opts: {
  accessToken: string;
  song: EncoreOriginalSong;
}): Promise<SyncOriginalChartGoogleDocResult> {
  const { accessToken, song } = opts;
  const title = originalChartGoogleDocTitle(song);
  const cells = buildTwoColumnGoogleDocCells(song);
  const existing = song.driveChartGoogleDocId?.trim();
  if (existing) {
    try {
      await docsReplaceBodyTwoColumnPlainTextTable(accessToken, existing, {
        ...cells,
        documentTitle: title,
      });
      return { driveChartGoogleDocId: existing, created: false };
    } catch {
      /* recreate below */
    }
  }

  const documentId = await docsCreateBlankDocument(accessToken, title);
  await docsReplaceBodyTwoColumnPlainTextTable(accessToken, documentId, {
    ...cells,
    documentTitle: title,
  });
  const layout = await ensureOriginalsDriveLayout(accessToken);
  const meta = await driveGetFileMetadata(accessToken, documentId);
  await driveMoveFile(accessToken, documentId, layout.originalsFolderId, meta.parents ?? []);
  return { driveChartGoogleDocId: documentId, created: true };
}
