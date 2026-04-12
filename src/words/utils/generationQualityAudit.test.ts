/**
 * Generation Quality Audit
 *
 * Stress-tests the word rhythm generation engine across a matrix of lyrics,
 * templates, and settings. Asserts structural invariants and logs quality
 * heuristic scores for manual review.
 */
import { describe, it, expect } from 'vitest';
import {
  generateWordRhythm,
  DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS,
  type WordRhythmGenerationSettings,
  type SyllableHit,
} from './prosodyEngine';
import { parseRhythm } from '../../shared/rhythm/rhythmParser';

// ---------------------------------------------------------------------------
// Lyrics corpus
// ---------------------------------------------------------------------------

const LYRICS_CORPUS: Array<{ id: string; text: string }> = [
  { id: 'short', text: 'Ocean waves' },
  { id: 'medium', text: 'Sunrise on the shoreline' },
  { id: 'multiline', text: 'Sunrise on the shoreline\nOcean wind through palm trees' },
  { id: 'long-words', text: 'Extraordinary circumstances' },
  { id: 'trochaic', text: 'Watermelon butterfly' },
  { id: 'contractions', text: "Won't you come and dance with me" },
  { id: 'dense', text: 'ta ka di mi ta ka ju no coconut avocado' },
  { id: 'monosyllables', text: 'run jump fall catch throw spin' },
  {
    id: 'full-verse',
    text: 'Sunrise on the shoreline\nOcean wind through palm trees\nFind the fire burning by the sea\nSo you can come and dance with me',
  },
];

// ---------------------------------------------------------------------------
// Template presets (4/4 notation strings)
// ---------------------------------------------------------------------------

const TEMPLATES: Array<{ id: string; notation: string }> = [
  { id: 'maqsum', notation: 'D-T-__T-D---T---' },
  { id: 'saeidi', notation: 'D-T-__D-D---T---' },
  { id: 'baladi', notation: 'D-D-__T-D---T---' },
  { id: 'ayoub', notation: 'D--KD-T-D--KD-T-' },
  { id: 'malfuf', notation: 'D--T--T-D--T--T-' },
  { id: 'kahleegi', notation: 'D--D--T-D--D--T-' },
  { id: 'rock', notation: 'D---T---D-D-T---' },
  { id: 'simple', notation: 'D---D---D---D---' },
];

// ---------------------------------------------------------------------------
// Settings presets
// ---------------------------------------------------------------------------

type SettingsOverride = Partial<WordRhythmGenerationSettings>;

