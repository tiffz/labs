# Labs undo stack (⌘Z / Ctrl+Z)

App-level undo is for **committed** mutations (persisted state), not per-keystroke typing. Inside `<input>`, `<textarea>`, `contenteditable`, and `[role="textbox"]`, the browser keeps handling undo.

## New features in an app

1. Wrap the app (or the subtree that owns edits) in `<LabsUndoProvider>`.
2. After a successful **write**, call `push({ undo, redo })` with callbacks that restore the previous snapshot and re-apply the new one.
3. While replaying undo/redo, skip calling `push` (Encore uses `isReplayingRef` from `useLabsUndo()`; set the Labs replay flag around your replay callbacks if you implement a custom stack).

Encore wires this in `EncoreContext` for song, performance, repertoire extras, and owner display name.

Optional: add `data-labs-undo-breakout="true"` on a container if focus can land on a non-input but you still want global undo (rare).

## Batched undo (preview)

When a single user action commits **many** writes (e.g. "Apply" on a 50-row playlist import, "Apply all" on a bulk score import), don't push one undo entry per write — that floods the stack and forces the user to undo 50 times. Instead, collect them into a single batched entry:

```ts
// Coming in PR 4 of the Encore quality sweep:
const { withBatch } = useLabsUndo();
await withBatch('Import playlist', async (queue) => {
  for (const row of rows) {
    const { undo, redo } = await applySong(row);
    queue.push({ undo, redo });
  }
});
// One entry on the stack labelled "Import playlist" that undoes every row.
```

Same shape applies to autosave-driven flows (e.g. SongPage debounce) — call `pushUndo` only at the explicit save boundary, and pass `silentUndo: true` on the per-tick saves.
