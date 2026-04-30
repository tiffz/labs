import type { EncoreSong } from '../types';
import { libraryTitleMatchHeads } from './libraryTitleMatchHeads';
import { diceCoefficient, normalizeForMatch } from './matchPlaylists';
import { bestFilenameCandidateDice } from './bulkPerformanceSong';
import type { ParsedScoreFilename } from './parseScoreFilename';

/**
 * Decide which library song (if any) a parsed score belongs to.
 *
 * Reuses the existing fuzzy-match stack (Dice on filename candidates +
 * library-title heads, with parsed title/artist signals) to keep behavior
 * consistent with bulk performance video import.
 */

const MIN_MATCH_SCORE = 0.42;

export function scoreParsedAgainstSong(parsed: ParsedScoreFilename, song: EncoreSong): number {
  const titleHeads = libraryTitleMatchHeads(song.title);
  const artist = song.artist.trim();
  let score = 0;

  /* Dice between the parsed title (and parsed-title + parsed-artist) and library heads. */
  const parsedTitleNorm = normalizeForMatch(parsed.title);
  if (parsedTitleNorm) {
    for (const head of titleHeads) {
      score = Math.max(score, diceCoefficient(parsedTitleNorm, normalizeForMatch(head)));
      if (artist) {
        score = Math.max(
          score,
          diceCoefficient(parsedTitleNorm, normalizeForMatch(`${head} ${artist}`)),
        );
      }
    }
    if (parsed.artist) {
      const parsedArtistNorm = normalizeForMatch(parsed.artist);
      for (const head of titleHeads) {
        score = Math.max(
          score,
          diceCoefficient(`${parsedTitleNorm} ${parsedArtistNorm}`, normalizeForMatch(`${head} ${artist}`)),
        );
      }
    }
  }

  /* Filename candidates against library heads — handles cases where the
     primary title parse missed a segment. */
  for (const head of titleHeads) {
    score = Math.max(score, bestFilenameCandidateDice(parsed.base || parsed.raw, head));
    if (artist) {
      score = Math.max(score, bestFilenameCandidateDice(parsed.base || parsed.raw, `${head} ${artist}`));
    }
  }

  /* Substring boost when the longest library title head is contained in the
     parsed title — small but valuable for short titles like "Burn" or "Memory". */
  const lcParsed = parsed.title.toLowerCase();
  const longest = titleHeads
    .map((h) => h.toLowerCase())
    .filter((h) => h.length >= 4 && lcParsed.includes(h))
    .sort((a, b) => b.length - a.length)[0];
  if (longest) {
    score = Math.min(1, score + (longest.length >= 6 ? 0.12 : 0.06));
  }

  return score;
}

/**
 * Auxiliary tiebreaker score (0..1): how well do the parsed artist and library
 * artist match? Used to break ties when two library songs score identically
 * on title (e.g. two songs called "Kaleidoscope" by different artists).
 */
function artistTieScore(parsed: ParsedScoreFilename, song: EncoreSong): number {
  const parsedArtist = parsed.artist?.trim();
  const libArtist = song.artist.trim();
  if (!parsedArtist || !libArtist) return 0;
  const a = normalizeForMatch(parsedArtist);
  const b = normalizeForMatch(libArtist);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.85;
  return diceCoefficient(a, b);
}

/** Returns the best library song for a parsed score, or null when below threshold. */
export function pickLibrarySongForScore(
  songs: readonly EncoreSong[],
  parsed: ParsedScoreFilename,
  minScore: number = MIN_MATCH_SCORE,
): EncoreSong | null {
  let best: EncoreSong | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  let bestTie = Number.NEGATIVE_INFINITY;
  for (const s of songs) {
    const sc = scoreParsedAgainstSong(parsed, s);
    const tie = artistTieScore(parsed, s);
    if (sc > bestScore + 1e-9 || (Math.abs(sc - bestScore) < 1e-9 && tie > bestTie + 1e-9)) {
      bestScore = sc;
      bestTie = tie;
      best = s;
    }
  }
  return best && bestScore >= minScore ? best : null;
}
