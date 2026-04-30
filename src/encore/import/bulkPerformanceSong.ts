import { buildBulkVideoFilenameCandidates } from './bulkVideoFilenameCandidates';
import { libraryTitleMatchHeads } from './libraryTitleMatchHeads';
import { diceCoefficient } from './matchPlaylists';
import type { EncoreSong } from '../types';

const MAX_INDEXABLE_SNIP = 2000;

export function fileBaseName(fileName: string): string {
  const t = fileName.trim();
  if (!t) return '';
  return t.replace(/\.[^./\\]+$/i, '').trim() || t;
}

/**
 * Text blob used to fuzzy-match a Drive video to library songs. Combines file name, optional Drive
 * `description` / indexable hints, and parent-folder breadcrumb (Google does not expose Drive UI “AI summaries”
 * on the Files resource; this uses documented metadata only).
 */
export function buildBulkVideoMatchText(input: {
  fileName: string;
  description?: string;
  parentPathHint?: string;
  indexableText?: string;
}): string {
  const idx = (input.indexableText ?? '').trim().slice(0, MAX_INDEXABLE_SNIP);
  const parts = [
    input.fileName.trim(),
    (input.description ?? '').trim(),
    (input.parentPathHint ?? '').replace(/\s*\/\s*/g, ' ').trim(),
    idx,
  ].filter(Boolean);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/** Best dice match between filename-derived candidates and a single string (title or title+artist). */
export function bestFilenameCandidateDice(fileName: string, against: string): number {
  const target = against.trim();
  if (!target) return 0;
  let m = 0;
  for (const c of buildBulkVideoFilenameCandidates(fileName)) {
    m = Math.max(m, diceCoefficient(c, target));
  }
  return m;
}

function bestFilenameCandidateDiceAgainstTitleHeads(fileName: string, heads: readonly string[], artist: string): number {
  let m = 0;
  const ar = artist.trim();
  for (const h of heads) {
    m = Math.max(m, bestFilenameCandidateDice(fileName, h));
    if (ar) {
      m = Math.max(m, bestFilenameCandidateDice(fileName, `${h} ${ar}`));
    }
  }
  return m;
}

export function scoreBulkVideoAgainstSong(
  input: {
    fileName: string;
    description?: string;
    parentPathHint?: string;
    indexableText?: string;
  },
  song: EncoreSong,
): number {
  const hay = buildBulkVideoMatchText(input);
  const titleHeads = libraryTitleMatchHeads(song.title);
  const artist = song.artist.trim();
  let score = 0;
  if (hay) {
    for (const head of titleHeads) {
      const fullHead = artist ? `${head} ${artist}` : head;
      score = Math.max(score, diceCoefficient(hay, fullHead), diceCoefficient(hay, head));
    }
  }
  const filenameTitleDice = bestFilenameCandidateDiceAgainstTitleHeads(input.fileName, titleHeads, artist);
  score = Math.max(score, filenameTitleDice);

  const h = hay.toLowerCase();
  const weakFilenameSignal = filenameTitleDice < 0.12;
  const longestIncludedHead = titleHeads
    .map((head) => head.toLowerCase())
    .filter((ht) => ht.length >= 5 && h.includes(ht))
    .sort((a, b) => b.length - a.length)[0];
  if (longestIncludedHead) {
    // Camera-roll style names (IMG_…) carry almost no title signal; rely more on description/path.
    if (weakFilenameSignal && longestIncludedHead.length >= 6) {
      score = Math.min(1, score + 0.18);
    } else {
      score = Math.min(1, score + 0.06);
    }
  }
  return score;
}

export function pickBestLibrarySongForBulkVideo(
  songs: EncoreSong[],
  input: {
    fileName: string;
    description?: string;
    parentPathHint?: string;
    indexableText?: string;
  },
  minScore = 0.4,
): EncoreSong | null {
  let best: EncoreSong | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  let bestTie = Number.NEGATIVE_INFINITY;
  for (const s of songs) {
    const sc = scoreBulkVideoAgainstSong(input, s);
    const tie = bestFilenameCandidateDiceAgainstTitleHeads(
      input.fileName,
      libraryTitleMatchHeads(s.title),
      s.artist.trim(),
    );
    if (sc > bestScore + 1e-9 || (Math.abs(sc - bestScore) < 1e-9 && tie > bestTie + 1e-9)) {
      bestScore = sc;
      bestTie = tie;
      best = s;
    }
  }
  return best != null && bestScore >= minScore ? best : null;
}

/** Synthetic incoming song for library similarity (same pattern as playlist import). */
export function bulkVideoIncomingSong(row: {
  id: string;
  name: string;
  venue: string;
  driveDescription?: string;
  parentPathHint?: string;
  driveIndexableText?: string;
}): EncoreSong {
  const now = new Date().toISOString();
  const hint = buildBulkVideoMatchText({
    fileName: row.name,
    description: row.driveDescription,
    parentPathHint: row.parentPathHint,
    indexableText: row.driveIndexableText,
  });
  const artistBits = [row.venue.trim(), hint.slice(0, 400)].filter(Boolean);
  return {
    id: row.id,
    title: fileBaseName(row.name),
    artist: artistBits.join(' · ') || 'Unknown venue',
    journalMarkdown: '',
    createdAt: now,
    updatedAt: now,
  };
}

export function encoreSongFromManualTitleArtist(title: string, artist: string, now: string): EncoreSong {
  return {
    id: crypto.randomUUID(),
    title: title.trim() || 'Untitled',
    artist: artist.trim() || 'Unknown artist',
    journalMarkdown: '',
    createdAt: now,
    updatedAt: now,
  };
}