const SETTINGS_MATRIX: Array<{ id: string; overrides: SettingsOverride }> = [
  { id: 'baseline', overrides: {} },
  { id: 'fill-rests', overrides: { fillRests: true } },
  { id: 'subdivide', overrides: { subdivideNotes: true } },
  { id: 'merge', overrides: { mergeNotes: true } },
  { id: 'fill+subdivide', overrides: { fillRests: true, subdivideNotes: true } },
  { id: 'fill+merge', overrides: { fillRests: true, mergeNotes: true } },
  { id: 'subdivide+merge', overrides: { subdivideNotes: true, mergeNotes: true } },
  { id: 'freestyle-25', overrides: { freestyle: true, freestyleStrength: 25 } },
  { id: 'freestyle-75', overrides: { freestyle: true, freestyleStrength: 75 } },
  { id: 'no-natural-rhythm', overrides: { naturalWordRhythm: false } },
  { id: 'ab-variations', overrides: { phrasing: 'halfMeasureVariations' as const } },
  { id: 'landing-note', overrides: { landingNote: 'quarter' as const } },
  { id: 'ab+landing', overrides: { phrasing: 'halfMeasureVariations' as const, landingNote: 'quarter' as const } },
  {
    id: 'all-features',
    overrides: {
      fillRests: true,
      subdivideNotes: true,
      mergeNotes: true,
      freestyle: true,
      freestyleStrength: 50,
      phrasing: 'halfMeasureVariations' as const,
      landingNote: 'quarter' as const,
    },
  },
  { id: 'alignment-off', overrides: { stressAlignment: 'off' as const, wordStartAlignment: 'off' as const } },
  { id: 'alignment-light', overrides: { stressAlignment: 'light' as const, wordStartAlignment: 'light' as const } },
  {
    id: 'bias-sixteenth',
    overrides: { noteValueBias: { sixteenth: 90, eighth: 0, dotted: 0, quarter: 0 } },
  },
  {
    id: 'bias-quarter',
    overrides: { noteValueBias: { sixteenth: 0, eighth: 0, dotted: 0, quarter: 90 } },
  },
  {
    id: 'no16+subdivide',
    overrides: { subdivideNotes: true, noteValueBias: { sixteenth: 0, eighth: 90, dotted: 50, quarter: 50 } },
  },
  {
    id: 'no16+freestyle50',
    overrides: { freestyle: true, freestyleStrength: 50, noteValueBias: { sixteenth: 0, eighth: 90, dotted: 50, quarter: 50 } },
  },
  {
    id: 'no16+fill+subdivide',
    overrides: { fillRests: true, subdivideNotes: true, noteValueBias: { sixteenth: 0, eighth: 90, dotted: 50, quarter: 50 } },
  },
  {
    id: 'merge+bias-quarter',
    overrides: { mergeNotes: true, noteValueBias: { sixteenth: 0, eighth: 0, dotted: 0, quarter: 90 } },
  },
  {
    id: 'landing+freestyle50',
    overrides: { landingNote: 'quarter' as const, freestyle: true, freestyleStrength: 50 },
  },
  {
    id: 'landing+merge',
    overrides: { landingNote: 'quarter' as const, mergeNotes: true },
  },
  {
    id: 'ab+freestyle25',
    overrides: { phrasing: 'halfMeasureVariations' as const, freestyle: true, freestyleStrength: 25 },
  },
  {
    id: 'fill+landing+ab',
    overrides: { fillRests: true, landingNote: 'quarter' as const, phrasing: 'halfMeasureVariations' as const },
  },
];

// ---------------------------------------------------------------------------
// Quality heuristic helpers
// ---------------------------------------------------------------------------

const TIME_SIG = { numerator: 4, denominator: 4 } as const;
const SIXTEENTHS_PER_MEASURE = 16;

function extractInputWords(text: string): string[] {
  return text
    .split(/[\s\n]+/)
    .map((w) => w.replace(/[^\w''\u2019]/g, '').toLowerCase())
    .filter((w) => w.length > 0);
}

interface QualityScores {
  wordCompleteness: number;
  restDensity: number;
  lineBreakRespect: number;
  intraWordRestCount: number;
  beatAlignmentRate: number;
  durationVariety: number;
  templateFidelity: number;
}

interface AuditIssue {
  severity: 'critical' | 'major' | 'minor';
  message: string;
}

