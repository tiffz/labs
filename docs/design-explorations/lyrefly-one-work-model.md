# Lyrefly: one kind of work

**Status:** Revised after architecture review (2026-10-29). Decision recorded in
[ADR 0031](../adr/0031-lyrefly-ideas-and-works.md); the D1/D6 sections below are the **rejected** first
draft, kept for the reasoning.

## Problem

Lyrefly has two records for one thing. A Sketchbook note (`SketchbookSeed`) and a comic
(`ComicProject`) are both "a story I might make", but they live in different tables, sync by
different paths, and only meet through a one-way "Promote" copy. The owner wants:

1. A Sketchbook entry to be the same kind of object as a comic: a comic still in brainstorming.
2. Brainstorm-only work hidden from the Workbench and the Library by default.
3. Work joins the Workbench once it is developed: a script, pages, drawing.
4. Brainstorm material can be collected and merged.
5. Collections across the whole site: ideas and finished comics, not only Sketchbook images.
6. The Library shows complete comics by default.

Owner decisions already made: content or a "Start developing" button moves an idea to the
Workbench; the stacked-collections Sketchbook branch is held and folded into this.

## Decisions

### D1. An idea is a `ComicProject`

Every Sketchbook note becomes a `ComicProject`. The note's fields map onto the project:

| Seed               | Work                                                         |
| ------------------ | ------------------------------------------------------------ |
| `title`            | `title`                                                      |
| `logline`          | `subtitle`                                                   |
| `bodyHtml`         | `brainstormHtml`                                             |
| `occurredOn`       | new `ideaDate?: string` (YYYY-MM-DD)                         |
| `url`, attachments | brainstorm assets (`visualDevAssets`), as Promote does today |
| `kind`             | new `ideaKind?: SketchbookSeedKind` (icon only)              |

New notes are created as works. `SketchbookSeed` stops being written.

**Alternatives.** (a) Keep two tables and unify only in the UI: cheapest, but merge, collect and
develop each need two code paths forever, and the owner asked for one object. (b) A new `Work`
type that both become: a rename of `ComicProject` with a migration of every comic, for no gain.

**Cost.** A project syncs as a Drive package folder (`projects/{id}/`), so each note becomes a
folder, about five Drive calls to create. Fine at the owner's 16 notes and at hundreds; worth
measuring before thousands. The script document is created only when a script is first written,
not with the work, so an idea's package stays to `project.json` and `layout.json`.

**Reversibility.** Two-way, because migration (D6) keeps every seed row.

### D2. Where a work shows is derived, never stored

```ts
type WorkPhase = 'idea' | 'developing' | 'complete';

function workPhase(project, ctx): WorkPhase {
  if (project.status === 'finished' || ctx.publishLogCount > 0)
    return 'complete';
  if (project.stageCompletion?.brainstorm === true) return 'developing'; // "Start developing"
  if (hasScriptText(ctx.script) || ctx.pageNodeCount > 0) return 'developing';
  return 'idea';
}
```

- **Sketchbook:** `idea`. **Workbench:** `developing`. **Library:** `complete` by default;
  a switch shows everything. Archived stays a separate axis, hidden everywhere by default.
- "Start developing" sets `stageCompletion.brainstorm = true`, which already exists and syncs.
- No new status field. `pipelineStatus` keeps its stored values but stops driving any view.

**Consequence the owner should know:** tracker comics with neither script nor pages (currently
"fleshing out" on the shelf) move to the Sketchbook. That is the stated rule, applied evenly.

### D3. Collections hold works and pieces, everywhere

Keep `LyreflyCollection` and `LyreflyCollectionPiece` (images the owner made, referenced on
Drive). Add membership rows:

```ts
interface LyreflyCollectionMember {
  id: string; // `${collectionId}:${projectId}`, so two devices adding the same work agree
  collectionId: string;
  projectId: string;
  order: number;
  deletedAt?: string; // removal is a marker row, like every other envelope delete
  createdAt: string;
  updatedAt: string;
}
```

A work can be in any number of collections. Members ride in the gallery envelope beside
collections, with a merge-policy map (ADR 0019 shape), LWW per row. A collection page shows its
works (as cards) and its pieces (as tiles). Sketchbook, Workbench and Library can each filter by
collection.

**Alternative.** `workIds: string[]` on the collection: needs a removed-ids list to survive a
union merge (as `removedAttachmentIds` does), and two devices reordering clash on one field.
Rows merge independently.

### D4. Merge one work into another

`mergeLyreflyWork(source, target)`:

1. Appends the source's brainstorm notes to the target's, under the source title as a heading.
2. Copies the source's brainstorm assets to the target (new asset rows; blobs read locally or
   from the source's Drive sidecars).
3. Appends the source's script, if it has one, to the target's script under a heading.
4. Adds the target to every collection the source was in.
5. Archives the source and sets `mergedIntoId = target.id`. **Nothing is deleted**: the source
   stays recoverable, hidden from every view.

Refused, in v1, when **both** works have pages: page order cannot be merged without asking.

**Alternative.** Delete the source. Rejected: deletion is the one irreversible step, and the
owner's past losses (ADR 0019, #99) were all deletes.

### D5. Library filter

The Library gets a phase filter, default "Complete". The existing stage filter goes; the
Workbench columns replace it.

### D6. Migrating existing notes

On first load after the change, each active seed with no `promotedProjectId` is promoted:

- The work id is derived, `lyreflyStableId('seed:' + seed.id)`, so two devices migrating the
  same note make the **same** work and their syncs agree instead of duplicating.
- The seed row stays, marked `status: 'promoted'` with `promotedProjectId`. It is not deleted.
  Undo is: unset the seed's status and delete the derived work.
- Seeds already promoted are left alone.
- Idempotent: re-running finds every seed promoted and does nothing.

**Dry run.** `planSeedMigration(seeds, projects)` is pure and returns the list it would create.
Before the real run, the owner's own data is run through it in Chrome (read-only) and the plan
is shown in chat for a yes.

## Failure modes

| Failure                                       | Defence                                                                                       |
| --------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Two devices migrate at once                   | Derived work id; same row on both                                                             |
| Migration stops halfway (tab closed)          | Idempotent; next load finishes it                                                             |
| An old build syncs seeds after migration      | Seed rows still merge as before; old build shows notes as they were                           |
| Merge copies an asset whose blob is not local | Read from the source's Drive sidecar; refuse the merge if that fails, before writing anything |
| A work in a deleted collection                | Members of a deleted collection are hidden, not deleted                                       |

## Rollout

1. D2 + D5: derived phase, Workbench/Library/Sketchbook filters. Sketchbook shows idea-phase
   works next to unmigrated seeds. No data change.
2. D3: collection members, collection pages listing works, filters.
3. D4: merge. First use: A Far Away Moon into 600 Million Steps.
4. D6: migrate seeds, after the dry run.

## Fitness functions

- `workPhase` is the only place a view decides where a work shows: a guardrail test fails if a
  view filters on `pipelineStatus` or `status` directly.
- Members merge-policy map is exhaustive (compile error on a new field).
- Characterization test: migration run twice, and on two simulated devices, yields one work per
  seed. Verified to fail against a version that uses random ids.
- Merge test: the source survives, archived, with `mergedIntoId`; no delete path is called.
