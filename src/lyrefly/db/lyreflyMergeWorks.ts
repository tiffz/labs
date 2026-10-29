import { isRichTextEmpty } from '../../shared/utils/richTextContent';
import { isLyreflyPackagePullPending } from '../drive/lyreflyPendingPackagePulls';
import { lyreflyStableId } from '../import/lyreflyStableId';
import { parseScriptHtml } from '../script/scriptHtmlParser';
import { analyzeScriptPacing } from '../script/scriptPacingAnalyzer';
import type { ComicProject, ScriptDocument, VisualDevAsset } from '../types';
import { lyreflyScriptHasText } from '../workflow/lyreflyWorkPhase';
import { notifyLyreflyLocalChange } from './lyreflyChangeBus';
import { lyreflyDb, markLyreflyDirtyRow } from './lyreflyDb';

/** Why a merge cannot run. Nothing has been written when this is thrown. */
export class LyreflyMergeError extends Error {}

export type LyreflyWorkMergePlan = {
  source: ComicProject;
  target: ComicProject;
  /** What the target gains, for the confirm dialog. */
  summary: string[];
  brainstormHtml?: string;
  script?: ScriptDocument;
  assets: { asset: VisualDevAsset; blob?: Blob }[];
};

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/**
 * Plan merging `source` into `target` (ADR 0031): the target gains the source's brainstorm notes,
 * script and brainstorm assets; the source is archived with `mergedIntoId`, never deleted.
 * Refuses, before anything is written, when it would have to guess or would lose something.
 */
export async function planLyreflyWorkMerge(sourceId: string, targetId: string): Promise<LyreflyWorkMergePlan> {
  if (sourceId === targetId) throw new LyreflyMergeError('Pick a different comic to merge into.');
  const [source, target] = await Promise.all([lyreflyDb.projects.get(sourceId), lyreflyDb.projects.get(targetId)]);
  if (!source || !target) throw new LyreflyMergeError('One of these comics is no longer here.');
  if (source.mergedIntoId) throw new LyreflyMergeError(`${source.title} was already merged into another comic.`);
  if (target.mergedIntoId) throw new LyreflyMergeError(`${target.title} was merged into another comic. Merge into that one.`);

  const sourcePages = await lyreflyDb.pageNodes.where('projectId').equals(source.id).count();
  if (sourcePages > 0) {
    throw new LyreflyMergeError(`${source.title} has pages. Merging pages is not supported yet; merge the other way round.`);
  }

  const [sourceScript, targetScript] = await Promise.all([
    lyreflyDb.scriptDocuments.get(source.scriptDocumentId),
    lyreflyDb.scriptDocuments.get(target.scriptDocumentId),
  ]);
  // A script this device has not downloaded yet looks empty: merging would drop the source's
  // words, or write over the target's. Same rule as `lyreflyWorkPhase`'s packageOnDevice.
  for (const [work, doc] of [[source, sourceScript], [target, targetScript]] as const) {
    if (isLyreflyPackagePullPending(work.id) || (!work.projectFolderId && !doc)) {
      throw new LyreflyMergeError(`${work.title} has not finished syncing to this device. Try again in a moment.`);
    }
  }

  const summary: string[] = [];
  const heading = `<h2>${escapeHtml(source.title || 'Untitled')}</h2>`;

  let brainstormHtml: string | undefined;
  if (!isRichTextEmpty(source.brainstormHtml)) {
    brainstormHtml = `${target.brainstormHtml ?? ''}${heading}${source.brainstormHtml}`;
    summary.push('Brainstorm notes');
  }

  let script: ScriptDocument | undefined;
  if (sourceScript && lyreflyScriptHasText(sourceScript.markdown)) {
    const kept = targetScript && lyreflyScriptHasText(targetScript.markdown) ? targetScript.markdown : '';
    const markdown = `${kept}${heading}${sourceScript.markdown}`;
    const blocks = parseScriptHtml(markdown);
    script = {
      id: target.scriptDocumentId,
      projectId: target.id,
      markdown,
      blocks,
      pacingWarnings: analyzeScriptPacing(blocks),
      updatedAt: new Date().toISOString(),
    };
    summary.push('Script');
  }

  const sourceAssets = await lyreflyDb.visualDevAssets.where('projectId').equals(source.id).toArray();
  const assets: LyreflyWorkMergePlan['assets'] = [];
  for (const asset of sourceAssets) {
    // Derived, so a retried merge rewrites the same rows instead of adding a second copy.
    const id = lyreflyStableId(`merge:${source.id}:${asset.id}`);
    const copy: VisualDevAsset = { ...asset, id, projectId: target.id };
    if (!asset.fileName) {
      assets.push({ asset: copy });
      continue;
    }
    // A file already on Drive is referenced where it is; one only on this device is copied.
    if (asset.driveFileId) {
      assets.push({ asset: copy });
      continue;
    }
    const local = await lyreflyDb.visualDevBlobs.get(asset.id);
    if (!local?.blob) {
      throw new LyreflyMergeError(`"${asset.fileName}" is not on this device or in Drive yet. Sync, then try again.`);
    }
    assets.push({ asset: copy, blob: local.blob });
  }
  if (assets.length) summary.push(plural(assets.length, 'brainstorm item'));

  return { source, target, summary, brainstormHtml, script, assets };
}

/** Carry out a plan. All local writes land together or not at all. */
export async function mergeLyreflyWork(plan: LyreflyWorkMergePlan): Promise<ComicProject> {
  const now = new Date().toISOString();
  const target: ComicProject = {
    ...plan.target,
    brainstormHtml: plan.brainstormHtml ?? plan.target.brainstormHtml,
    updatedAt: now,
  };
  const source: ComicProject = { ...plan.source, status: 'archived', mergedIntoId: target.id, updatedAt: now };

  await lyreflyDb.transaction(
    'rw',
    [lyreflyDb.projects, lyreflyDb.scriptDocuments, lyreflyDb.visualDevAssets, lyreflyDb.visualDevBlobs, lyreflyDb.dirtySync],
    async () => {
      if (plan.script) {
        await lyreflyDb.scriptDocuments.put(plan.script);
        await markLyreflyDirtyRow('script', plan.script.id, 'upsert', target.id);
      }
      for (const { asset, blob } of plan.assets) {
        if (blob) await lyreflyDb.visualDevBlobs.put({ assetId: asset.id, blob });
        await lyreflyDb.visualDevAssets.put({ ...asset, updatedAt: now });
        await markLyreflyDirtyRow('visual_dev', asset.id, 'upsert', target.id);
      }
      await lyreflyDb.projects.put(target);
      await markLyreflyDirtyRow('project', target.id, 'upsert', target.id);
      await lyreflyDb.projects.put(source);
      await markLyreflyDirtyRow('project', source.id, 'upsert', source.id);
    },
  );
  notifyLyreflyLocalChange({ immediate: true });
  return target;
}
