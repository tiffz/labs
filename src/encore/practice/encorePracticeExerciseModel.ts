import type {
  EncoreCharacterNineQuestionsExerciseRun,
  EncoreLyricsExerciseSection,
  EncoreLyricsInOwnWordsExerciseRun,
  EncoreLyricsSectionNarrativeExerciseRun,
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
    description: 'Rewrite each line in your own voice.',
  },
  lyricsSectionNarrative: {
    title: 'Section by section',
    description:
      'Describe the story in each part of the song. When a chorus repeats, treat each pass as its own moment in the arc.',
  },
  characterNineQuestions: {
    title: 'Nine character questions',
    description: "Deepen your connection to the song's character and moment.",
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
 * Parse a Genius-format lyrics paste into ordered sections. Two complementary rules drive the
 * split:
 *   1. `[Header]` lines start a new section AND set its title (Genius-style markers).
 *   2. A blank line between content lines also starts a new section, with an empty title.
 *
 * Rule (2) is what makes raw paragraph pastes work — when the user pastes plain lyrics with no
 * `[Verse]` / `[Chorus]` markers, double line breaks become implicit section boundaries. The UI
 * labels untitled sections "Section 1", "Section 2" via {@link lyricsExerciseSectionDisplayLabel}
 * and lets the user rename them in place.
 *
 * Two sections with the same header (`[Chorus]` x 3) are kept as separate ordered entries;
 * downstream merge logic uses the occurrence index to align rewrites.
 *
 * Accepts the canonical Genius format:
 *
 * ```
 * [Verse 1]
 * I'm so tired of being here
 * [Chorus]
 * When you cried, I'd wipe…
 * ```
 *
 * …and bare paragraph form:
 *
 * ```
 * First stanza line one
 * First stanza line two
 *
 * Second stanza line one
 * ```
 */
export function parseGeniusLyricsIntoSections(raw: string): EncoreLyricsExerciseSection[] {
  if (!raw || !raw.trim()) return [];
  const sections: EncoreLyricsExerciseSection[] = [];
  let current: EncoreLyricsExerciseSection = { title: '', lines: [] };
  /**
   * Set when we hit a blank line and unset on the next non-blank line. Deferring the flush
   * lets us drop an empty section when the next non-blank line happens to be a `[Header]`
   * (which creates its own section anyway), so a Genius paste like `[Verse]\nA\n\n[Chorus]\nB`
   * still produces just two sections rather than one with an empty section sandwiched in.
   */
  let pendingBlank = false;

  for (const rawLine of raw.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      pendingBlank = true;
      continue;
    }
    const headerMatch = SECTION_HEADER_RE.exec(trimmed);
    if (headerMatch) {
      if (current.lines.length > 0 || current.title) {
        sections.push(current);
      }
      current = { title: headerMatch[1]!.trim(), lines: [] };
      pendingBlank = false;
      continue;
    }
    if (pendingBlank && current.lines.length > 0) {
      sections.push(current);
      current = { title: '', lines: [] };
    }
    pendingBlank = false;
    current.lines.push({ original: trimmed, rewrite: '' });
  }
  if (current.lines.length > 0 || current.title) {
    sections.push(current);
  }
  return sections;
}

/**
 * Serialize structured sections to Genius-style plain text so inline edits to originals can be
 * re-parsed (new `[Chorus]` lines, merged lines, etc.). Sections are separated by a single
 * blank line — necessary so untitled sections (paragraph form) round-trip through
 * {@link parseGeniusLyricsIntoSections} without merging into one big section. For titled
 * sections the blank line is purely decorative (the `[Header]` line is already a hard
 * boundary).
 */
export function serializeLyricsSectionsToRaw(sections: EncoreLyricsExerciseSection[]): string {
  const blocks: string[] = [];
  for (const sec of sections) {
    const block: string[] = [];
    if (sec.title.trim()) {
      block.push(`[${sec.title.trim()}]`);
    }
    for (const line of sec.lines) {
      for (const chunk of line.original.split(/\r?\n/)) {
        const t = chunk.trim();
        if (t) block.push(t);
      }
    }
    if (block.length > 0) blocks.push(block.join('\n'));
  }
  return blocks.join('\n\n');
}

