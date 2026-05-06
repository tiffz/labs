import type {
  EncoreCharacterNineQuestionsExerciseRun,
  EncoreLyricsExerciseSection,
  EncoreLyricsInOwnWordsExerciseRun,
  EncorePracticeExerciseKind,
  EncorePracticeExerciseRun,
  EncoreSong,
} from '../types';

/** Short prompts only. Descriptive paragraphs from published sources are intentionally omitted. */
export const ENCORE_CHARACTER_NINE_QUESTION_TITLES = [
  'Who am I?',
  'What time is it?',
  'Where am I?',
  'What surrounds me?',
  'What are the given circumstances?',
  'What are my relationships?',
  'What do I want?',
  'What is in my way?',
  'What do I do to get what I want?',
] as const;

export const ENCORE_CHARACTER_NINE_QUESTION_COUNT = ENCORE_CHARACTER_NINE_QUESTION_TITLES.length;

export const ENCORE_PRACTICE_EXERCISE_CATALOG: Record<
  EncorePracticeExerciseKind,
  { title: string; description: string }
> = {
  lyricsInOwnWords: {
    title: 'Lyrics in your own words',
    description: 'Rewrite each line in plain language so the story lands in your voice.',
  },
  characterNineQuestions: {
    title: 'Nine character questions',
    description: 'Answer tight prompts about who you are in the song, moment by moment.',
  },
};

export function geniusSearchUrlForSong(title: string, artist: string): string {
  const q = `${title} ${artist}`.trim();
  return `https://genius.com/search?q=${encodeURIComponent(q)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lyrics: Genius-style section parsing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Matches a section header on its own line. Captures everything between the brackets so callers
 * can preserve the full label (`[Verse 1: feat. Amy Lee]` → `Verse 1: feat. Amy Lee`). Anchored
 * so a lyric line that happens to contain brackets isn't mistaken for a header.
 */
const SECTION_HEADER_RE = /^\s*\[([^\]]+)\]\s*$/;

/**
 * Parse a Genius-format lyrics paste into ordered sections. Lines before any header land in a
 * leading anonymous section (`title === ''`). Blank lines are dropped (they're stanza-breaks
 * within a section, not data). Two sections with the same header (`[Chorus]` x 3) are kept as
 * separate ordered entries; downstream merge logic uses the occurrence index to align rewrites.
 *
 * Accepts the example format used in `My Immortal` etc.:
 *
 * ```
 * [Verse 1]
 * I'm so tired of being here
 * [Chorus]
 * When you cried, I'd wipe…
 * ```
 */
export function parseGeniusLyricsIntoSections(raw: string): EncoreLyricsExerciseSection[] {
  if (!raw || !raw.trim()) return [];
  const sections: EncoreLyricsExerciseSection[] = [];
  let current: EncoreLyricsExerciseSection = { title: '', lines: [] };

  for (const rawLine of raw.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;
    const headerMatch = SECTION_HEADER_RE.exec(trimmed);
    if (headerMatch) {
      // Flush the in-progress section if it has any content; an empty leading anonymous section
      // would just be visual noise so it's skipped.
      if (current.lines.length > 0 || current.title) {
        sections.push(current);
      }
      current = { title: headerMatch[1]!.trim(), lines: [] };
      continue;
    }
    current.lines.push({ original: trimmed, rewrite: '' });
  }
  if (current.lines.length > 0 || current.title) {
    sections.push(current);
  }
  return sections;
}

/**
 * When the user re-pastes / edits the lyrics, preserve their previous rewrites + section notes
 * wherever the new parse still has the same section (by title + occurrence) and the same line
 * (by `original` text). Anything that no longer has a match is dropped — that's the right
 * tradeoff because the user has explicitly told us the lyrics changed.
 */
export function mergeParsedSectionsWithExisting(
  parsed: EncoreLyricsExerciseSection[],
  existing: EncoreLyricsExerciseSection[],
): EncoreLyricsExerciseSection[] {
  const seenInExisting = new Map<string, number>();
  const rewriteByKey = new Map<string, string>();
  const notesByKey = new Map<string, string>();

  for (const sec of existing) {
    const titleKey = sec.title.trim().toLowerCase();
    const occ = seenInExisting.get(titleKey) ?? 0;
    seenInExisting.set(titleKey, occ + 1);
    const sectionKey = `${titleKey}#${occ}`;
    if (sec.notes && sec.notes.trim()) notesByKey.set(sectionKey, sec.notes);
    for (const line of sec.lines) {
      if (line.rewrite.trim()) {
        rewriteByKey.set(`${sectionKey}|${line.original}`, line.rewrite);
      }
    }
  }

  const seenInParsed = new Map<string, number>();
  return parsed.map((sec) => {
    const titleKey = sec.title.trim().toLowerCase();
    const occ = seenInParsed.get(titleKey) ?? 0;
    seenInParsed.set(titleKey, occ + 1);
    const sectionKey = `${titleKey}#${occ}`;
    const notes = notesByKey.get(sectionKey);
    return {
      title: sec.title,
      ...(notes ? { notes } : {}),
      lines: sec.lines.map((line) => ({
        original: line.original,
        rewrite: rewriteByKey.get(`${sectionKey}|${line.original}`) ?? '',
      })),
    };
  });
}

