import { isRichTextEmpty } from '../../shared/utils/richTextContent';
import { DEFAULT_SCRIPT_HTML } from '../script/defaultScriptSample';
import type { ComicProject } from '../types';

/**
 * Where a work shows (ADR 0031). Sketchbook: `idea`. Workbench: `developing`. Library: `complete`.
 * `null` means this device does not hold the work's package yet, so nothing is known: a view must
 * not file it as an idea just because its script and pages have not arrived.
 */
export type LyreflyWorkPhase = 'idea' | 'developing' | 'complete';

export type LyreflyWorkPhaseContext = {
  scriptMarkdown?: string | null;
  pageNodeCount: number;
  publishLogCount: number;
  /** False while the project is a summary stub awaiting its Drive package. */
  packageOnDevice: boolean;
};

function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const SAMPLE_SCRIPT_TEXT = plainText(DEFAULT_SCRIPT_HTML);

/**
 * True when the script holds words the owner wrote. New scripts start as the courier sample, and
 * opening the Script tab writes it; neither is the owner developing the comic.
 */
export function lyreflyScriptHasText(markdown: string | null | undefined): boolean {
  if (isRichTextEmpty(markdown ?? undefined)) return false;
  return plainText(markdown!) !== SAMPLE_SCRIPT_TEXT;
}

export function lyreflyWorkPhase(project: ComicProject, ctx: LyreflyWorkPhaseContext): LyreflyWorkPhase | null {
  if (project.status === 'finished' || ctx.publishLogCount > 0) return 'complete';
  if (project.developingAt) return 'developing';
  if (ctx.pageNodeCount > 0) return 'developing';
  if (!ctx.packageOnDevice) return null;
  if (lyreflyScriptHasText(ctx.scriptMarkdown)) return 'developing';
  return 'idea';
}