/**
 * When the user re-pastes / edits the lyrics, preserve their previous rewrites wherever the new
 * parse still has the same section (by title + occurrence) and the same line (by `original` text).
 * Anything that no longer has a match is dropped — that's the right tradeoff because the user has
 * explicitly told us the lyrics changed.
 */
export function mergeParsedSectionsWithExisting(
  parsed: EncoreLyricsExerciseSection[],
  existing: EncoreLyricsExerciseSection[],
): EncoreLyricsExerciseSection[] {
  const seenInExisting = new Map<string, number>();
  const rewriteByKey = new Map<string, string>();

  for (const sec of existing) {
    const titleKey = sec.title.trim().toLowerCase();
    const occ = seenInExisting.get(titleKey) ?? 0;
    seenInExisting.set(titleKey, occ + 1);
    const sectionKey = `${titleKey}#${occ}`;
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
    return {
      title: sec.title,
      lines: sec.lines.map((line) => ({
        original: line.original,
        rewrite: rewriteByKey.get(`${sectionKey}|${line.original}`) ?? '',
      })),
    };
  });
}

/**
 * When Genius lyrics on the song change, keep section narrative entries aligned with the new
 * parse. Two-pass strategy:
 *
 *   1. **Titled sections** (`[Verse 1]`, `[Chorus]`, …) match by title + occurrence (same
 *      strategy as {@link mergeParsedSectionsWithExisting}). This handles inserts, deletes,
 *      and reorders of explicit-header sections cleanly.
 *   2. **Untitled (implicit-paragraph) sections** fall back to the section at the same index
 *      in `existing`, preserving **both** narrative and any user-set title. That last bit is
 *      what lets the user rename `Section 1` → `Outro` in the narrative editor (or via the
 *      lyrics rewriter, which round-trips empty titles through `serializeLyricsSectionsToRaw`)
 *      and survive a subsequent re-paste of the same plain-paragraph lyrics.
 *
 * Trade-off: removing a `[Header]` from the lyrics source no longer clears that section's
 * narrative title — it sticks until the user clears it inline. That trade is worth it: it
 * preserves user customizations through normal edit flows, and the user can always clear a
 * stale title by editing the field directly.
 */
export function mergeParsedNarrativeSectionsWithExisting(
  parsedLyricSections: EncoreLyricsExerciseSection[],
  existing: EncoreLyricsSectionNarrativeExerciseRun['sections'],
): EncoreLyricsSectionNarrativeExerciseRun['sections'] {
  const seenInExisting = new Map<string, number>();
  const narrativeByKey = new Map<string, string>();
  for (const sec of existing) {
    const titleKey = sec.title.trim().toLowerCase();
    if (!titleKey) continue;
    const occ = seenInExisting.get(titleKey) ?? 0;
    seenInExisting.set(titleKey, occ + 1);
    narrativeByKey.set(`${titleKey}#${occ}`, sec.narrative);
  }
  const seenInParsed = new Map<string, number>();
  return parsedLyricSections.map((sec, i) => {
    const titleKey = sec.title.trim().toLowerCase();
    if (titleKey) {
      const occ = seenInParsed.get(titleKey) ?? 0;
      seenInParsed.set(titleKey, occ + 1);
      return {
        title: sec.title,
        narrative: narrativeByKey.get(`${titleKey}#${occ}`) ?? '',
      };
    }
    const prev = existing[i];
    return {
      title: prev?.title ?? sec.title,
      narrative: prev?.narrative ?? '',
    };
  });
}

/**
 * After {@link mergeParsedSectionsWithExisting}, copy rewrites **by line index** inside a section
 * when the section title + occurrence matches a prior section with the **same line count** and
 * the merged line still has an empty rewrite. Helps when the user replaces all originals in one
 * paste but keeps the same section shape (same number of lines per `[Verse]` block).
 */
