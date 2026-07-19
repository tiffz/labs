# Labs undo stack (⌘Z / Ctrl+Z)

App-level undo is for **committed** mutations (persisted state), not per-keystroke typing. Inside `<input>`, `<textarea>`, `contenteditable`, and `[role="textbox"]`, the browser keeps handling undo.

## Architecture principles

### Keyboard-first (default)

Modern web apps expose undo through **keyboard shortcuts**, not persistent header chrome:

- **Undo:** ⌘Z / Ctrl+Z
- **Redo:** ⌘⇧Z / Ctrl+Shift+Z (Mac) · Ctrl+Y (Windows/Linux)
- **Discoverability:** list undo/redo in the app's **Keyboard shortcuts** dialog (⌘? / Ctrl+?)

Do **not** add persistent undo/redo header buttons in CRUD apps. Encore, Stanza, and Words use hotkeys only. Dense **notation editors** (Drums rhythm input, Piano step input) may keep **app-local** inline undo/redo beside the field — not `{@link LabsUndoProvider}` chrome.

### Two implementation tiers

| Tier                     | When                                                     | Stack                                              | UI                                        | Apps                                             |
| ------------------------ | -------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------- | ------------------------------------------------ |
| **A — persisted CRUD**   | Users edit durable local state (Dexie / IndexedDB)       | `{@link LabsUndoProvider}` + `{@link useLabsUndo}` | Hotkeys + shortcuts help                  | Encore, Stanza, Words, Lyrefly, Zinebox, Gesture |
| **B — session notation** | In-memory score/rhythm string during one editing session | App-local stack (hook or reducer)                  | Hotkeys + optional compact inline buttons | Drums, Piano                                     |

Coverage is enforced by `labsUndoTierACoverage.test.ts`: any app with a Dexie database plus destructive delete flows must mount the provider or carry a documented exemption.

Tier A is the shared contract. Tier B may keep inline undo/redo buttons when they sit next to the notation field; still wire keyboard shortcuts and document them.

### Commit boundaries

Push undo entries at **explicit commit points**, not on every keystroke:

| Edit type       | Push when                          | Skip while                                    |
| --------------- | ---------------------------------- | --------------------------------------------- |
| Text fields     | blur / Enter                       | typing (`input` events)                       |
| Autosave drafts | navigate-away or explicit Save     | debounced autosave ticks (`silentUndo: true`) |
| Structural ops  | immediately (delete, reorder, DnD) | `isReplayingRef.current`                      |
| Bulk import     | once per user action (`withBatch`) | per-row writes inside the batch               |

### Stack hygiene

1. **`clear()`** when the edited document identity changes (song switch, route change) so undo cannot apply to a different item.
2. **`isReplayingRef`** — persistence layers skip pushing history while undo/redo callbacks run.
3. **`withBatch`** — one stack entry for multi-row imports or "randomize everything" flows.
4. **Remote side-effects** (Drive sync, OAuth, publish) are not undoable local edits.

## When to add undo (Tier A)

Any micro-app where users **author or rearrange durable local state** should ship with undo on day one:

| App class                      | Examples                      | Provider location                        |
| ------------------------------ | ----------------------------- | ---------------------------------------- |
| Document / song editors        | Encore, Stanza, Words         | App root (`main.tsx` or top-level `App`) |
| Library CRUD with inline edits | Encore song/performance saves | Same subtree as the data being edited    |

**Skip undo** for read-only viewers, one-shot calculators, and flows whose only writes are remote side-effects.

### Checklist for a new edit app

1. Wrap the app (or the subtree that owns edits) in `<LabsUndoProvider>`.
2. Register undo/redo in `{@link labsUndoRedoShortcutEntries}` via the app's `*KeyboardShortcutSections()` helper and mount `{@link LabsKeyboardShortcutsHost}`.
3. After a successful **write**, call `push({ undo, redo })` with callbacks that restore the previous snapshot and re-apply the new one.
4. While replaying undo/redo, skip calling `push` (`isReplayingRef` from `useLabsUndo()`).
5. Clear the stack when the edited document identity changes (`clear()`).
6. Text fields: **preview on input, push on commit** (blur / Enter) so browser typing undo and app-level undo do not fight.

Reference implementations:

- **Encore** — `EncoreContext` + `EncoreActionsContext` (`pushUndo` on save/delete/bulk); draft editors via `useEncoreSongDraftUndo` / `useEncoreOriginalDraftUndo`; commit-time undo on SongPage / OriginalSongPage navigate-away.
- **Stanza** — `LabsUndoProvider` in `App.tsx`; `persistSong` pushes boundary/mix/marker edits; stack clears on song switch.
- **Words** — `useWordsSectionsState` snapshots sections + song key; chord progression commits on blur; randomize-everything batches via `withBatch`.
- **Zinebox** — `undo/zineboxUndoableMutations.ts` wraps library CRUD (comic delete, stack create/append/remove); undo also reverses the Drive tombstones so sync does not re-delete restored rows; organize apply batches via `withBatch`.
- **Gesture** — `undo/gestureUndoableMutations.ts` wraps app-only collection delete and local pack metadata edits (tags, source URL). Drive side-effects (photo trash, folder rename) never return commits.

## Tier B (session notation)

**Drums** — `useNotationHistory` tracks the darbuka notation string. Keyboard shortcuts in `App.tsx`; compact undo/redo icons in `RhythmInput` toolbar.

**Piano** — reducer `UNDO` / `REDO` actions in `store.tsx`. Keyboard shortcuts while step-input mode is active; toolbar buttons in `PianoKeyboard` / `NoteInput`.

When adding Tier B undo, mirror Labs hotkey behavior (respect text-field suppression) and document shortcuts even if inline buttons remain.

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
await withBatch(async (queue) => {
  for (const row of rows) {
    const { undo, redo } = await applySong(row);
    queue.push({ undo, redo });
  }
});
// One stack entry that undoes every row.
```

Same shape applies to autosave-driven flows — call `push` only at the explicit save boundary, and pass `silentUndo: true` on per-tick saves when applicable.

## Optional UI control (Tier B only)

Notation editors may ship compact undo/redo icon buttons beside the score field, wired to the **session-local** stack — not `{@link LabsUndoProvider}`. Do not add undo/redo to Encore/Stanza/Words app headers.
