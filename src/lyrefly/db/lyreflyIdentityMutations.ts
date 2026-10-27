/**
 * Pen names, series and accounts. Nothing here deletes: rows are retired so that credits and
 * publications pointing at them keep their meaning, and so sync needs no delete records.
 */
import { lyreflyDb } from './lyreflyDb';
import { notifyLyreflyLocalChange } from './lyreflyChangeBus';
import { saveLyreflyProject } from './lyreflyProjectMutations';
import type { ComicProject, LyreflyAccount, LyreflyPersona, LyreflySeries } from '../types';
import { classifyLyreflyLink } from '../utils/lyreflyAccountUrl';

const now = (): string => new Date().toISOString();

export async function createLyreflyPersona(name: string): Promise<LyreflyPersona> {
  const row: LyreflyPersona = { id: crypto.randomUUID(), name: name.trim(), updatedAt: now() };
  await lyreflyDb.personas.put(row);
  notifyLyreflyLocalChange();
  return row;
}

export async function createLyreflySeries(title: string): Promise<LyreflySeries> {
  const row: LyreflySeries = { id: crypto.randomUUID(), title: title.trim(), updatedAt: now() };
  await lyreflyDb.series.put(row);
  notifyLyreflyLocalChange();
  return row;
}

export async function renameLyreflyPersona(persona: LyreflyPersona, name: string): Promise<void> {
  if (!name.trim() || name.trim() === persona.name) return;
  await lyreflyDb.personas.put({ ...persona, name: name.trim(), updatedAt: now() });
  notifyLyreflyLocalChange();
}

export async function renameLyreflySeries(series: LyreflySeries, title: string): Promise<void> {
  if (!title.trim() || title.trim() === series.title) return;
  await lyreflyDb.series.put({ ...series, title: title.trim(), updatedAt: now() });
  notifyLyreflyLocalChange();
}

export type AddAccountResult = { ok: true; account: LyreflyAccount } | { ok: false; reason: string };

/** Add an account from a pasted profile link. A post link is refused with the reason. */
export async function addLyreflyAccountFromUrl(
  rawUrl: string,
  owner: LyreflyAccount['owner'],
): Promise<AddAccountResult> {
  const link = classifyLyreflyLink(rawUrl);
  if (!link) return { ok: false, reason: 'That is not a link Lyrefly can read.' };
  if (link.kind === 'post') {
    return { ok: false, reason: 'That links to a post. Paste the profile link instead.' };
  }
  const existing = (await lyreflyDb.accounts.toArray()).find(
    (a) => a.platform === link.platform && a.handle.toLowerCase() === link.handle.toLowerCase(),
  );
  if (existing && !existing.retiredAt) return { ok: false, reason: `${link.platform} ${link.handle} is already listed.` };
  const account: LyreflyAccount = existing
    ? { ...existing, owner, retiredAt: undefined, updatedAt: now() }
    : { id: crypto.randomUUID(), platform: link.platform, handle: link.handle, url: link.url, owner, updatedAt: now() };
  await lyreflyDb.accounts.put(account);
  notifyLyreflyLocalChange();
  return { ok: true, account };
}

function retiredPatch(retired: boolean): { retiredAt: string | undefined; updatedAt: string } {
  return { retiredAt: retired ? now() : undefined, updatedAt: now() };
}

export async function setLyreflyPersonaRetired(persona: LyreflyPersona, retired: boolean): Promise<void> {
  await lyreflyDb.personas.put({ ...persona, ...retiredPatch(retired) });
  notifyLyreflyLocalChange();
}

export async function setLyreflySeriesRetired(series: LyreflySeries, retired: boolean): Promise<void> {
  await lyreflyDb.series.put({ ...series, ...retiredPatch(retired) });
  notifyLyreflyLocalChange();
}

export async function setLyreflyAccountRetired(account: LyreflyAccount, retired: boolean): Promise<void> {
  await lyreflyDb.accounts.put({ ...account, ...retiredPatch(retired) });
  notifyLyreflyLocalChange();
}

export async function setLyreflyComicCredit(project: ComicProject, personaId: string | null): Promise<void> {
  await saveLyreflyProject({ ...project, personaIds: personaId ? [personaId] : [] });
}

export async function setLyreflyComicSeries(project: ComicProject, seriesId: string | null): Promise<void> {
  // null, not undefined: "no series" must beat an older device's series when they merge.
  await saveLyreflyProject({ ...project, seriesId });
}