/**
 * Read sections from a run, normalizing legacy runs (which have a flat `lines` array but no
 * `sections`) into a single anonymous section. Returns a fresh array; callers may mutate.
 */
export function effectiveLyricsSections(
  run: EncoreLyricsInOwnWordsExerciseRun,
): EncoreLyricsExerciseSection[] {
  if (run.sections && run.sections.length > 0) {
    return run.sections.map((s) => ({
      title: s.title,
      lines: s.lines.map((l) => ({ ...l })),
      ...(s.notes ? { notes: s.notes } : {}),
    }));
  }
  if (run.lines && run.lines.length > 0) {
    return [{ title: '', lines: run.lines.map((l) => ({ ...l })) }];
  }
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Run lifecycle
// ─────────────────────────────────────────────────────────────────────────────

export function newLyricsInOwnWordsRun(): EncoreLyricsInOwnWordsExerciseRun {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    kind: 'lyricsInOwnWords',
    status: 'draft',
    startedAt: now,
    updatedAt: now,
    sections: [],
  };
}

export function newCharacterNineQuestionsRun(): EncoreCharacterNineQuestionsExerciseRun {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    kind: 'characterNineQuestions',
    status: 'draft',
    startedAt: now,
    updatedAt: now,
    answers: Array.from({ length: ENCORE_CHARACTER_NINE_QUESTION_COUNT }, () => ''),
  };
}

export function touchExerciseRun(run: EncorePracticeExerciseRun): EncorePracticeExerciseRun {
  return { ...run, updatedAt: new Date().toISOString() };
}

export function markExerciseRunCompleted(run: EncorePracticeExerciseRun): EncorePracticeExerciseRun {
  const now = new Date().toISOString();
  return { ...run, status: 'completed', updatedAt: now, completedAt: now };
}

// ─────────────────────────────────────────────────────────────────────────────
// Single-run-per-kind helpers
//
// The data model stores `practiceExerciseRuns` as a flat array (kept that shape for backward
// compat with already-persisted song rows + Drive snapshots). The UI now treats it as a single
// run per kind: a user only ever has one in-flight or completed lyrics rewrite per song. These
// helpers enforce that invariant on writes and tolerate legacy multi-run rows on reads (newest
// wins).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pick the run a user should see for a given kind. Prefers an in-progress draft over a completed
 * run (drafts are what they were last working on); within each status, newest by `updatedAt` /
 * `completedAt` wins. Returns `undefined` when no run of that kind exists.
 */
export function getSingleRunForKind(
  song: EncoreSong,
  kind: EncorePracticeExerciseKind,
): EncorePracticeExerciseRun | undefined {
  const all = (song.practiceExerciseRuns ?? []).filter((r) => r.kind === kind);
  if (all.length === 0) return undefined;
  const drafts = all
    .filter((r) => r.status === 'draft')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (drafts.length > 0) return drafts[0];
  return [...all].sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))[0];
}

/**
 * Replace any existing run(s) of the same kind with this one. Maintains the single-run invariant
 * even on legacy rows that may still hold multiple runs of the same kind.
 */
export function setSingleRunForKind(
  song: EncoreSong,
  run: EncorePracticeExerciseRun,
): EncoreSong {
  const others = (song.practiceExerciseRuns ?? []).filter((r) => r.kind !== run.kind);
  return { ...song, practiceExerciseRuns: [...others, run] };
}

/** Remove all runs of the given kind. Used by "Clear draft". */
export function removeRunForKind(
  song: EncoreSong,
  kind: EncorePracticeExerciseKind,
): EncoreSong {
  const remaining = (song.practiceExerciseRuns ?? []).filter((r) => r.kind !== kind);
  return { ...song, practiceExerciseRuns: remaining };
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress
// ─────────────────────────────────────────────────────────────────────────────

export function lyricsRewriteProgressFromSections(
  sections: EncoreLyricsExerciseSection[],
): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const sec of sections) {
    for (const line of sec.lines) {
      total += 1;
      if (line.rewrite.trim().length > 0) done += 1;
    }
  }
  return { done, total };
}

export function nineQuestionsProgress(answers: string[]): { done: number; total: number } {
  const total = ENCORE_CHARACTER_NINE_QUESTION_COUNT;
  const done = answers.filter((a) => a.trim().length > 0).length;
  return { done, total };
}

/** Friendly summary line for the section card (e.g. `"4 of 24 lines"`, `"3 of 9 answered"`). */
export function formatExerciseRunSummary(run: EncorePracticeExerciseRun): string {
  if (run.kind === 'lyricsInOwnWords') {
    const { done, total } = lyricsRewriteProgressFromSections(effectiveLyricsSections(run));
    if (total === 0) return 'Not started';
    return `${done} of ${total} lines`;
  }
  const { done, total } = nineQuestionsProgress(run.answers);
  return `${done} of ${total} answered`;
}
