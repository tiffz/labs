/**
 * Plan and apply a site import (see `lyreflySiteCatalog.ts` for reading the site).
 *
 * Safe to run again: every row the import writes gets an id derived from the comic's import key,
 * so a second run — on this device or another — finds what the first one wrote. A comic deleted
 * since the last run carries a tombstone on that same id and is skipped, not resurrected.
 */
import { lyreflyDb, markLyreflyDirtyRow } from '../db/lyreflyDb';
import { notifyLyreflyLocalChange } from '../db/lyreflyChangeBus';
import { listLyreflyProjectTombstones } from '../drive/lyreflyDriveTombstones';
import { parseScriptHtml } from '../script/scriptHtmlParser';
import { analyzeScriptPacing } from '../script/scriptPacingAnalyzer';
import { parseAndSortPageFiles } from '../../shared/zine/pageFileParser';
import { displayNameFromParsedPageFile } from '../utils/artPageUploadUtils';
import { createBlankComicProject } from '../types';
import { DEFAULT_SCRIPT_HTML } from '../script/defaultScriptSample';
import { isRichTextEmpty } from '../../shared/utils/richTextContent';
import type {
  ComicArchiveBinder,
  ComicProject,
  LyreflyAccount,
  LyreflyPersona,
  LyreflySeries,
  PageNode,
  PageRevision,
  PublishLogEntry,
} from '../types';
import { LYREFLY_WORKFLOW_STAGES } from '../workflow/lyreflyWorkflowStages';
import type { CatalogComic, CatalogPage, SiteCatalog } from './lyreflySiteCatalog';

/**
 * Deterministic UUID-shaped id from a key, so two devices derive the same row. Synchronous on
 * purpose: it runs inside Dexie transactions, which commit early if they await anything that is
 * not IndexedDB (crypto.subtle included). Identity, not security, so a non-cryptographic 128-bit
 * hash (cyrb128) is enough.
 */