export function applyPositionalLyricsFallback(
  merged: EncoreLyricsExerciseSection[],
  existing: EncoreLyricsExerciseSection[],
): EncoreLyricsExerciseSection[] {
  const sectionKey = (title: string, occ: number) => `${title.trim().toLowerCase()}#${occ}`;
  const seenEx = new Map<string, number>();
  const existingByKey = new Map<string, EncoreLyricsExerciseSection>();
  for (const sec of existing) {
    const tk = sec.title.trim().toLowerCase();
    const occ = seenEx.get(tk) ?? 0;
    seenEx.set(tk, occ + 1);
    existingByKey.set(sectionKey(sec.title, occ), sec);
  }

  const seenM = new Map<string, number>();
  return merged.map((secM) => {
    const tk = secM.title.trim().toLowerCase();
    const occ = seenM.get(tk) ?? 0;
    seenM.set(tk, occ + 1);
    const prev = existingByKey.get(sectionKey(secM.title, occ));
    if (!prev || prev.lines.length !== secM.lines.length) return secM;
    return {
      ...secM,
      lines: secM.lines.map((line, j) => {
        if (line.rewrite.trim()) return line;
        const prevLine = prev.lines[j];
        if (prevLine?.rewrite.trim()) {
          return { ...line, rewrite: prevLine.rewrite };
        }
        return line;
      }),
    };
  });
}

/**
 * Friendly in-UI label for a section heading. Preserves an explicit user-set title verbatim,
 * shrinks to `Lyrics` when the only section is untitled (so a one-paragraph paste keeps its
 * familiar label), and falls back to `Section N` (1-indexed) for the implicit-paragraph case.
 * Used by the lyrics editor heading and as the placeholder for the inline title input — so
 * clearing a custom name reverts the placeholder to the auto-generated label.
 */
export function lyricsExerciseSectionDisplayLabel(
  section: EncoreLyricsExerciseSection,
  indexZeroBased: number,
  totalSections: number,
): string {
  const trimmed = section.title.trim();
  if (trimmed) return trimmed;
  if (totalSections <= 1) return 'Lyrics';
  return `Section ${indexZeroBased + 1}`;
}

/**
 * Heading line for plain-text / PDF / Google Docs exports. Explicit titles are bracketed
 * (`[Verse 1]`) to match the Genius convention pasted text usually arrives in; auto-generated
 * placeholders are unbracketed (`Lyrics`, `Section 2`) so they read as labels, not lyrics.
 */
export function lyricsExerciseSectionExportHeading(
  section: EncoreLyricsExerciseSection,
  indexZeroBased: number,
  totalSections: number,
): string {
  const trimmed = section.title.trim();
  if (trimmed) return `[${trimmed}]`;
  if (totalSections <= 1) return 'Lyrics';
  return `Section ${indexZeroBased + 1}`;
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
    }));
  }
  if (run.lines && run.lines.length > 0) {
    return [{ title: '', lines: run.lines.map((l) => ({ ...l })) }];
  }
  return [];
}

/**
 * Canonical Genius lyrics text for exercises: prefer {@link EncoreSong.lyricsSourceGenius}, then
 * legacy `pastedLyrics` on a lyrics run, then serialized sections.
 */
export function effectiveGeniusLyricsSource(
  song: EncoreSong,
  run?: EncoreLyricsInOwnWordsExerciseRun,
): string {
  const fromSong = song.lyricsSourceGenius?.trim();
  if (fromSong) return song.lyricsSourceGenius!;
  const pasted = run?.pastedLyrics?.trim();
  if (pasted) return run!.pastedLyrics!;
  if (run) return serializeLyricsSectionsToRaw(effectiveLyricsSections(run));
  return '';
}

