# ADR 0030: Every upload stages before it saves

## Status

**Accepted** (October 2026), **amended** the same month: dropped files save at once (see
[Amendment](#amendment-a-drop-saves-at-once)). Shared code: `src/shared/upload/` (`useLabsStagedUploads`,
`LabsStagedUploadPanel`). Guard: `src/shared/upload/stagedUploadGuardrails.test.ts`. First surface:
Encore Originals takes.

## Context

The owner pasted a Google Drive link into Encore's new "Add take" menu, expecting to see it and
confirm, and the copy into their Drive had already started. That was not a one-off: across the site,
most ways of bringing a file in (file picker, drag and drop, pasted link) wrote to IndexedDB or Drive
at once, while a few (Encore's performance editor, Zine Box's multi-PDF and Drive-folder imports,
Gesture's folder dialog) showed a list and waited for a button. Zine Box did both: one PDF imported
immediately, two or more opened a review. Nobody could predict which kind a surface was.

## Decision

1. **Picking, dropping or pasting only stages.** Nothing is written to IndexedDB, Dexie or Drive until
   the user presses the confirm button.
2. **Each staged item says what will happen to it**, in one short line: "Saved on this device",
   "Saved here and backed up to Drive", "Links to your file in Drive", "Copies into your Drive",
   "Replaces the audio for …". Size when known; never "0 B" for unknown.
3. **An item that cannot be used stays in the list with its reason** ("That file isn't an audio or
   video file.") and is never written. Dropping a mix of good and bad files no longer silently
   discards some of them.
4. **Confirm is offered only when every item is checked** and at least one can be added. Removing an
   item while it is being checked cannot bring it back.
5. **Partial failure is visible and safe to retry.** Items written on confirm leave the list; items
   that failed stay, marked with the reason, and are not re-sent without another confirm.
6. **One confirm button per surface.** While items are staged, the surface hides its own "Add …"
   trigger, so the panel's confirm is the only one on screen.
7. **One implementation.** Surfaces use `useLabsStagedUploads` + `LabsStagedUploadPanel`; the app
   supplies `inspect` (decide what each item becomes, no writes) and the commit on confirm.

Out of scope: tools that read a file into memory and save nothing (Palette, Zines, the Melodia dev
page). They are named in the guard with that reason.

## Alternatives considered

- **Stage only Drive links and drops; let a deliberate file-picker choice upload at once.** Closer
  to many apps, and one fewer click. Rejected by the owner: one rule everywhere is the point.
- **A modal review dialog** (Zine Box's pattern). Rejected as the default: the inline panel keeps the
  review where the items will land, works at 390px, and does not block the page. Existing dialogs
  that already review move to the shared panel as they are touched.

## Amendment: a drop saves at once

The owner found the review step awkward after dragging a file onto "Add take": the drop already
says which file and where it goes, so asking again reads as the app doubting them. Decision 1 now
splits by gesture:

- **Dropped files save at once.** They still pass through the same `inspect` and commit code
  (`saveFiles` / `saveBatch` in `useLabsStagedUploads`), so they get the same checks and the same
  writers. A dropped file that cannot be used stays listed with its reason (decision 3), and a save
  that fails stays listed too (decision 5). Neither shows a confirm button, and neither hides the
  surface's own "Add …" trigger.
- **Picked files and pasted links still stage** for review, as above. A pasted Drive link is where
  the outcome is least obvious (point at your file, or copy it into your Drive), which is what
  started this ADR.
- Where a drop already leads to a choice (Encore's "where should this file go?" dialog, Stanza's
  "song or layer?" prompt), making the choice is the confirmation.

Rejected alternative at amendment time: let picked files skip the review too, keeping it only for
Drive links and bulk imports. The owner chose the narrower change.

## Consequences

- One extra click for every picked file and pasted link. None for a drop.
- A file picked but not confirmed is lost on reload. Accepted: nothing was saved, so nothing is lost
  that the user had confirmed.
- Migrating every intake path was phased, through a `PENDING` list in the guard. It emptied in
  October 2026, when Encore's performance editor and bulk score and video imports moved onto
  `useLabsStagedUploads`, and the list was deleted. Review tables edit each row's plan with
  `updatePlan` and keep their own layout.
