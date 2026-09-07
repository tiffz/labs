import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every file that constructs an AudioContext must also close one.
 *
 * Browsers cap AudioContexts per document — Chrome at 6. Past the cap the *constructor throws*, so
 * a leak does not degrade audio, it crashes the app: the throw escapes whatever handler ran it and
 * lands in `LabsErrorBoundary`. That is the shape of the Stanza crashes.
 *
 * This has now happened twice. `f626fabe` fixed a per-loop-wrap leak; the crash came back because
 * `StanzaSectionMetronomeRail` — which is conditionally mounted, so it remounts on every section,
 * song, and scope change — created a context per mount and never closed one. Fixing leak sites one
 * at a time does not converge; nothing was watching for the next one.
 *
 * Derived, not enumerated, for the reason in `.agents/rules/guardrails-must-be-falsifiable.md`:
 * a hand-maintained list of audio files stops covering the code that matters. A new file is
 * enrolled by constructing a context, not by someone remembering to add it here.
 *
 * This is a source scan and says so. It cannot prove the close is reachable, correctly scoped, or
 * on the unmount path — only that the file's author thought about teardown at all. A real
 * behavioural check would need a DOM harness that mounts, unmounts, and counts live contexts; the
 * per-component tests should carry that. This catches the "never closes it anywhere" case, which is
 * the one that has actually shipped, twice.
 */
const SRC = resolve(__dirname, '../..');

/**
 * The cross-browser constructor dance (`window.AudioContext || window.webkitAudioContext`) or a
 * direct `new AudioContext(`. Matching the *construction* rather than the type keeps type-only
 * importers and prop-passers out of the set.
 */
const CONSTRUCTS_CONTEXT = /webkitAudioContext|new AudioContext\s*\(/;

/** Any teardown: `.close()` on a context, or delegation to a helper that owns closing. */
const CLOSES_CONTEXT = /\.close\s*\(\)|closeAudioContext|releaseAudioContext/;

/**
 * Files that construct a context and hand ownership to the caller. Each needs a reason, and the
 * reason must name who closes it — an unexplained entry here is how the leak class reopens.
 */
const OWNERSHIP_TRANSFERRED: Record<string, string> = {
  'shared/playback/audioContextLifecycle.ts':
    'the lifecycle helper itself — it constructs on behalf of callers, who close via this module',
  'shared/audio/platform/hooks/usePlatformMediaMetronome.ts':
    'module-scope singleton (sharedClickCtx) reused for the tab lifetime, not one per mount — a ' +
    'reused context is one context; this file already documents the fix that made it a singleton',
  'midi/monitor/midiMonitor.ts':
    'class instance held in a ref by midi/store.tsx and guarded by `if (!synthRef.current)`, so ' +
    'one context per store, not per mount. NOT fully verified: whether store.tsx disposes the ' +
    'monitor when MIDI is torn down. Revisit if MIDI ever crashes after repeated connect cycles.',
  'words/hooks/useWordsPlaybackRailProps.ts':
    'fills chordAudioContextRef, which is owned and closed by src/words/App.tsx — the hook receives ' +
    'the ref as a prop rather than owning it, so the close belongs at the owner',
};

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) {
      // Generated files embed source snippets as string literals; a sample is not a call site.
      if (/AUTO-GENERATED/.test(readFileSync(full, 'utf8').slice(0, 200))) continue;
      out.push(full);
    }
  }
  return out;
}

const creators = walk(SRC)
  .filter((f) => CONSTRUCTS_CONTEXT.test(readFileSync(f, 'utf8')))
  .map((f) => ({ rel: f.slice(f.indexOf('/src/') + 5), abs: f }));

describe('AudioContexts are closed', () => {
  it('finds the files it is meant to guard', () => {
    // A glob that matches nothing passes every assertion after it.
    expect(creators.length, 'no AudioContext construction sites found under src/').toBeGreaterThan(3);
  });

  it.each(creators.map((c) => [c.rel, c.abs]))('%s closes the context it creates', (rel, abs) => {
    if (rel in OWNERSHIP_TRANSFERRED) return;
    const source = readFileSync(abs as string, 'utf8');
    expect(
      CLOSES_CONTEXT.test(source),
      `${rel} constructs an AudioContext but never closes one. Browsers cap contexts per document ` +
        `(Chrome: 6) and the constructor THROWS past the cap, so this crashes the app rather than ` +
        `degrading audio. Close it on unmount/teardown, or add an OWNERSHIP_TRANSFERRED entry ` +
        `naming who closes it.`,
    ).toBe(true);
  });

  it('every ownership exemption names who closes the context', () => {
    for (const [file, reason] of Object.entries(OWNERSHIP_TRANSFERRED)) {
      expect(reason.length, `${file} needs a real reason`).toBeGreaterThan(20);
    }
  });
});