/** Persist canonical Genius text on the song and the lyrics run (drops legacy `pastedLyrics`). */
export function songWithSyncedLyricsInOwnWords(
  song: EncoreSong,
  run: EncoreLyricsInOwnWordsExerciseRun,
): EncoreSong {
  const sections = effectiveLyricsSections(run);
  const canonical = serializeLyricsSectionsToRaw(sections);
  const nextRun: EncoreLyricsInOwnWordsExerciseRun = {
    ...run,
    sections,
    pastedLyrics: undefined,
    lines: undefined,
  };
  let next: EncoreSong = { ...song, lyricsSourceGenius: canonical };
  next = setSingleRunForKind(next, touchExerciseRun(nextRun));
  return next;
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

export function newLyricsSectionNarrativeRun(song: EncoreSong): EncoreLyricsSectionNarrativeExerciseRun {
  const now = new Date().toISOString();
  const raw = effectiveGeniusLyricsSource(song);
  const parsed = parseGeniusLyricsIntoSections(raw);
  const sections = parsed.map((s) => ({
    title: s.title,
    narrative: '',
  }));
  return {
    id: crypto.randomUUID(),
    kind: 'lyricsSectionNarrative',
    status: 'draft',
    startedAt: now,
    updatedAt: now,
    sections,
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

/**
 * Reverts a completed run back to a draft so the user can continue editing it. We clear
 * `completedAt` so the run no longer surfaces the completion timestamp in lists — only the
 * status / updatedAt matter from here on. A no-op for runs that are already drafts.
 */
export function unmarkExerciseRunCompleted(run: EncorePracticeExerciseRun): EncorePracticeExerciseRun {
  if (run.status !== 'completed') return run;
  const next = { ...run, status: 'draft' as const, updatedAt: new Date().toISOString() };
  delete next.completedAt;
  return next;
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

/** Re-parse {@link EncoreSong.lyricsSourceGenius} into the narrative exercise section list, preserving text by section occurrence. */
export function songWithNarrativeRunResyncedFromLyricsSource(song: EncoreSong): EncoreSong {
  const nar = getSingleRunForKind(song, 'lyricsSectionNarrative');
  if (!nar || nar.kind !== 'lyricsSectionNarrative') return song;
  const raw = song.lyricsSourceGenius?.trim() ?? '';
  const parsed = parseGeniusLyricsIntoSections(raw);
  const nextSections = mergeParsedNarrativeSectionsWithExisting(parsed, nar.sections);
  return setSingleRunForKind(song, touchExerciseRun({ ...nar, sections: nextSections }));
}

/** Persist lyrics originals on the song, then resync any in-progress section narrative run. */
export function songWithSyncedLyricsInOwnWordsAndResyncNarrative(
  song: EncoreSong,
  run: EncoreLyricsInOwnWordsExerciseRun,
): EncoreSong {
  return songWithNarrativeRunResyncedFromLyricsSource(songWithSyncedLyricsInOwnWords(song, run));
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

/**
 * Plain text for progress / counts from a nine-questions answer stored as TipTap HTML or legacy
 * plain text. Not a security sanitizer.
 */
export function characterNineAnswerPlainText(htmlOrPlain: string | undefined): string {
  if (!htmlOrPlain) return '';
  const t = htmlOrPlain.trim();
  if (!t) return '';
  if (!t.includes('<')) return t;
  return t
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapePlainLineForHtml(line: string): string {
  return line
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * TipTap `setContent` input: empty → empty doc; values that already look like HTML pass through;
 * otherwise treated as legacy plain text (paragraphs split on blank lines).
 */
export function characterNineAnswerToEditorHtml(stored: string | undefined): string {
  const s = stored ?? '';
  const t = s.trim();
  if (!t) return '<p></p>';
  if (t.startsWith('<')) return s;
  const blocks = s.split(/\r?\n\r?\n/);
  return blocks
    .map((block) => {
      const inner = block.split(/\r?\n/).map((line) => escapePlainLineForHtml(line)).join('<br>');
      return `<p>${inner || '<br>'}</p>`;
    })
    .join('');
}

export function nineQuestionsProgress(answers: string[]): { done: number; total: number } {
  const total = ENCORE_CHARACTER_NINE_QUESTION_COUNT;
  const done = answers.filter((a) => characterNineAnswerPlainText(a).length > 0).length;
  return { done, total };
}

export function lyricsSectionNarrativeProgress(
  sections: EncoreLyricsSectionNarrativeExerciseRun['sections'],
): { done: number; total: number } {
  const total = sections.length;
  const done = sections.filter((s) => s.narrative.trim().length > 0).length;
  return { done, total };
}

/**
 * Friendly summary line for the practice card (e.g. `"4 of 24 lines"`, `"3 of 9 answered"`).
 * Lyrics drafts with no parsed lines yet return an empty string so the card stays quiet.
 */
export function formatExerciseRunSummary(run: EncorePracticeExerciseRun): string {
  if (run.kind === 'lyricsInOwnWords') {
    const { done, total } = lyricsRewriteProgressFromSections(effectiveLyricsSections(run));
    if (total === 0) return '';
    return `${done} of ${total} lines`;
  }
  if (run.kind === 'lyricsSectionNarrative') {
    const { done, total } = lyricsSectionNarrativeProgress(run.sections);
    if (total === 0) return '';
    return `${done} of ${total} sections`;
  }
  const { done, total } = nineQuestionsProgress(run.answers);
  return `${done} of ${total} answered`;
}