function computeScores(
  inputText: string,
  notation: string,
  hits: SyllableHit[],
  templateNotation: string
): { scores: QualityScores; issues: AuditIssue[] } {
  const issues: AuditIssue[] = [];
  const parsed = parseRhythm(notation, TIME_SIG);
  const totalSixteenths = parsed.measures.length * SIXTEENTHS_PER_MEASURE;

  // Word completeness
  const inputWords = extractInputWords(inputText);
  const hitWords = hits
    .filter((h) => h.word !== '' && h.wordIndex >= 0)
    .map((h) => h.word.toLowerCase());
  const hitWordSet = new Set(hitWords);
  const missingWords = inputWords.filter((w) => !hitWordSet.has(w));
  const wordCompleteness = inputWords.length > 0
    ? (inputWords.length - missingWords.length) / inputWords.length
    : 1;
  if (missingWords.length > 0) {
    issues.push({
      severity: 'critical',
      message: `Missing words: ${missingWords.join(', ')}`,
    });
  }

  // Rest density
  let restSixteenths = 0;
  for (const ch of notation.replace(/\|/g, '')) {
    if (ch === '_') restSixteenths++;
  }
  const restDensity = totalSixteenths > 0 ? restSixteenths / totalSixteenths : 0;

  // Line break respect: do new lyric lines start at measure boundaries?
  const lines = inputText.split('\n').filter((l) => l.trim().length > 0);
  let lineBreakRespect = 1;
  if (lines.length > 1) {
    const wordHits = hits.filter((h) => h.word !== '' && h.wordIndex >= 0);
    let lineStartCount = 0;
    let lineStartOnBeat = 0;
    let cumWordIdx = 0;
    for (let li = 1; li < lines.length; li++) {
      const wordsInPrevLine = lines[li - 1].split(/\s+/).filter((w) => w.length > 0).length;
      cumWordIdx += wordsInPrevLine;
      const firstHitOfLine = wordHits.find((h) => h.wordIndex === cumWordIdx);
      if (firstHitOfLine) {
        lineStartCount++;
        if (firstHitOfLine.startSixteenth % SIXTEENTHS_PER_MEASURE === 0) {
          lineStartOnBeat++;
        }
      }
    }
    lineBreakRespect = lineStartCount > 0 ? lineStartOnBeat / lineStartCount : 1;
  }

  // Intra-word rests: look for same-word hits separated by a gap
  let intraWordRestCount = 0;
  const wordHits = hits.filter((h) => h.word !== '' && h.wordIndex >= 0);
  for (let i = 1; i < wordHits.length; i++) {
    const prev = wordHits[i - 1];
    const curr = wordHits[i];
    if (prev.wordIndex === curr.wordIndex) {
      const gapStart = prev.startSixteenth + prev.durationSixteenths;
      const gapSize = curr.startSixteenth - gapStart;
      if (gapSize > 0) {
        intraWordRestCount++;
        issues.push({
          severity: 'major',
          message: `Intra-word rest in "${prev.word}" between syllables at sixteenth ${gapStart} (gap=${gapSize})`,
        });
      }
    }
  }

  // Beat alignment: % of word-starts on beat boundaries (multiples of 4)
  const wordStarts = wordHits.filter((h) => h.syllableIndex === 0);
  const onBeat = wordStarts.filter((h) => h.startSixteenth % 4 === 0);
  const beatAlignmentRate = wordStarts.length > 0 ? onBeat.length / wordStarts.length : 1;

  // Duration variety: standard deviation of syllable durations
  const durations = wordHits.map((h) => h.durationSixteenths);
  let durationVariety = 0;
  if (durations.length > 1) {
    const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
    const variance = durations.reduce((s, d) => s + (d - mean) ** 2, 0) / durations.length;
    durationVariety = Math.sqrt(variance);
  }

  // Template fidelity: in the first measure, check how many hit positions match the template
  let templateFidelity = 1;
  if (templateNotation.length > 0 && parsed.measures.length > 0) {
    const tplHitPositions = new Set<number>();
    for (let i = 0; i < templateNotation.length; i++) {
      if ('DTK'.includes(templateNotation[i])) tplHitPositions.add(i);
    }
    const firstMeasure = notation.split('|')[0] ?? '';
    let matchCount = 0;
    const totalTplHits = tplHitPositions.size;
    for (let i = 0; i < firstMeasure.length; i++) {
      if (tplHitPositions.has(i) && 'DTK'.includes(firstMeasure[i])) {
        matchCount++;
      }
    }
    templateFidelity = totalTplHits > 0 ? matchCount / totalTplHits : 1;
  }

  return {
    scores: {
      wordCompleteness,
      restDensity,
      lineBreakRespect,
      intraWordRestCount,
      beatAlignmentRate,
      durationVariety,
      templateFidelity,
    },
    issues,
  };
}

// ---------------------------------------------------------------------------
// Build settings for a combo
// ---------------------------------------------------------------------------

function buildSettings(
  templateNotation: string,
  overrides: SettingsOverride
): WordRhythmGenerationSettings {
  return {
    ...DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS,
    ...overrides,
    templateNotation,
    noteValueBias: {
      ...DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS.noteValueBias,
      ...(overrides.noteValueBias ?? {}),
    },
  } as WordRhythmGenerationSettings;
}

// ---------------------------------------------------------------------------
// Audit entry
// ---------------------------------------------------------------------------

