/**
 * Import a Lyrefly bundle: a JSON file of comics and Sketchbook ideas gathered from somewhere else
 * (a tracker doc, an old notes app). The owner's material is personal, so it travels as a file
 * they pick, never in this repo.
 *
 * Safe to run again, like the site import: every row gets an id derived from the entry's `key`,
 * so a second run finds what the first wrote. It fills gaps and never overwrites: a comic's queue
 * place, notes or script that already exist are left as they are, and an idea deleted since the
 * last run stays deleted (its marker row holds the same id).
 */
import { lyreflyDb, markLyreflyDirtyRow } from '../db/lyreflyDb';
import { notifyLyreflyLocalChange } from '../db/lyreflyChangeBus';
import { parseScriptHtml } from '../script/scriptHtmlParser';
import { analyzeScriptPacing } from '../script/scriptPacingAnalyzer';
import { isRichTextEmpty } from '../../shared/utils/richTextContent';
import { createBlankComicProject } from '../types';
import type {
  ComicProject,
  LyreflyPipelineStatus,
  SketchbookSeed,
  VisualDevAsset,
} from '../types';
import type { LyreflyWorkflowStage } from '../workflow/lyreflyWorkflowStages';
import { lyreflyStableId } from './lyreflySiteImport';

export type LyreflyBundleLink = { title: string; url: string };

export type LyreflyBundleComic = {
  /** Stable across re-runs, unique within the bundle's source (`tracker:the-flame`). */
  key: string;
  title: string;
  pipelineStatus?: LyreflyPipelineStatus;
  /** Queue order: lower comes first. */
  priorityRank?: number;
  /** Brainstorm notes: story bible, loglines (HTML). */
  brainstormHtml?: string;
  /** Script in Lyrefly's nested-list form (HTML). */
  scriptHtml?: string;
  links?: LyreflyBundleLink[];
};

export type LyreflyBundleSeed = {
  key: string;
  kind: 'idea' | 'daily_flash';
  title: string;
  /**
   * Plain text, newlines kept: the Sketchbook stores an idea's notes as text (in a field named
   * `bodyHtml` for history's sake), and shows any tags literally.
   */
  body?: string;
  /** YYYY-MM-DD */
  occurredOn?: string;
  links?: LyreflyBundleLink[];
};

export type LyreflyBundleV1 = {
  format: 'lyrefly-bundle';
  version: 1;
  /** Shown in the preview ("from Tiff's Story Tracker"). */
  source: string;
  comics: LyreflyBundleComic[];
  seeds: LyreflyBundleSeed[];
};

export class LyreflyBundleError extends Error {}

const PIPELINE: ReadonlySet<string> = new Set(['fleshing_out', 'ready_to_draw', 'complete']);

function isLink(v: unknown): v is LyreflyBundleLink {
  return Boolean(v) && typeof (v as LyreflyBundleLink).url === 'string' && typeof (v as LyreflyBundleLink).title === 'string';
}

