import { encoreLyricsPlainText, type EncoreOriginalSummary } from '../../shared/federation/encoreOriginalsReader';
import { lyreflyDb, markLyreflyDirtyRow } from '../db/lyreflyDb';
import { saveLyreflyProject } from '../db/lyreflyProjectMutations';
import { lyreflyStableId } from '../import/lyreflyStableId';
import { createBlankComicProject, createBlankScriptDocument, type ComicProject } from '../types';

/** One comic per song: the id derives from the song, so a second device or a retry finds it. */
export function lyreflyWorkIdForSong(songId: string): string {
  return lyreflyStableId(`work-from-song:${songId}`);
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Start a comic idea from an Encore original (ADR 0032). It lands in the Sketchbook with the lyrics
 * quoted on its brainstorm notes and a snapshot of the song in `sources`. Encore is not touched.
 */
export async function startComicFromEncoreSong(song: EncoreOriginalSummary): Promise<ComicProject> {
  const id = lyreflyWorkIdForSong(song.id);
  const existing = await lyreflyDb.projects.get(id);
  if (existing) return existing;

  const now = new Date().toISOString();
  const lyrics = encoreLyricsPlainText(song.lyricsAndChords);
  const project: ComicProject = {
    ...createBlankComicProject(now),
    id,
    scriptDocumentId: lyreflyStableId(`work-from-song:${song.id}:script`),
    title: song.title,
    brainstormHtml: lyrics
      ? `<blockquote>${lyrics
          .split('\n')
          .map((line) => `<p>${escapeHtml(line)}</p>`)
          .join('')}</blockquote>`
      : undefined,
    sources: [
      {
        kind: 'encore-original',
        songId: song.id,
        snapshot: { title: song.title, lyricsAndChords: song.lyricsAndChords, songUpdatedAt: song.updatedAt, takenAt: now },
      },
    ],
  };
  const script = { ...createBlankScriptDocument(id, now), id: project.scriptDocumentId };
  await lyreflyDb.scriptDocuments.put(script);
  await markLyreflyDirtyRow('script', script.id, 'upsert', id);
  return saveLyreflyProject(project, { immediate: true });
}