interface AuditEntry {
  lyrics: string;
  lyricsId: string;
  template: string;
  settingsId: string;
  notation: string;
  measures: number;
  hitCount: number;
  hitSummary: string;
  scores: QualityScores;
  issues: AuditIssue[];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Generation Quality Audit', () => {
  const allEntries: AuditEntry[] = [];

  // Use a focused subset: 3 representative templates x all settings x all lyrics
  // to keep runtime manageable (~430 combos) while still catching issues.
  const FOCUS_TEMPLATES = TEMPLATES.filter((t) =>
    ['maqsum', 'ayoub', 'simple'].includes(t.id)
  );

  for (const template of FOCUS_TEMPLATES) {
    for (const settingsPreset of SETTINGS_MATRIX) {
      for (const lyrics of LYRICS_CORPUS) {
        const testName = `[${template.id}] [${settingsPreset.id}] ${lyrics.id}`;

        it(testName, () => {
          const settings = buildSettings(template.notation, settingsPreset.overrides);
          const result = generateWordRhythm(lyrics.text, {
            strictDictionaryMode: false,
            timeSignature: TIME_SIG,
            variationSeed: 42,
            generationSettings: settings,
          });

          // --- Structural invariants ---
          const parsed = parseRhythm(result.notation, TIME_SIG);
          expect(parsed.isValid).toBe(true);
          expect(parsed.measures.length).toBeGreaterThan(0);
          expect(parsed.measures.length).toBeLessThan(50);

          // Every hit must be within notation bounds
          const totalSixteenths = parsed.measures.length * SIXTEENTHS_PER_MEASURE;
          for (const hit of result.hits) {
            expect(hit.startSixteenth).toBeGreaterThanOrEqual(0);
            expect(hit.startSixteenth + hit.durationSixteenths).toBeLessThanOrEqual(totalSixteenths);
          }

          // No overlapping hits
          const sortedHits = [...result.hits].sort((a, b) => a.startSixteenth - b.startSixteenth);
          for (let i = 1; i < sortedHits.length; i++) {
            const prev = sortedHits[i - 1];
            const curr = sortedHits[i];
            expect(curr.startSixteenth).toBeGreaterThanOrEqual(
              prev.startSixteenth + prev.durationSixteenths
            );
          }

          // HitMap alignment: the number of sounding notes in the parsed
          // notation must exactly match the number of hits so the rendering
          // layer's sequential hitMap stays in sync across sections.
          let soundingNoteCount = 0;
          parsed.measures.forEach((m) =>
            m.notes.forEach((n) => {
              if (n.sound !== 'rest' && n.sound !== 'simile') soundingNoteCount++;
            })
          );
          expect(
            result.hits.length,
            `hitMap alignment: ${soundingNoteCount} notes vs ${result.hits.length} hits`
          ).toBe(soundingNoteCount);

          // Phrase boundaries: the last word of each lyric line must not be
          // separated from the preceding word by more than 1 measure gap.
          const lyricLines = lyrics.text.split(/\n/).filter((l) => l.trim().length > 0);
          let lineWordOffset = 0;
          for (const line of lyricLines) {
            const lineWords = line.trim().split(/\s+/).filter((w) => /[a-zA-Z]/.test(w));
            if (lineWords.length >= 2) {
              const lineFirstHits = lineWords.map((_, wi) =>
                result.hits.find(
                  (h) => h.word !== '' && h.wordIndex === lineWordOffset + wi && h.syllableIndex === 0
                )
              ).filter(Boolean) as SyllableHit[];
              if (lineFirstHits.length >= 2) {
                const last = lineFirstHits[lineFirstHits.length - 1];
                const prev = lineFirstHits[lineFirstHits.length - 2];
                const gap = Math.floor(last.startSixteenth / SIXTEENTHS_PER_MEASURE) -
                  Math.floor(prev.startSixteenth / SIXTEENTHS_PER_MEASURE);
                expect(
                  gap,
                  `Phrase boundary: "${lineWords[lineWords.length - 2]}"→"${lineWords[lineWords.length - 1]}" gap=${gap} measures`
                ).toBeLessThanOrEqual(1);
              }
            }
            lineWordOffset += lineWords.length;
          }

          // Intra-line gap limit: the silence between the last syllable of
          // one word and the first syllable of the next (on the same lyric
          // line) should be tight.  Phrase-ending words (last on their
          // line) get a stricter limit (≤2 sixteenths = eighth-note rest).
          // Mid-phrase words allow up to 4 sixteenths (quarter-note rest).
          const PHRASE_END_GAP_MAX = 2;
          const INTRA_LINE_GAP_MAX = 4;
          const auditLines = lyrics.text.split(/\n/).filter((l) => l.trim().length > 0);
          let auditLineWordOffset = 0;
          for (const line of auditLines) {
            const lineWords = line.trim().split(/\s+/).filter((w) => /[a-zA-Z]/.test(w));
            const lastHitPerWord: (SyllableHit | undefined)[] = lineWords.map((_, wi) => {
              const wordIdx = auditLineWordOffset + wi;
              const wordHits = result.hits.filter(
                (h) => h.word !== '' && h.wordIndex === wordIdx
              );
              if (wordHits.length === 0) return undefined;
              return wordHits.reduce((a, b) =>
                b.startSixteenth > a.startSixteenth ? b : a
              );
            });
            const firstHitPerWord: (SyllableHit | undefined)[] = lineWords.map((_, wi) =>
              result.hits.find(
                (h) => h.word !== '' && h.wordIndex === auditLineWordOffset + wi && h.syllableIndex === 0
              )
            );
            for (let j = 1; j < lineWords.length; j++) {
              const prevLast = lastHitPerWord[j - 1];
              const currFirst = firstHitPerWord[j];
              if (!prevLast || !currFirst) continue;
              const gapSixteenths = currFirst.startSixteenth - (prevLast.startSixteenth + prevLast.durationSixteenths);
              const isPhraseEnd = j === lineWords.length - 1;
              const maxGap = isPhraseEnd ? PHRASE_END_GAP_MAX : INTRA_LINE_GAP_MAX;
              expect(
                gapSixteenths,
                `Intra-line gap: "${prevLast.word}"→"${currFirst.word}" gap=${gapSixteenths} sixteenths (max ${maxGap}, phraseEnd=${isPhraseEnd})`
              ).toBeLessThanOrEqual(maxGap);
            }
            auditLineWordOffset += lineWords.length;
          }

          // Bias filtering: when a note value has bias=0, no hits should
          // have that duration (except template-original hits in strict mode)
          if (settings.noteValueBias.sixteenth === 0 && !settings.freestyle) {
            const sixteenthHits = result.hits.filter(
              (h) => h.durationSixteenths === 1 && h.word !== '' && h.wordIndex >= 0
            );
            expect(
              sixteenthHits.length,
              `Expected no 16th-note hits when sixteenth bias=0, got ${sixteenthHits.length}`
            ).toBe(0);
          }

          // Word completeness: every non-number input word should appear
          const inputWords = extractInputWords(lyrics.text);
          const hitWords = new Set(
            result.hits
              .filter((h) => h.word !== '' && h.wordIndex >= 0)
              .map((h) => h.word.toLowerCase())
          );
          // Number tokens get expanded (e.g. "90" -> "ninety"), so we check
          // that most words are present rather than requiring exact match for
          // all tokens. We still flag missing ones as issues.
          const foundCount = inputWords.filter((w) => hitWords.has(w)).length;
          // At least 70% of words must appear (generous for number expansion cases)
          expect(foundCount / inputWords.length).toBeGreaterThanOrEqual(0.7);

          // Landing note check: the heuristic may resolve in-place (same
          // measure count) or add a new measure, but must never lose measures.
          if (settings.landingNote !== 'off') {
            const baseResult = generateWordRhythm(lyrics.text, {
              strictDictionaryMode: false,
              timeSignature: TIME_SIG,
              variationSeed: 42,
              generationSettings: { ...settings, landingNote: 'off' },
            });
            const baseMeasures = parseRhythm(baseResult.notation, TIME_SIG).measures.length;
            expect(parsed.measures.length).toBeGreaterThanOrEqual(baseMeasures);
            expect(parsed.measures.length).toBeLessThanOrEqual(baseMeasures + 1);

            // The final syllable with a word should land on a strong beat
            // (beat 1 = position 0, or beat 3 = position halfMeasure).
            const lastWordHit = [...result.hits].reverse().find((h) => h.word !== '');
            if (lastWordHit) {
              const pos = lastWordHit.startSixteenth % 16;
              const isStrongBeat = pos === 0 || pos === 8;
              expect(
                isStrongBeat,
                `last syllable "${lastWordHit.syllable}" at position ${pos} should be on a strong beat`
              ).toBe(true);
              expect(lastWordHit.stroke).toBe('D');
            }
          }

          // --- Quality scores ---
          const { scores, issues } = computeScores(
            lyrics.text,
            result.notation,
            result.hits,
            template.notation
          );

          const hitSummary = result.hits
            .filter((h) => h.word !== '' && !h.continuationOfPrevious)
            .slice(0, 20)
            .map((h) => `${h.syllable || h.word}(${h.stroke},${h.durationSixteenths})`)
            .join(' ');

          const entry: AuditEntry = {
            lyrics: lyrics.text.slice(0, 60),
            lyricsId: lyrics.id,
            template: template.id,
            settingsId: settingsPreset.id,
            notation: result.notation,
            measures: parsed.measures.length,
            hitCount: result.hits.filter((h) => h.word !== '').length,
            hitSummary,
            scores,
            issues,
          };
          allEntries.push(entry);
        });
      }
    }
  }