/** Validate a parsed file. Anything malformed is an error with a reason, never a partial import. */
export function parseLyreflyBundle(raw: unknown): LyreflyBundleV1 {
  const b = raw as Partial<LyreflyBundleV1>;
  if (b?.format !== 'lyrefly-bundle') throw new LyreflyBundleError('This file is not a Lyrefly bundle.');
  if (b.version !== 1) throw new LyreflyBundleError(`Bundle version ${String(b.version)} is not supported.`);
  if (!Array.isArray(b.comics) || !Array.isArray(b.seeds)) throw new LyreflyBundleError('The bundle has no comics or ideas list.');
  const keys = new Set<string>();
  const checkKey = (key: unknown, what: string) => {
    if (typeof key !== 'string' || !key.trim()) throw new LyreflyBundleError(`A ${what} has no key.`);
    if (keys.has(key)) throw new LyreflyBundleError(`The key "${key}" is used twice.`);
    keys.add(key);
  };
  for (const c of b.comics) {
    checkKey(c?.key, 'comic');
    if (typeof c.title !== 'string' || !c.title.trim()) throw new LyreflyBundleError(`Comic "${c.key}" has no title.`);
    if (c.pipelineStatus !== undefined && !PIPELINE.has(c.pipelineStatus)) {
      throw new LyreflyBundleError(`Comic "${c.title}" has an unknown status "${c.pipelineStatus}".`);
    }
    if (c.links && !c.links.every(isLink)) throw new LyreflyBundleError(`Comic "${c.title}" has a malformed link.`);
  }
  for (const s of b.seeds) {
    checkKey(s?.key, 'idea');
    if (s.kind !== 'idea' && s.kind !== 'daily_flash') throw new LyreflyBundleError(`Idea "${s.key}" has an unknown kind.`);
    if (typeof s.title !== 'string' || !s.title.trim()) throw new LyreflyBundleError(`Idea "${s.key}" has no title.`);
    if (s.body !== undefined && /<\/?[a-z][^>]*>/i.test(s.body)) {
      throw new LyreflyBundleError(`Idea "${s.title}" has HTML in its body; ideas are plain text.`);
    }
    if (s.occurredOn !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(s.occurredOn)) {
      throw new LyreflyBundleError(`Idea "${s.title}" has a date that is not YYYY-MM-DD.`);
    }
    if (s.links && !s.links.every(isLink)) throw new LyreflyBundleError(`Idea "${s.title}" has a malformed link.`);
  }
  return b as LyreflyBundleV1;
}

export type BundleComicAction = 'create' | 'update' | 'link';
export type BundleSeedAction = 'create' | 'exists' | 'deleted';

export type LyreflyBundlePlan = {
  bundle: LyreflyBundleV1;
  comics: { comic: LyreflyBundleComic; projectId: string; action: BundleComicAction }[];
  seeds: { seed: LyreflyBundleSeed; seedId: string; action: BundleSeedAction }[];
};

const lower = (s: string): string => s.trim().toLowerCase();

export async function planLyreflyBundleImport(bundle: LyreflyBundleV1): Promise<LyreflyBundlePlan> {
  const projects = await lyreflyDb.projects.toArray();
  const comics = bundle.comics.map((comic) => {
    const stableId = lyreflyStableId(`project:${comic.key}`);
    const existing =
      projects.find((p) => p.importKey === comic.key || p.id === stableId) ??
      projects.find((p) => lower(p.title) === lower(comic.title));
    const action: BundleComicAction = !existing
      ? 'create'
      : existing.importKey === comic.key || existing.id === stableId
        ? 'update'
        : 'link';
    return { comic, projectId: existing?.id ?? stableId, action };
  });
  const seeds = [];
  for (const seed of bundle.seeds) {
    const seedId = lyreflyStableId(`seed:${seed.key}`);
    const existing = await lyreflyDb.sketchbookSeeds.get(seedId);
    const action: BundleSeedAction = !existing ? 'create' : existing.deletedAt ? 'deleted' : 'exists';
    seeds.push({ seed, seedId, action });
  }
  return { bundle, comics, seeds };
}

/** Stages a tracker status implies are done: "ready to draw" means the story and script are. */
function stagesDone(status: LyreflyPipelineStatus | undefined): Partial<Record<LyreflyWorkflowStage, boolean>> | undefined {
  if (status === 'ready_to_draw') return { brainstorm: true, script: true };
  if (status === 'complete') return { brainstorm: true, script: true, thumbs: true, art: true, publish: true };
  return undefined;
}

async function addLinks(projectId: string, comicKey: string, links: readonly LyreflyBundleLink[] | undefined): Promise<void> {
  if (!links?.length) return;
  const existing = await lyreflyDb.visualDevAssets.where('projectId').equals(projectId).toArray();
  const known = new Set(existing.map((a) => a.url).filter(Boolean));
  const now = new Date().toISOString();
  for (const link of links) {
    if (known.has(link.url)) continue;
    known.add(link.url);
    const asset: VisualDevAsset = {
      id: lyreflyStableId(`link:${comicKey}:${link.url}`),
      projectId,
      kind: 'link',
      title: link.title,
      url: link.url,
      tags: [],
      createdAt: now,
      updatedAt: now,
    };
    await lyreflyDb.visualDevAssets.put(asset);
    await markLyreflyDirtyRow('visual_dev', asset.id, 'upsert', projectId);
  }
}

