# Labs undo stack (⌘Z / Ctrl+Z)

App-level undo is for **committed** mutations (persisted state), not per-keystroke typing. Inside `<input>`, `<textarea>`, `contenteditable`, and `[role="textbox"]`, the browser keeps handling undo.

## When to add undo (default for edit apps)

Any micro-app where users **author or rearrange durable local state** should ship with undo on day one:

| App class                      | Examples                      | Provider location                        |
| ------------------------------ | ----------------------------- | ---------------------------------------- |
| Document / song editors        | Encore, Stanza, **Words**     | App root (`main.tsx` or top-level `App`) |
| Library CRUD with inline edits | Encore song/performance saves | Same subtree as the data being edited    |

**Skip undo** for read-only viewers, one-shot calculators, and flows whose only writes are remote side-effects (Drive sync, OAuth, publish).

### Checklist for a new edit app

1. Wrap the app (or the subtree that owns edits) in `<LabsUndoProvider>`.
2. Render `<LabsUndoControls />` in the app header (or toolbar) so undo is discoverable — keyboard shortcuts alone are not enough.
3. After a successful **write**, call `push({ undo, redo })` with callbacks that restore the previous snapshot and re-apply the new one.
4. While replaying undo/redo, skip calling `push` (`isReplayingRef` from `useLabsUndo()`).
5. Clear the stack when the edited document identity changes (`clear()`), e.g. on song switch, so undo does not apply to a different item.
6. Text fields: **preview on input, push on commit** (blur / Enter) so browser typing undo and app-level undo do not fight.

Reference implementations:

- **Encore** — `EncoreContext` + `EncoreActionsContext` (`pushUndo` on save/delete/bulk).
- **Stanza** — `LabsUndoProvider` in `App.tsx`, controls in viewer header.
- **Words** — `useWordsSectionsState` snapshots sections + song key; chord progression commits on blur; randomize-everything batches sections + BPM.

## API

```ts
const { push, clear, withBatch, isReplayingRef } = useLabsUndo();

push({
  undo: () => {
    /* restore before snapshot */
  },
  redo: () => {
    /* re-apply after snapshot */
  },
});
```

Optional: add `data-labs-undo-breakout="true"` on a container if focus can land on a non-input but you still want global undo (rare).

## Batched undo

When a single user action commits **many** writes (e.g. "Apply" on a 50-row playlist import, "Apply all" on a bulk score import, **Randomize everything** in Words), don't push one undo entry per write — that floods the stack. Collect them into a single batched entry:

```ts
const { withBatch } = useLabsUndo();
await withBatch('Import playlist', async (queue) => {
  for (const row of rows) {
    const { undo, redo } = await applySong(row);
    queue.push({ undo, redo });
  }
});
// One stack entry labelled "Import playlist" that undoes every row.
```

Same shape applies to autosave-driven flows — call `push` only at the explicit save boundary, and pass `silentUndo: true` on per-tick saves when applicable.
