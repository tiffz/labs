import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Source scan — and it says so, rather than pretending to be behavioural.
 *
 * `Number('')` is `0`, not `NaN`. Every numeric field that parsed its draft with `Number(...)`
 * plus an `isFinite` guard therefore accepted an empty box and committed zero, which clamps to the
 * field minimum: clearing the BPM box silently set the song to 20 BPM. Four fields shipped that
 * way (BpmInput, TimeSignatureInput, MidiIntStepper, the /ui demo); the two that were correct used
 * `Number.parseInt` and `parseFloat`, which do return `NaN` for blank.
 *
 * The set is DERIVED — any file rendering `NumericStepperField` in its text-draft mode is enrolled
 * by existing, not by someone remembering to add it here.
 *
 * Known limit: a handler defined in a different file from the one rendering the field (Stanza
 * passes `onTransposeInputBlur` down from `StanzaWorkspace`) is not covered. A behavioural test per
 * field is the real guard — see `numericFieldDraft.test.tsx`.
 */
const SRC = path.join(process.cwd(), '.');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.tsx') && !entry.name.includes('.test.')) out.push(full);
  }
  return out;
}

/** `Number(someDraft)` / `Number(raw)` — the shape that cannot tell blank from zero. */
const UNSAFE_DRAFT_PARSE = /\bNumber\(\s*(raw|[A-Za-z]*[Dd]raft[A-Za-z]*)\s*\)/;

describe('numeric field drafts', () => {
  const candidates = walk(SRC).filter((file) => {
    const source = fs.readFileSync(file, 'utf8');
    return (
      source.includes('NumericStepperField') &&
      source.includes('inputValue=') &&
      (source.includes('onInputBlur=') || source.includes('onInputKeyDown='))
    );
  });

  it('finds the fields it governs', () => {
    // A glob that matches nothing passes every assertion below.
    expect(candidates.length).toBeGreaterThanOrEqual(4);
  });

  it.each(candidates.map((f) => [path.relative(SRC, f), f]))(
    '%s does not parse its draft with bare Number()',
    (_rel, file) => {
      const source = fs.readFileSync(file as string, 'utf8');
      expect(UNSAFE_DRAFT_PARSE.test(source)).toBe(false);
    },
  );
});