async function writeScript(project: ComicProject, html: string): Promise<void> {
  const current = await lyreflyDb.scriptDocuments.get(project.scriptDocumentId);
  if (current && !isRichTextEmpty(current.markdown)) return; // never overwrite a script
  const blocks = parseScriptHtml(html);
  await lyreflyDb.scriptDocuments.put({
    id: project.scriptDocumentId,
    projectId: project.id,
    markdown: html,
    blocks,
    pacingWarnings: analyzeScriptPacing(blocks),
    updatedAt: new Date().toISOString(),
  });
  await markLyreflyDirtyRow('script', project.scriptDocumentId, 'upsert', project.id);
}

export type LyreflyBundleResult = { comicsCreated: number; comicsUpdated: number; ideasAdded: number };

export async function applyLyreflyBundleImport(plan: LyreflyBundlePlan): Promise<LyreflyBundleResult> {
  const result: LyreflyBundleResult = { comicsCreated: 0, comicsUpdated: 0, ideasAdded: 0 };
  const tables = [
    lyreflyDb.projects,
    lyreflyDb.scriptDocuments,
    lyreflyDb.visualDevAssets,
    lyreflyDb.sketchbookSeeds,
    lyreflyDb.dirtySync,
  ];
  try {
    for (const { comic, projectId } of plan.comics) {
      await lyreflyDb.transaction('rw', tables, async () => {
        const now = new Date().toISOString();
        // The database decides, not the plan: a re-run or a sync may have written it meanwhile.
        const existing = await lyreflyDb.projects.get(projectId);
        const project: ComicProject = existing
          ? {
              ...existing,
              importKey: existing.importKey ?? comic.key,
              pipelineStatus: existing.pipelineStatus ?? comic.pipelineStatus,
              priorityRank: existing.priorityRank ?? comic.priorityRank,
              stageCompletion: existing.stageCompletion ?? stagesDone(comic.pipelineStatus),
              brainstormHtml: isRichTextEmpty(existing.brainstormHtml) ? comic.brainstormHtml : existing.brainstormHtml,
              updatedAt: now,
            }
          : {
              ...createBlankComicProject(now),
              id: projectId,
              scriptDocumentId: lyreflyStableId(`script:${comic.key}`),
              title: comic.title,
              status: comic.pipelineStatus === 'complete' ? 'finished' : 'wip',
              importKey: comic.key,
              pipelineStatus: comic.pipelineStatus,
              priorityRank: comic.priorityRank,
              stageCompletion: stagesDone(comic.pipelineStatus),
              brainstormHtml: comic.brainstormHtml,
            };
        await lyreflyDb.projects.put(project);
        await markLyreflyDirtyRow('project', project.id, 'upsert', project.id);
        if (comic.scriptHtml) await writeScript(project, comic.scriptHtml);
        await addLinks(project.id, comic.key, comic.links);
        if (existing) result.comicsUpdated += 1;
        else result.comicsCreated += 1;
      });
    }

    const baseSort = await lyreflyDb.sketchbookSeeds.count();
    for (const [i, { seed, seedId }] of plan.seeds.entries()) {
      // Present already, or deleted since an earlier run (its marker holds this id): leave it.
      if (await lyreflyDb.sketchbookSeeds.get(seedId)) continue;
      const now = new Date().toISOString();
      const row: SketchbookSeed = {
        id: seedId,
        kind: seed.kind,
        title: seed.title,
        bodyHtml: seed.body,
        occurredOn: seed.occurredOn,
        attachments: seed.links?.map((link) => ({
          id: lyreflyStableId(`seed-link:${seed.key}:${link.url}`),
          kind: 'link' as const,
          title: link.title,
          url: link.url,
          createdAt: now,
        })),
        tags: [],
        status: 'active',
        sortOrder: baseSort + i,
        createdAt: now,
        updatedAt: now,
      };
      await lyreflyDb.sketchbookSeeds.put(row);
      await markLyreflyDirtyRow('sketchbook_seed', row.id, 'upsert');
      result.ideasAdded += 1;
    }
  } finally {
    notifyLyreflyLocalChange({ immediate: true });
  }
  return result;
}