  it('randomization: different seeds produce distinct outputs with defaults', () => {
    const lyrics = 'Sunrise on the shoreline\nOcean wind through palm trees';
    const notations = new Set<string>();
    for (let seed = 0; seed < 10; seed++) {
      const result = generateWordRhythm(lyrics, {
        strictDictionaryMode: false,
        timeSignature: TIME_SIG,
        variationSeed: seed,
        generationSettings: buildSettings('D-T-__T-D---T---', {}),
      });
      notations.add(result.notation);
    }
    expect(
      notations.size,
      `Expected ≥3 distinct outputs from 10 seeds, got ${notations.size}`
    ).toBeGreaterThanOrEqual(3);
  });

  // Summary test that runs after all combos and logs the aggregated report
  it('prints quality audit summary', () => {
    const critical = allEntries.filter((e) =>
      e.issues.some((i) => i.severity === 'critical')
    );
    const major = allEntries.filter((e) =>
      e.issues.some((i) => i.severity === 'major')
    );

    // Aggregate scores across all entries
    const avg = (arr: number[]) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    const summary = {
      totalCombos: allEntries.length,
      criticalCount: critical.length,
      majorCount: major.length,
      avgWordCompleteness: avg(allEntries.map((e) => e.scores.wordCompleteness)),
      avgRestDensity: avg(allEntries.map((e) => e.scores.restDensity)),
      avgLineBreakRespect: avg(allEntries.map((e) => e.scores.lineBreakRespect)),
      avgBeatAlignment: avg(allEntries.map((e) => e.scores.beatAlignmentRate)),
      avgDurationVariety: avg(allEntries.map((e) => e.scores.durationVariety)),
      avgTemplateFidelity: avg(allEntries.map((e) => e.scores.templateFidelity)),
      totalIntraWordRests: allEntries.reduce(
        (s, e) => s + e.scores.intraWordRestCount,
        0
      ),
    };

    console.log('\n========== QUALITY AUDIT SUMMARY ==========');
    console.log(JSON.stringify(summary, null, 2));

    // Log critical issues
    if (critical.length > 0) {
      console.log(`\n--- CRITICAL ISSUES (${critical.length} combos) ---`);
      for (const entry of critical) {
        const critIssues = entry.issues.filter((i) => i.severity === 'critical');
        console.log(
          `  [${entry.template}][${entry.settingsId}] ${entry.lyricsId}: ${critIssues.map((i) => i.message).join('; ')}`
        );
      }
    }

    // Log major issues (sample up to 30)
    if (major.length > 0) {
      console.log(`\n--- MAJOR ISSUES (${major.length} combos, showing up to 30) ---`);
      for (const entry of major.slice(0, 30)) {
        const majIssues = entry.issues.filter((i) => i.severity === 'major');
        console.log(
          `  [${entry.template}][${entry.settingsId}] ${entry.lyricsId}: ${majIssues.map((i) => i.message).join('; ')}`
        );
      }
    }

    // Log worst template fidelity cases (bottom 10)
    const worstFidelity = [...allEntries]
      .filter((e) => !e.settingsId.includes('freestyle') && !e.settingsId.includes('all-features'))
      .sort((a, b) => a.scores.templateFidelity - b.scores.templateFidelity)
      .slice(0, 10);
    if (worstFidelity.length > 0) {
      console.log('\n--- WORST TEMPLATE FIDELITY (non-freestyle, bottom 10) ---');
      for (const entry of worstFidelity) {
        console.log(
          `  [${entry.template}][${entry.settingsId}] ${entry.lyricsId}: fidelity=${entry.scores.templateFidelity.toFixed(2)} notation=${entry.notation.split('|')[0]}`
        );
      }
    }

    // Log hit summaries for a sample of entries (maqsum, full-verse)
    console.log('\n--- SAMPLE HIT SUMMARIES (maqsum × full-verse) ---');
    for (const entry of allEntries) {
      if (entry.template !== 'maqsum' || entry.lyricsId !== 'full-verse') continue;
      console.log(
        `  [${entry.settingsId}] (${entry.measures}m, ${entry.hitCount}hits, fidelity=${entry.scores.templateFidelity.toFixed(2)}): ${entry.hitSummary}`
      );
    }

    // Also show full-verse on maqsum for baseline vs freestyle-25 vs freestyle-75
    // to verify freestyle strength actually differentiates
    console.log('\n--- FREESTYLE DIFFERENTIATION (maqsum × multiline) ---');
    for (const entry of allEntries) {
      if (entry.template !== 'maqsum' || entry.lyricsId !== 'multiline') continue;
      if (!['baseline', 'freestyle-25', 'freestyle-75', 'bias-sixteenth', 'bias-quarter'].includes(entry.settingsId)) continue;
      console.log(
        `  [${entry.settingsId}] (${entry.measures}m): ${entry.notation}`
      );
    }

    // Merge notes should produce longer average durations vs baseline
    console.log('\n--- MERGE NOTES EFFECT (maqsum × full-verse) ---');
    const baselineEntry = allEntries.find(
      (e) => e.template === 'maqsum' && e.lyricsId === 'full-verse' && e.settingsId === 'baseline'
    );
    const mergeEntry = allEntries.find(
      (e) => e.template === 'maqsum' && e.lyricsId === 'full-verse' && e.settingsId === 'merge'
    );
    if (baselineEntry && mergeEntry) {
      console.log(`  baseline: ${baselineEntry.hitCount} hits, notation=${baselineEntry.notation.split('|')[0]}`);
      console.log(`  merge:    ${mergeEntry.hitCount} hits, notation=${mergeEntry.notation.split('|')[0]}`);
    }

    // A/B variations should work even with short songs (>= 2 measures)
    console.log('\n--- A/B VARIATIONS EFFECT ---');
    for (const entry of allEntries) {
      if (entry.settingsId !== 'ab-variations') continue;
      if (!['short', 'medium', 'multiline'].includes(entry.lyricsId)) continue;
      if (entry.template !== 'maqsum') continue;
      const baseEntry = allEntries.find(
        (e) => e.template === entry.template && e.lyricsId === entry.lyricsId && e.settingsId === 'baseline'
      );
      const same = baseEntry && baseEntry.notation === entry.notation;
      console.log(
        `  [${entry.lyricsId}] ${entry.measures}m, differs-from-baseline=${!same}`
      );
    }

    console.log('\n========== END AUDIT ==========\n');

    // Soft assertion: no critical issues
    expect(critical.length).toBe(0);
  });
});