export function lyreflyStableId(key: string): string {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < key.length; i++) {
    const k = key.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  const hex = [h1, h2, h3, h4].map((h) => (h >>> 0).toString(16).padStart(8, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

const lower = (s: string): string => s.trim().toLowerCase();

export type ComicImportAction =
  /** New comic, pages and all. */
  | 'create'
  /** A comic you made by hand with the same title: credit and publications added, art left alone. */
  | 'link'
  /** Imported before; publications it lacks are added. */
  | 'update'
  /** Deleted after an earlier import; stays deleted. */
  | 'skip-deleted';

export type ComicImportPlan = {
  comic: CatalogComic;
  projectId: string;
  action: ComicImportAction;
  newPublications: number;
};

export type SiteImportPlan = {
  catalog: SiteCatalog;
  persona: LyreflyPersona & { isNew: boolean };
  series: Map<string, LyreflySeries & { isNew: boolean }>;
  accounts: (LyreflyAccount & { isNew: boolean })[];
  comics: ComicImportPlan[];
};

export async function planLyreflySiteImport(catalog: SiteCatalog, personaName: string): Promise<SiteImportPlan> {
  const now = new Date().toISOString();
  const [projects, personas, allSeries, accounts, archives] = await Promise.all([
    lyreflyDb.projects.toArray(),
    lyreflyDb.personas.toArray(),
    lyreflyDb.series.toArray(),
    lyreflyDb.accounts.toArray(),
    lyreflyDb.archives.toArray(),
  ]);
  const tombstoned = new Set(listLyreflyProjectTombstones().map((t) => t.id));

  // Retired rows are history, not candidates: an import credits a pen name you still use.
  const existingPersona = personas.find((p) => !p.retiredAt && lower(p.name) === lower(personaName));
  const persona = existingPersona
    ? { ...existingPersona, isNew: false }
    : { id: lyreflyStableId(`persona:${lower(personaName)}`), name: personaName.trim(), updatedAt: now, isNew: true };

  const series = new Map<string, LyreflySeries & { isNew: boolean }>();
  for (const s of catalog.series) {
    const existing = allSeries.find((row) => !row.retiredAt && lower(row.title) === lower(s.title));
    series.set(
      s.key,
      existing
        ? { ...existing, isNew: false }
        : { id: lyreflyStableId(`series:${s.key}`), title: s.title, updatedAt: now, isNew: true },
    );
  }

  const plannedAccounts: SiteImportPlan['accounts'] = [];
  for (const a of catalog.accounts) {
    const existing = accounts.find((row) => row.platform === a.platform && lower(row.handle) === lower(a.handle));
    if (existing) {
      plannedAccounts.push({ ...existing, isNew: false });
      continue;
    }
    const owner =
      a.owner.kind === 'persona'
        ? { kind: 'persona' as const, id: persona.id }
        : { kind: 'series' as const, id: series.get(a.owner.seriesKey)!.id };
    plannedAccounts.push({
      id: lyreflyStableId(`account:${a.platform}:${lower(a.handle)}`),
      platform: a.platform,
      handle: a.handle,
      url: a.url,
      owner,
      updatedAt: now,
      isNew: true,
    });
  }

  const archiveByProject = new Map(archives.map((a) => [a.projectId, a] as const));
  const comics: ComicImportPlan[] = [];
  for (const comic of catalog.comics) {
    const stableId = lyreflyStableId(`project:${comic.key}`);
    const existing =
      projects.find((p) => p.importKey === comic.key) ??
      projects.find((p) => p.id === stableId) ??
      projects.find((p) => !p.importKey && lower(p.title) === lower(comic.title));
    let action: ComicImportAction;
    if (existing) action = existing.importKey === comic.key || existing.id === stableId ? 'update' : 'link';
    else if (tombstoned.has(stableId)) action = 'skip-deleted';
    else action = 'create';

    const knownUrls = new Set((existing ? archiveByProject.get(existing.id)?.publishLog ?? [] : []).map((r) => r.url));
    comics.push({
      comic,
      projectId: existing?.id ?? stableId,
      action,
      newPublications:
        action === 'skip-deleted' ? 0 : comic.publications.filter((p) => !knownUrls.has(p.url)).length,
    });
  }

  return { catalog, persona, series, accounts: plannedAccounts, comics };
}

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const li = (text: string, children = ''): string =>
  `<li><p>${escapeHtml(text)}</p>${children ? `<ul>${children}</ul>` : ''}</li>`;

/**
 * Script from page alt text written as "1. Panel…\n2. Panel…", with any lines before the first
 * panel (narration) placed under panel one. Pages without alt text are left out.
 */
export function scriptHtmlFromAltText(pages: { label: string; altText?: string }[]): string | null {
  const items: string[] = [];
  for (const page of pages) {
    const lines = (page.altText ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    const panels: { title: string; content: string[] }[] = [];
    const lead: string[] = [];
    for (const line of lines) {
      const panel = /^\d+\.\s*(.+)$/.exec(line);
      if (panel) panels.push({ title: panel[1]!, content: [] });
      else if (panels.length > 0) panels[panels.length - 1]!.content.push(line);
      else lead.push(line);
    }
    if (panels.length === 0) panels.push({ title: 'Panel 1', content: [] });
    panels[0]!.content.unshift(...lead);
    items.push(li(page.label, panels.map((p) => li(p.title, p.content.map((c) => li(c)).join(''))).join('')));
  }
  return items.length > 0 ? `<ul>${items.join('')}</ul>` : null;
}

export type SiteImportProgress = (label: string) => void;

/** Download every page before anything is written, so a failed download leaves nothing behind. */
async function downloadPages(
  comic: CatalogComic,
  fetchImpl: typeof fetch,
  onProgress: SiteImportProgress,
): Promise<File[]> {
  const pages: CatalogPage[] = comic.pages ?? [];
  const files: File[] = [];
  for (const [i, page] of pages.entries()) {
    onProgress(`${comic.title}: page ${i + 1} of ${pages.length}`);
    const res = await fetchImpl(page.imageUrl);
    if (!res.ok) throw new Error(`Could not download ${page.fileName} for ${comic.title} (HTTP ${res.status}).`);
    const blob = await res.blob();
    files.push(new File([blob], page.fileName, { type: blob.type || 'image/png' }));
  }
  return files;
}

async function writeImportedPages(
  project: ComicProject,
  comic: CatalogComic,
  files: File[],
): Promise<{ layoutOrder: string[]; script: string | null; coverRevisionId?: string }> {
  const byFileName = new Map((comic.pages ?? []).map((p) => [p.fileName, p] as const));
  const now = new Date().toISOString();
  const layoutOrder: string[] = [];
  const scriptPages: { label: string; altText?: string }[] = [];
  let coverRevisionId: string | undefined;
  for (const parsed of parseAndSortPageFiles(files)) {
    const displayName = displayNameFromParsedPageFile(parsed);
    const nodeId = lyreflyStableId(`page:${comic.key}:${parsed.file.name}`);
    const revisionId = lyreflyStableId(`revision:${comic.key}:${parsed.file.name}`);
    const revision: PageRevision = {
      id: revisionId,
      pageNodeId: nodeId,
      label: 'From website',
      stage: 'final',
      fileName: parsed.file.name,
      mimeType: parsed.file.type || 'image/png',
      width: 0,
      height: 0,
      byteSize: parsed.file.size,
      importedAt: now,
      createdAt: now,
    };
    const node: PageNode = {
      id: nodeId,
      projectId: project.id,
      displayName,
      isSpread: parsed.isSpread,
      activeRevisionId: revisionId,
      revisionIds: [revisionId],
      createdAt: now,
      updatedAt: now,
    };
    await lyreflyDb.revisionBlobs.put({ revisionId, blob: parsed.file });
    await lyreflyDb.pageRevisions.put(revision);
    await lyreflyDb.pageNodes.put(node);
    await markLyreflyDirtyRow('page_revision', revisionId, 'upsert', project.id);
    await markLyreflyDirtyRow('page_node', nodeId, 'upsert', project.id);
    layoutOrder.push(nodeId);
    if (parsed.pageNumber === 0 && !parsed.isSpread) coverRevisionId ??= revisionId;
    if ((parsed.pageNumber ?? 0) > 0) {
      scriptPages.push({ label: displayName, altText: byFileName.get(parsed.file.name)?.altText });
    }
  }
  return { layoutOrder, script: scriptHtmlFromAltText(scriptPages), coverRevisionId };
}

async function addPublications(
  projectId: string,
  archiveId: string,
  comic: CatalogComic,
): Promise<string> {
  const existing = await lyreflyDb.archives.get(archiveId);
  const archive: ComicArchiveBinder = existing ?? {
    id: archiveId,
    projectId,
    publishLog: [],
    pressEntries: [],
    salesLedger: [],
  };
  const known = new Set(archive.publishLog.map((r) => r.url));
  const added: PublishLogEntry[] = [];
  for (const p of comic.publications) {
    if (known.has(p.url)) continue;
    added.push({
      id: lyreflyStableId(`publication:${comic.key}:${p.url}`),
      platform: p.platform,
      publishedAt: p.publishedAt,
      url: p.url,
      updatedAt: new Date().toISOString(),
    });
  }
  if (added.length > 0 || !existing) {
    await lyreflyDb.archives.put({ ...archive, publishLog: [...archive.publishLog, ...added] });
    await markLyreflyDirtyRow('archive', archiveId, 'upsert', projectId);
  }
  return archiveId;
}

export type SiteImportResult = { created: number; updated: number; linked: number; skippedDeleted: number };

export async function applyLyreflySiteImport(
  plan: SiteImportPlan,
  options: { fetchImpl?: typeof fetch; onProgress?: SiteImportProgress } = {},
): Promise<SiteImportResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const onProgress = options.onProgress ?? (() => {});
  const strip = <T extends { isNew: boolean }>(row: T): Omit<T, 'isNew'> => {
    const copy: Partial<T> = { ...row };
    delete copy.isNew;
    return copy as Omit<T, 'isNew'>;
  };

  if (plan.persona.isNew) await lyreflyDb.personas.put(strip(plan.persona));
  for (const s of plan.series.values()) if (s.isNew) await lyreflyDb.series.put(strip(s));
  for (const a of plan.accounts) if (a.isNew) await lyreflyDb.accounts.put(strip(a));

  const result: SiteImportResult = { created: 0, updated: 0, linked: 0, skippedDeleted: 0 };
  // One comic's rows land together or not at all; a failure leaves earlier comics complete.
  const comicTables = [
    lyreflyDb.projects,
    lyreflyDb.pageNodes,
    lyreflyDb.pageRevisions,
    lyreflyDb.revisionBlobs,
    lyreflyDb.scriptDocuments,
    lyreflyDb.archives,
    lyreflyDb.dirtySync,
  ];
  try {
    for (const item of plan.comics) {
      const { comic } = item;
      const seriesId = comic.seriesKey ? plan.series.get(comic.seriesKey)?.id : undefined;
      if (item.action === 'skip-deleted') {
        result.skippedDeleted += 1;
        continue;
      }

      // Trust the database, not the plan: a re-run after a failure, or a sync while the preview
      // was open, may already have written this comic. Then it is an update, never an overwrite.
      const existing = await lyreflyDb.projects.get(item.projectId);
      if (item.action === 'create' && !existing) {
        const files = await downloadPages(comic, fetchImpl, onProgress);
        await lyreflyDb.transaction('rw', comicTables, async () => {
          await createImportedComic(plan, item, seriesId, files);
        });
        result.created += 1;
        continue;
      }
      if (!existing) {
        // Deleted between the preview and now.
        result.skippedDeleted += 1;
        continue;
      }
      // A comic you started by hand but never drew in takes the site's pages; one with any page of
      // its own keeps its art untouched.
      const fillPages = item.action === 'link' && (await hasNoPages(existing));
      const files = fillPages ? await downloadPages(comic, fetchImpl, onProgress) : [];
      await lyreflyDb.transaction('rw', comicTables, async () => {
        if (fillPages) await fillEmptyComic(existing, comic, files);
        const current = (await lyreflyDb.projects.get(existing.id)) ?? existing;
        const archiveId = existing.archiveId ?? (lyreflyStableId(`archive:${comic.key}`));
        await addPublications(existing.id, archiveId, comic);
        await lyreflyDb.projects.put({
          ...current,
          importKey: existing.importKey ?? comic.key,
          // Fill only what was never set: a deliberate "none" ([] / null) survives a re-run.
          personaIds: existing.personaIds !== undefined ? existing.personaIds : [plan.persona.id],
          seriesId: existing.seriesId !== undefined ? existing.seriesId : seriesId,
          archiveId,
          modules: { ...current.modules, archive: true },
          updatedAt: new Date().toISOString(),
        });
        await markLyreflyDirtyRow('project', existing.id, 'upsert', existing.id);
      });
      if (item.action === 'link') result.linked += 1;
      else result.updated += 1;
    }
  } finally {
    // Whatever finished must reach sync even if a later comic failed.
    notifyLyreflyLocalChange({ immediate: true });
  }
  return result;
}

async function hasNoPages(project: ComicProject): Promise<boolean> {
  if (project.layoutOrder?.length) return false;
  return (await lyreflyDb.pageNodes.where('projectId').equals(project.id).count()) === 0;
}

/** A blank script is the starter template or nothing: never a script someone wrote. */
function isBlankScript(markdown: string | undefined): boolean {
  return isRichTextEmpty(markdown) || markdown?.trim() === DEFAULT_SCRIPT_HTML.trim();
}

/**
 * Give a page-less comic the site's pages, and fill its script, notes and stages only where they
 * are blank. The comic was published, so it is finished.
 */
async function fillEmptyComic(project: ComicProject, comic: CatalogComic, files: File[]): Promise<void> {
  const now = new Date().toISOString();
  const pages = await writeImportedPages(project, comic, files);
  const script = await lyreflyDb.scriptDocuments.get(project.scriptDocumentId);
  if (pages.script && isBlankScript(script?.markdown)) {
    const blocks = parseScriptHtml(pages.script);
    await lyreflyDb.scriptDocuments.put({
      id: project.scriptDocumentId,
      projectId: project.id,
      markdown: pages.script,
      blocks,
      pacingWarnings: analyzeScriptPacing(blocks),
      updatedAt: now,
    });
    await markLyreflyDirtyRow('script', project.scriptDocumentId, 'upsert', project.id);
  }
  const notes = brainstormFromComic(comic);
  await lyreflyDb.projects.put({
    ...project,
    layoutOrder: pages.layoutOrder,
    pageCount: pages.layoutOrder.length,
    coverRef: project.coverRef ?? (pages.coverRevisionId ? { kind: 'page_revision', id: pages.coverRevisionId } : undefined),
    brainstormHtml: isRichTextEmpty(project.brainstormHtml) && notes ? notes : project.brainstormHtml,
    status: 'finished',
    stageCompletion: Object.fromEntries(LYREFLY_WORKFLOW_STAGES.map((s) => [s.id, true])),
    updatedAt: now,
  });
}

function brainstormFromComic(comic: CatalogComic): string | undefined {
  return (
    [comic.description, comic.contentWarnings?.length ? `Content warning: ${comic.contentWarnings.join(', ')}` : '']
      .filter(Boolean)
      .map((t) => `<p>${escapeHtml(t!)}</p>`)
      .join('') || undefined
  );
}

async function createImportedComic(
  plan: SiteImportPlan,
  item: ComicImportPlan,
  seriesId: string | undefined,
  files: File[],
): Promise<void> {
  const { comic } = item;
  const now = new Date().toISOString();
  const project: ComicProject = {
    ...createBlankComicProject(now),
    id: item.projectId,
    scriptDocumentId: lyreflyStableId(`script:${comic.key}`),
    title: comic.title,
    status: 'finished',
    importKey: comic.key,
    personaIds: [plan.persona.id],
    seriesId,
    stageCompletion: Object.fromEntries(LYREFLY_WORKFLOW_STAGES.map((s) => [s.id, true])),
    brainstormHtml: brainstormFromComic(comic),
  };
  const pages = await writeImportedPages(project, comic, files);
  project.layoutOrder = pages.layoutOrder;
  project.pageCount = pages.layoutOrder.length;
  if (pages.coverRevisionId) project.coverRef = { kind: 'page_revision', id: pages.coverRevisionId };
  if (pages.script) {
    const blocks = parseScriptHtml(pages.script);
    await lyreflyDb.scriptDocuments.put({
      id: project.scriptDocumentId,
      projectId: project.id,
      markdown: pages.script,
      blocks,
      pacingWarnings: analyzeScriptPacing(blocks),
      updatedAt: now,
    });
    await markLyreflyDirtyRow('script', project.scriptDocumentId, 'upsert', project.id);
  }
  project.archiveId = await addPublications(project.id, lyreflyStableId(`archive:${comic.key}`), comic);
  project.modules = { ...project.modules, archive: true };
  await lyreflyDb.projects.put(project);
  await markLyreflyDirtyRow('project', project.id, 'upsert', project.id);
}
