/**
 * Google Docs API with OAuth **`drive.file`** only (per Google’s Docs auth guide): create/edit
 * Docs the app creates—not the broad `documents` scope.
 *
 * @see https://developers.google.com/docs/api/auth
 */
import { driveGetFileMetadata, driveMoveFile, driveRenameFile } from '../drive/driveFetch';
import { ensurePracticeExportsFolderId } from './ensurePracticeExportsFolder';
import {
  buildLyricsInOwnWordsGoogleDocLayout,
  buildPracticeExerciseExportPlainText,
  practiceExerciseGoogleDocTitle,
} from './encorePracticeExerciseExport';
import type { EncoreLyricsInOwnWordsExerciseRun, EncorePracticeExerciseRun, EncoreSong } from '../types';

const DOCS_BASE = 'https://docs.googleapis.com/v1';

function formatDocsFailure(method: string, path: string, status: number, body: string): string {
  const t = body.trim().slice(0, 400);
  return `Google Docs ${method} ${path} (${status})${t ? `: ${t}` : ''}`;
}

async function docsPostJson<T>(
  accessToken: string,
  path: string,
  body: unknown,
): Promise<{ data: T; raw: string }> {
  const res = await fetch(`${DOCS_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(formatDocsFailure('POST', path, res.status, raw));
  }
  return { data: JSON.parse(raw) as T, raw };
}

async function docsGetJson<T>(accessToken: string, path: string): Promise<T> {
  const res = await fetch(`${DOCS_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(formatDocsFailure('GET', path, res.status, raw));
  }
  return JSON.parse(raw) as T;
}

async function docsGetDocumentRecord(accessToken: string, documentId: string): Promise<Record<string, unknown>> {
  return docsGetJson<Record<string, unknown>>(
    accessToken,
    `/documents/${encodeURIComponent(documentId)}?includeTabsContent=true`,
  );
}

/** Tab id for the first tab (newer Docs); omit from payloads when undefined (legacy body-only). */
function primaryTabId(doc: Record<string, unknown>): string | undefined {
  const tabs = doc.tabs as Array<{ tabProperties?: { tabId?: string } }> | undefined;
  const id = tabs?.[0]?.tabProperties?.tabId?.trim();
  return id || undefined;
}

function docsContentRange(startIndex: number, endIndex: number, tabId?: string): Record<string, unknown> {
  const range: Record<string, unknown> = { segmentId: '', startIndex, endIndex };
  if (tabId) range.tabId = tabId;
  return range;
}

function docsIndexLocation(index: number, tabId?: string): Record<string, unknown> {
  const loc: Record<string, unknown> = { segmentId: '', index };
  if (tabId) loc.tabId = tabId;
  return loc;
}

type DocsBodyElement = {
  startIndex?: number;
  endIndex?: number;
  paragraph?: unknown;
  table?: unknown;
  sectionBreak?: unknown;
};

/** One node in `document.tabs` (root or nested under `childTabs`). @see Google Docs “Work with tabs”. */
type DocsTabNode = {
  tabProperties?: { tabId?: string };
  documentTab?: { body?: { content?: DocsBodyElement[] } };
  childTabs?: DocsTabNode[];
};

function findTabNodeById(nodes: DocsTabNode[] | undefined, tabId: string): DocsTabNode | undefined {
  if (!nodes?.length) return undefined;
  for (const n of nodes) {
    if (n.tabProperties?.tabId?.trim() === tabId) return n;
    const nested = findTabNodeById(n.childTabs, tabId);
    if (nested) return nested;
  }
  return undefined;
}

/** Tab ids that own a `documentTab.body` (root tabs and every nested `childTabs` tab). */
function collectDocumentTabIdsForClearing(nodes: DocsTabNode[] | undefined, out: Set<string>): void {
  if (!nodes?.length) return;
  for (const n of nodes) {
    const tid = n.tabProperties?.tabId?.trim();
    if (tid && n.documentTab?.body != null) out.add(tid);
    collectDocumentTabIdsForClearing(n.childTabs, out);
  }
}

/** Exported for tests: root `tabs` plus every nested `childTabs` id that has a `documentTab.body`. */
export function allDocumentTabIdsForClearing(doc: Record<string, unknown>): string[] {
  const roots = doc.tabs as DocsTabNode[] | undefined;
  const out = new Set<string>();
  collectDocumentTabIdsForClearing(roots, out);
  return [...out];
}

/**
 * Body `content`: tabbed documents store the body under `tabs[0].documentTab` (prefer that when
 * `tabs` exists). Legacy docs use `body.content` only.
 */
function documentBodyStructuralElements(doc: Record<string, unknown>): DocsBodyElement[] {
  const tabs = doc.tabs as DocsTabNode[] | undefined;
  if (tabs && tabs.length > 0) {
    return tabs[0]?.documentTab?.body?.content ?? [];
  }
  const body = doc.body as { content?: DocsBodyElement[] } | undefined;
  return body?.content ?? [];
}

function documentTabBodyStructuralElements(doc: Record<string, unknown>, tabId: string): DocsBodyElement[] {
  const t = findTabNodeById(doc.tabs as DocsTabNode[] | undefined, tabId);
  return t?.documentTab?.body?.content ?? [];
}

function documentLegacyBodyStructuralElements(doc: Record<string, unknown>): DocsBodyElement[] {
  return (doc.body as { content?: DocsBodyElement[] } | undefined)?.content ?? [];
}

function maxEndIndexFromStructuralElements(elements: DocsBodyElement[]): number {
  let max = 1;
  for (const el of elements) {
    if (typeof el.endIndex === 'number') max = Math.max(max, el.endIndex);
  }
  return max;
}

function documentBodyIsDirty(doc: Record<string, unknown>): boolean {
  const tabIds = allDocumentTabIdsForClearing(doc);
  for (const tid of tabIds) {
    if (maxEndIndexFromStructuralElements(documentTabBodyStructuralElements(doc, tid)) > 2) return true;
  }
  return maxEndIndexFromStructuralElements(documentLegacyBodyStructuralElements(doc)) > 2;
}

type DocsBodySpan = { s: number; e: number; el: DocsBodyElement };

function bodyStructuralSpans(elements: DocsBodyElement[]): DocsBodySpan[] {
  return elements
    .map((el) => {
      const rawS = el.startIndex ?? 0;
      const e = el.endIndex ?? 0;
      const s = rawS < 1 ? 1 : rawS;
      return { s, e, el };
    })
    .filter((x) => x.e > x.s);
}

/** Paragraph `[start,end)` ranges in document order before the first table (for preamble styling). */
function preambleParagraphRangesBeforeFirstTable(doc: Record<string, unknown>): Array<{ s: number; e: number }> {
  const ranges: Array<{ s: number; e: number }> = [];
  for (const el of documentBodyStructuralElements(doc)) {
    if (el.table != null) break;
    if (el.sectionBreak != null) continue;
    if (el.paragraph != null && typeof el.startIndex === 'number' && typeof el.endIndex === 'number') {
      ranges.push({ s: el.startIndex, e: el.endIndex });
    }
  }
  return ranges;
}

const GOOGLE_DOC_PREAMBLE_PARAGRAPH_STYLES = ['TITLE', 'SUBTITLE'] as const;

/**
 * Clear one structural region: a specific **document tab** (`rangeTabId` set) or the legacy
 * `document.body` (`rangeTabId` omitted). Tabbed Google Docs can still carry legacy body content;
 * clearing only `tabs[0]` leaves duplicates visible.
 *
 * Paragraphs use `endIndex - 1` so the segment’s closing newline is not removed alone (invalid).
 * **All other structural kinds** (table, TOC, equation, horizontal rule, etc.) must be deleted as
 * the **whole element** `[startIndex, endIndex)` — partial deletes are rejected and stall clearing.
 *
 * @see https://developers.google.com/workspace/docs/api/concepts/rules-behavior#delete-text
 */
async function docsClearStructuralRegion(
  accessToken: string,
  documentId: string,
  rangeTabId: string | undefined,
): Promise<void> {
  const batchPath = `/documents/${encodeURIComponent(documentId)}:batchUpdate`;
  const maxRounds = 256;

  const elementsFor = (doc: Record<string, unknown>): DocsBodyElement[] =>
    rangeTabId != null && rangeTabId !== ''
      ? documentTabBodyStructuralElements(doc, rangeTabId)
      : documentLegacyBodyStructuralElements(doc);

  const regionLabel =
    rangeTabId != null && rangeTabId !== '' ? `tab ${rangeTabId}` : 'legacy document body';

  const deleteRange = (s: number, e: number) =>
    docsPostJson(accessToken, batchPath, {
      requests: [{ deleteContentRange: { range: docsContentRange(s, e, rangeTabId) } }],
    });

  /** Exclusive end index for `deleteContentRange` half-open `[start, end)`. */
  const spanDeleteEndExclusive = (span: DocsBodySpan): number => {
    if (span.el.paragraph != null) return span.e - 1;
    return span.e;
  };

  const trySalvageDeleteLargestNonParagraphBlock = async (): Promise<boolean> => {
    const d = await docsGetDocumentRecord(accessToken, documentId);
    const els = elementsFor(d);
    let best: DocsBodyElement | null = null;
    let bestLen = 0;
    for (const el of els) {
      if (el.paragraph != null) continue;
      const s = el.startIndex ?? 0;
      const e = el.endIndex ?? 0;
      if (s < 1 || e <= s) continue;
      const len = e - s;
      if (len > bestLen) {
        bestLen = len;
        best = el;
      }
    }
    if (!best || bestLen < 2) return false;
    const s = best.startIndex!;
    const e = best.endIndex!;
    await deleteRange(s, e);
    return true;
  };

  for (let round = 0; round < maxRounds; round += 1) {
    const doc = await docsGetDocumentRecord(accessToken, documentId);
    const elements = elementsFor(doc);
    const maxEnd = maxEndIndexFromStructuralElements(elements);
    if (maxEnd <= 2) return;

    const spans = bodyStructuralSpans(elements);
    if (spans.length === 0) {
      if (maxEnd <= 2) return;
      throw new Error(
        `Google Doc could not clear ${regionLabel} (structural spans missing). Remove the Doc in Drive and export again, or report this.`,
      );
    }

    spans.sort((a, b) => b.s - a.s);
    const last = spans[0]!;
    const len = last.e - last.s;

    const delSpan = async (span: DocsBodySpan): Promise<boolean> => {
      const end = spanDeleteEndExclusive(span);
      if (end <= span.s) return false;
      await deleteRange(span.s, end);
      return true;
    };

    if (last.el.table != null) {
      await delSpan(last);
      continue;
    }
    if (last.el.sectionBreak != null) {
      await delSpan(last);
      continue;
    }

    if (spans.length === 1) {
      if (len <= 2) return;
      if (last.el.paragraph != null) {
        const innerEnd = last.e - 2;
        if (innerEnd <= last.s) {
          throw new Error(
            `Google Doc could not clear ${regionLabel} (invalid paragraph span). Remove the Doc in Drive and export again, or report this.`,
          );
        }
        await deleteRange(last.s, innerEnd);
        continue;
      }
      await delSpan(last);
      continue;
    }

    if (len <= 1) {
      const prev = spans[1];
      if (!prev) {
        continue;
      }
      if (prev.el.table != null || prev.el.sectionBreak != null) {
        await delSpan(prev);
        continue;
      }
      if (prev.e - prev.s > 2) {
        await delSpan(prev);
        continue;
      }
      if (last.el.paragraph != null && (await delSpan(last))) continue;
      continue;
    }

    if (len > 2) {
      await delSpan(last);
      continue;
    }

    if ((len === 1 || len === 2) && last.el.paragraph != null && spans.length > 1) {
      if (await delSpan(last)) continue;
    }

    const prev = spans[1];
    if (prev && prev.e > prev.s) {
      await delSpan(prev);
      continue;
    }

    if (last.el.paragraph != null && spans.length > 1) {
      if (await delSpan(last)) continue;
    }

    continue;
  }

  for (let salvage = 0; salvage < 64; salvage += 1) {
    const d = await docsGetDocumentRecord(accessToken, documentId);
    if (maxEndIndexFromStructuralElements(elementsFor(d)) <= 2) return;
    if (!(await trySalvageDeleteLargestNonParagraphBlock())) break;
  }

  const finalDoc = await docsGetDocumentRecord(accessToken, documentId);
  const finalEnd = maxEndIndexFromStructuralElements(elementsFor(finalDoc));
  if (finalEnd > 2) {
    throw new Error(
      `Google Doc could not fully clear ${regionLabel} (endIndex ${String(finalEnd)}). Remove the Doc in Drive and export again, or report this.`,
    );
  }
}

/** Remove every tab after the first (practice exports should be single-tab). */
async function docsDeleteExtraDocumentTabsKeepingFirst(accessToken: string, documentId: string): Promise<void> {
  const doc = await docsGetDocumentRecord(accessToken, documentId);
  const tabs = doc.tabs as Array<{ tabProperties?: { tabId?: string } }> | undefined;
  if (!tabs || tabs.length <= 1) return;
  for (let i = tabs.length - 1; i >= 1; i -= 1) {
    const tid = tabs[i]?.tabProperties?.tabId?.trim();
    if (tid) await docsBatchUpdate(accessToken, documentId, [{ deleteTab: { tabId: tid } }]);
  }
}

/**
 * Strip **all** tab bodies plus legacy `document.body` so re-sync does not stack preambles.
 * Also callers should run {@link docsDeleteExtraDocumentTabsKeepingFirst} when duplicating tabs.
 */
async function docsClearBodyTextPreservingStructure(accessToken: string, documentId: string): Promise<void> {
  const maxPasses = 3;
  for (let pass = 0; pass < maxPasses; pass += 1) {
    const doc0 = await docsGetDocumentRecord(accessToken, documentId);
    const tabIds = allDocumentTabIdsForClearing(doc0);
    for (const tid of tabIds) {
      await docsClearStructuralRegion(accessToken, documentId, tid);
    }
    await docsClearStructuralRegion(accessToken, documentId, undefined);

    const finalDoc = await docsGetDocumentRecord(accessToken, documentId);
    if (!documentBodyIsDirty(finalDoc)) return;
    if (pass + 1 < maxPasses) {
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  const finalDoc = await docsGetDocumentRecord(accessToken, documentId);
  if (documentBodyIsDirty(finalDoc)) {
    throw new Error(
      'Google Doc body could not be fully cleared across tabs and legacy body. Remove the Doc in Drive and export again, or report this.',
    );
  }
}

export async function docsCreateBlankDocument(accessToken: string, title: string): Promise<string> {
  const { data } = await docsPostJson<{ documentId?: string }>(accessToken, '/documents', { title });
  const id = data.documentId?.trim();
  if (!id) throw new Error('Google Docs did not return a document id.');
  return id;
}

/** Replace the whole document body with plain text (preserves the Doc; good for re-sync). */
export async function docsReplaceEntireBodyPlainText(
  accessToken: string,
  documentId: string,
  text: string,
): Promise<void> {
  await docsClearBodyTextPreservingStructure(accessToken, documentId);
  await docsDeleteExtraDocumentTabsKeepingFirst(accessToken, documentId);

  const cleared = await docsGetDocumentRecord(accessToken, documentId);
  const tabId = primaryTabId(cleared);

  await docsPostJson(accessToken, `/documents/${encodeURIComponent(documentId)}:batchUpdate`, {
    requests: [
      {
        insertText: {
          location: docsIndexLocation(1, tabId),
          text,
        },
      },
    ],
  });
}

/** US Letter, landscape (readable two-column lyrics). */
const DOCS_LANDSCAPE_PAGE_SIZE = {
  height: { magnitude: 612, unit: 'PT' },
  width: { magnitude: 792, unit: 'PT' },
};

type DocsTableShape = {
  tableRows?: Array<{
    tableCells?: Array<{
      content?: unknown[];
    }>;
  }>;
};

async function docsBatchUpdate(
  accessToken: string,
  documentId: string,
  requests: unknown[],
): Promise<{ replies?: unknown[] }> {
  const { data } = await docsPostJson<{ replies?: unknown[] }>(
    accessToken,
    `/documents/${encodeURIComponent(documentId)}:batchUpdate`,
    { requests },
  );
  return data;
}

function documentBodyContent(doc: Record<string, unknown>): unknown[] {
  return documentBodyStructuralElements(doc) as unknown[];
}

function findFirstTableInBody(
  bodyContent: unknown[],
): { table: DocsTableShape; startIndex: number } | null {
  for (const item of bodyContent) {
    const el = item as { table?: DocsTableShape; startIndex?: number };
    if (el?.table && typeof el.startIndex === 'number') {
      return { table: el.table, startIndex: el.startIndex };
    }
  }
  return null;
}

function cellTextInsertIndex(cell: { content?: unknown[] }): number {
  const content = cell.content;
  if (!content?.length) throw new Error('Google Docs table cell has no content.');
  const block = content[0] as {
    paragraph?: { elements?: Array<{ startIndex?: number }> };
    startIndex?: number;
  };
  const el0 = block.paragraph?.elements?.[0];
  if (typeof el0?.startIndex === 'number') return el0.startIndex;
  if (typeof block.startIndex === 'number') return block.startIndex + 1;
  throw new Error('Could not resolve insert index inside a table cell.');
}

function collectTableCellInsertIndices(table: DocsTableShape): Map<string, number> {
  const grid = new Map<string, number>();
  const rows = table.tableRows ?? [];
  for (let r = 0; r < rows.length; r += 1) {
    const cells = rows[r]?.tableCells ?? [];
    for (let c = 0; c < cells.length; c += 1) {
      grid.set(`${r},${c}`, cellTextInsertIndex(cells[c] as { content?: unknown[] }));
    }
  }
  return grid;
}

function chunkArray<T>(arr: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += chunkSize) out.push(arr.slice(i, i + chunkSize));
  return out;
}

const DOCS_BATCH_INSERT_TEXT_MAX = 50;

/**
 * Replace document body with landscape page + preamble + **one-row** two-column table. Lyrics
 * align by paired newlines in each cell; column labels and section headers are bold.
 */
async function docsReplaceLyricsInOwnWordsTable(
  accessToken: string,
  documentId: string,
  song: EncoreSong,
  run: EncoreLyricsInOwnWordsExerciseRun,
): Promise<void> {
  const { preamble, leftCell, rightCell, leftBold, rightBold } = buildLyricsInOwnWordsGoogleDocLayout(
    song,
    run,
  );

  await docsClearBodyTextPreservingStructure(accessToken, documentId);
  await docsDeleteExtraDocumentTabsKeepingFirst(accessToken, documentId);
  await driveRenameFile(accessToken, documentId, practiceExerciseGoogleDocTitle(song, run));

  const clearedLayout = await docsGetDocumentRecord(accessToken, documentId);
  const tabId = primaryTabId(clearedLayout);

  await docsBatchUpdate(accessToken, documentId, [
    {
      updateDocumentStyle: {
        documentStyle: { pageSize: DOCS_LANDSCAPE_PAGE_SIZE },
        fields: 'pageSize',
        ...(tabId ? { tabId } : {}),
      },
    },
    {
      insertText: {
        location: docsIndexLocation(1, tabId),
        text: preamble,
      },
    },
  ]);

  const layoutAfterPreamble = await docsGetDocumentRecord(accessToken, documentId);
  const paraRanges = preambleParagraphRangesBeforeFirstTable(layoutAfterPreamble);
  const preambleStyleAndTable: unknown[] = [];
  const n = Math.min(paraRanges.length, GOOGLE_DOC_PREAMBLE_PARAGRAPH_STYLES.length);
  for (let i = 0; i < n; i += 1) {
    const r = paraRanges[i]!;
    preambleStyleAndTable.push({
      updateParagraphStyle: {
        range: docsContentRange(r.s, r.e, tabId),
        paragraphStyle: { namedStyleType: GOOGLE_DOC_PREAMBLE_PARAGRAPH_STYLES[i]! },
        fields: 'namedStyleType',
      },
    });
  }
  preambleStyleAndTable.push({
    insertTable: {
      rows: 1,
      columns: 2,
      endOfSegmentLocation: tabId ? { segmentId: '', tabId } : { segmentId: '' },
    },
  });

  await docsBatchUpdate(accessToken, documentId, preambleStyleAndTable);

  // `batchUpdate` replies often omit `insertTable`; resolve table start from the document model.
  const layoutAfterTable = await docsGetDocumentRecord(accessToken, documentId);
  const placed = findFirstTableInBody(documentBodyContent(layoutAfterTable));
  if (!placed) throw new Error('Google Docs export: table not found after insert.');
  const tableStart = placed.startIndex;

  await docsBatchUpdate(accessToken, documentId, [
    {
      updateTableColumnProperties: {
        tableStartLocation: docsIndexLocation(tableStart, tabId),
        columnIndices: [],
        tableColumnProperties: {
          widthType: 'EVENLY_DISTRIBUTED',
        },
        fields: 'widthType',
      },
    },
  ]);

  const docJson = await docsGetDocumentRecord(accessToken, documentId);
  const bodyContent = documentBodyContent(docJson);
  const found = findFirstTableInBody(bodyContent);
  if (!found) throw new Error('Google Docs export: table not found after insert.');

  const grid = collectTableCellInsertIndices(found.table);
  if (grid.size !== 2) {
    throw new Error(`Google Docs export: expected 1×2 table (2 cells), got ${String(grid.size)} cells.`);
  }

  const i00 = grid.get('0,0');
  const i01 = grid.get('0,1');
  if (i00 === undefined || i01 === undefined) {
    throw new Error('Google Docs export: missing table cells at row 0.');
  }

  const L = leftCell;
  const R = rightCell;
  let leftGlobalStart: number;
  let rightGlobalStart: number;
  let cellInserts: unknown[];
  if (i00 < i01) {
    leftGlobalStart = i00;
    rightGlobalStart = i01 + L.length;
    cellInserts = [
      { insertText: { location: docsIndexLocation(i00, tabId), text: L } },
      { insertText: { location: docsIndexLocation(i01 + L.length, tabId), text: R } },
    ];
  } else {
    rightGlobalStart = i01;
    leftGlobalStart = i00 + R.length;
    cellInserts = [
      { insertText: { location: docsIndexLocation(i01, tabId), text: R } },
      { insertText: { location: docsIndexLocation(i00 + R.length, tabId), text: L } },
    ];
  }

  await docsBatchUpdate(accessToken, documentId, cellInserts);

  const boldRequests: unknown[] = [];
  for (const { start, end } of leftBold) {
    if (end > start) {
      boldRequests.push({
        updateTextStyle: {
          range: docsContentRange(leftGlobalStart + start, leftGlobalStart + end, tabId),
          textStyle: { bold: true },
          fields: 'bold',
        },
      });
    }
  }
  for (const { start, end } of rightBold) {
    if (end > start) {
      boldRequests.push({
        updateTextStyle: {
          range: docsContentRange(rightGlobalStart + start, rightGlobalStart + end, tabId),
          textStyle: { bold: true },
          fields: 'bold',
        },
      });
    }
  }

  for (const group of chunkArray(boldRequests, DOCS_BATCH_INSERT_TEXT_MAX)) {
    if (group.length > 0) await docsBatchUpdate(accessToken, documentId, group);
  }
}

export type PracticeExerciseGoogleDocExportResult = {
  drivePracticeExportGoogleDocId: string;
};

function isDocNotFound(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return /\b404\b/.test(err.message);
}

/**
 * Create or update a **native Google Doc** with the exercise export (plain text).
 * New docs are filed under `Encore_App/Practice exports/`. Same document id is reused on re-sync.
 */
export async function syncPracticeExerciseGoogleDoc(opts: {
  accessToken: string;
  song: EncoreSong;
  run: EncorePracticeExerciseRun;
}): Promise<PracticeExerciseGoogleDocExportResult> {
  const { accessToken, song, run } = opts;
  const bodyPlain = buildPracticeExerciseExportPlainText(song, run);
  const title = practiceExerciseGoogleDocTitle(song, run);
  const existing = run.drivePracticeExportGoogleDocId?.trim();

  if (existing) {
    try {
      if (run.kind === 'lyricsInOwnWords') {
        await docsReplaceLyricsInOwnWordsTable(accessToken, existing, song, run);
      } else {
        await docsReplaceEntireBodyPlainText(accessToken, existing, bodyPlain);
      }
      return { drivePracticeExportGoogleDocId: existing };
    } catch (e) {
      if (!isDocNotFound(e)) throw e;
    }
  }

  const documentId = await docsCreateBlankDocument(accessToken, title);
  if (run.kind === 'lyricsInOwnWords') {
    await docsReplaceLyricsInOwnWordsTable(accessToken, documentId, song, run);
  } else {
    await docsReplaceEntireBodyPlainText(accessToken, documentId, bodyPlain);
  }

  const parentId = await ensurePracticeExportsFolderId(accessToken);
  const meta = await driveGetFileMetadata(accessToken, documentId);
  await driveMoveFile(accessToken, documentId, parentId, meta.parents ?? []);

  return { drivePracticeExportGoogleDocId: documentId };
}
