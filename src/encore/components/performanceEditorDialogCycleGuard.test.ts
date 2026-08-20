import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guard against the self-retriggering debounce that froze the performance editor.
 *
 * `PerformanceEditorDialog` debounces `syncVideoLinkInput` behind a 200ms timer whose effect depends
 * on that callback's identity. `applyLinkedVideo` calls `setDraft`, and every branch returns a
 * freshly spread object, so `draft`'s identity changes on every call even when its value does not.
 * With `draft` in the callback's dependency array that closed a loop:
 *
 *   setDraft -> new draft -> new syncVideoLinkInput -> new syncVideoFromInput
 *            -> debounce effect re-runs -> new 200ms timer -> syncVideoLinkInput -> ...
 *
 * The only exit was `clearAddPanelLink()`, which is called on the SUCCESS path. So pasting a Drive
 * link the signed-in user cannot read — a video a friend shared, the reported case — span forever:
 * Drive was re-queried every 200ms, and because `existingVideoCount > 0` after the first pass, each
 * iteration appended ANOTHER video row to the draft. The generation counter was bumped before every
 * await, so the late 403 always failed its `gen !== driveLookupGen.current` check and the error was
 * never even rendered; the dialog just sat on "Checking Drive…" while the row list grew.
 *
 * This is a source assertion, which is weaker than a behavioural one. Rendering the dialog needs
 * the full Encore provider stack, and `react-hooks/exhaustive-deps` cannot help here — it flags
 * MISSING dependencies, and this bug was an EXTRA one. An honest source scan that states its own
 * limits beats no guard at all, and beats a behavioural test elaborate enough to be wrong.
 */
const source = readFileSync(
  resolve(__dirname, 'PerformanceEditorDialog.tsx'),
  'utf8'
);

describe('PerformanceEditorDialog debounce cannot self-retrigger', () => {
  /** The dependency array of the `syncVideoLinkInput` useCallback. */
  function syncVideoLinkInputDeps(): string {
    const start = source.indexOf('const syncVideoLinkInput = useCallback(');
    expect(start, 'syncVideoLinkInput was renamed — update this guard').toBeGreaterThan(-1);
    const next = source.indexOf('const syncVideoFromInput', start);
    expect(next, 'syncVideoFromInput was renamed — update this guard').toBeGreaterThan(start);
    const block = source.slice(start, next);
    const deps = block.lastIndexOf('[');
    const end = block.indexOf(']', deps);
    expect(deps, 'could not locate the dependency array').toBeGreaterThan(-1);
    return block.slice(deps + 1, end);
  }

  it('finds the callback it is meant to guard', () => {
    // Fails loudly on a rename rather than passing vacuously.
    expect(syncVideoLinkInputDeps().length).toBeGreaterThan(0);
  });

  it('does not depend on `draft`', () => {
    const deps = syncVideoLinkInputDeps()
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);
    expect(
      deps,
      'syncVideoLinkInput must not depend on `draft`: applyLinkedVideo calls setDraft, so the ' +
        'identity churns every call and the debounce effect re-arms itself forever. Read the ' +
        'current draft through draftRef instead.'
    ).not.toContain('draft');
  });

  it('reads the draft through a ref instead', () => {
    expect(source).toContain('draftRef.current');
  });
});
