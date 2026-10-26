# Lyrefly: comics from songs, back-catalog import, publishing

**Status:** Proposal, not built. Three parts, ordered by how soon they pay off:

1. [Start a comic from an Encore original](#1-start-a-comic-from-an-encore-original)
2. [Import the back catalog and pen names](#2-import-the-back-catalog-and-pen-names)
3. [Social posting: feasibility](#3-social-posting-feasibility)

Facts about Encore and Lyrefly come from the source (file references inline). Facts about the
two comic sites come from fetching them on 2026-10-26. Facts about third-party APIs come from
general knowledge, not from calling them; check each before building against it.

---

## 1. Start a comic from an Encore original

### Goal

Two clicks from "I wrote this song" to a Lyrefly project with the lyrics on the brainstorm
board, and a link back to the song that survives edits on either side.

### Ownership rule

**Encore owns the song. Lyrefly owns the comic. Lyrefly never writes Encore data.** The
dependency runs one way: Lyrefly reads Encore; Encore knows nothing about Lyrefly. This is the
ADR 0007 shape (Encore canonical, other apps are secondary readers) that Stanza already
follows, so it adds no new kind of coupling.

### What Lyrefly stores

A new optional field on `ComicProject` (`src/lyrefly/types/index.ts:70`):

```ts
type ComicSource = {
  kind: 'encore-original';
  /** EncoreOriginalSong.id — the only durable key. */
  songId: string;
  /** Snapshot taken when the comic was started. The comic adapts THIS text. */
  snapshot: {
    title: string;
    lyricsAndChords: string; // ChordPro, as Encore stores it
    songUpdatedAt: string;   // Encore's updatedAt at snapshot time
    takenAt: string;
  };
};

sources?: ComicSource[]; // array: a comic can draw on several songs
```

ID plus snapshot, not ID alone. The snapshot is the text you adapted; if you later rewrite a
verse, the comic still shows what it was built from. The ID lets Lyrefly notice the song moved
on and offer to refresh. It syncs to Drive inside `project.json` like every other project field,
so no new Drive file.

### Two ways in

**From Encore** (the low-barrier path). A "Make a comic" action in the originals song
workspace opens:

```
/lyrefly/#/new?from=encore-original&song=<base64 payload>
```

The payload carries `songId`, title, `lyricsAndChords`, `updatedAt` and a one-time `nonce`.
It follows the Encore → Words handoff (`src/shared/music/wordsAppDeepLink.ts:42`, which uses a
query string; this uses the hash so the lyrics never reach a server log), so it needs no Drive
read, works offline, and works even if Encore has not synced yet.

Replay safety: Lyrefly strips the payload with `history.replaceState` before creating, and
derives the new project id from `songId + nonce`, so a reload, Back, or the same link opened on
a second device before Drive sync lands on the same project instead of making a duplicate.
Payloads over a fixed cap (say 64 KB) show an error rather than a truncated song. Lyrefly creates the
project, fills the brainstorm notes with the lyrics as a quote, sets `sources`, and lands on
Brainstorm. If a comic already lists that `songId`, Lyrefly opens a small chooser ("Open
_Courier_ · Start another comic") instead of creating a duplicate.

The payload builder lives in `src/shared/` so both apps import it and neither imports the
other.

**From Lyrefly.** "New comic" gains a "From a song" choice that lists Encore originals: title,
started date, first lyric line, and a mark on songs that already have a comic. Pick one and you
get the same result as above.

### How Lyrefly reads Encore's song list

Read Encore's **Drive** layout, not its IndexedDB.

- `Encore_App/Originals/originals_manifest.json` lists every original by id;
  `Encore_App/Originals/song/<id>.json` holds the row (`src/encore/originals/drive/originalsSharded.ts:39`,
  `:213`). Both are plain JSON.
- Lyrefly can already read them: every Labs app uses the same OAuth client and `drive.file`
  scope, and Stanza reads inside `Encore_App/` today
  (`src/stanza/drive/stanzaPracticeOverlaySync.ts:33`).
- Encore's Dexie database is same-origin and technically readable, but it is Encore's private
  working copy: its schema changes with Dexie version bumps and nothing tests it against other
  readers. The Drive files are the contract Encore already promises to keep readable, because
  its own other devices depend on them.

To make that contract explicit instead of a copied folder name:

- Move `Encore_App` / `Originals` / manifest names, the tombstone field, and a minimal read-only
  parser (`id`, `title`, `lyricsAndChords`, `startedAt`, `updatedAt`) into
  `src/shared/federation/encoreOriginalsContract.ts`. Stanza's copied constant moves there too.
- The reader opens song files **only through the manifest's `fileId`**, never by filename: a
  push fallback in Encore can leave a stale second `<id>.json` (`originalsSharded.ts:220`).
- The reader is read-only by construction. It must not reuse Encore's layout helper, which
  creates folders and an empty manifest when they are missing (`originalsSharded.ts:90`).
- Tests that guard the contract:
  - Encore-side round trip: a real `EncoreOriginalSong` through Encore's writer, parsed by the
    shared reader. Fails the day Encore renames a field Lyrefly depends on.
  - Missing manifest → "can't check", not an empty list.
  - Missing from manifest without a tombstone → "not backed up yet", not "deleted".
  - Lyrefly never calls a Drive create or update under `Encore_App`.
- Record the contract in an ADR (or a revision of ADR 0007): a second app now reads Encore's
  originals tree, which makes that tree a public surface. Rejected alternatives: reading
  Encore's IndexedDB, and Encore publishing a separate `originals_index.json`.

Listing cost: the manifest holds only `fileId` and `updatedAt` per song, so the "From a song"
list needs one fetch per song for titles and first lines. Cache the parsed list and use the
manifest's `updatedAt` to refetch only what changed.

`sources` rides in `project.json`, which already round-trips unknown fields
(`src/lyrefly/drive/projectPackageWire.ts:43`). Today's field merge takes it whole from the newer
side (`lyreflyPackageFieldMerge.ts:147`); give it an explicit union by `songId`, with a test.

### States the link can be in

Each is a distinct, visible state. None of them silently falls back to something that looks
like data.

| State             | How Lyrefly knows                                       | What you see                                                     |
| ----------------- | ------------------------------------------------------- | ---------------------------------------------------------------- |
| In step           | `song.updatedAt === snapshot.songUpdatedAt`             | Song chip on the project: title, "Open in Encore"                |
| Song edited since | `song.updatedAt` is newer                               | "Song changed since you started" · View changes · Use new lyrics |
| Not backed up yet | Id not in the manifest, no tombstone                    | Snapshot only; "Open in Encore" still works locally              |
| Song deleted      | Encore tombstone (`deletedOriginalIds`) for the id      | "Deleted in Encore": snapshot stays, link greys out              |
| Can't check       | Signed out, offline, Drive error, or no manifest at all | Snapshot only, no claim either way                               |

**Absence from the manifest never means deleted.** Encore learned this the hard way: its own
pull used to delete originals missing from the manifest and wiped a device's library, and now
deletes only on tombstones (`src/encore/originals/drive/originalsSharded.ts:285`). The comic you
just started from an unsynced song would otherwise show "deleted" immediately. Likewise a
missing manifest is "can't check", never an empty song list.

"Use new lyrics" replaces the snapshot only, after showing the diff. It never rewrites the
brainstorm notes or the script; those are yours once the comic starts.

### Later, not MVP

- **Script scaffold from sections.** A button on the Script stage that turns each ChordPro
  section into a page heading with its lines as caption bullets. Opt-in, because many comics
  will not follow the song's structure.
- **Covers.** `EncoreSong` (`src/encore/types.ts:192`) is a separate id space. Add
  `kind: 'encore-song'` to `ComicSource` with title and artist, but **store a link to the lyrics,
  never a copy**: they belong to someone else, and the comic may end up public.
- **Reverse link in Encore** ("Comics from this song"). This would make Encore read Lyrefly and
  turn a one-way dependency into a cycle. Skip it unless you miss it in practice.

---

## 2. Import the back catalog and pen names

### What is there

Both sites are Gatsby builds on GitHub Pages, and both publish their data as JSON with
`access-control-allow-origin: *`, so Lyrefly can fetch it straight from the browser.

**tiffatiel.com** — `/page-data/index/page-data.json` → `allComicsYaml.nodes`: 5 comics, each
with `name`, `slug`, `year`, `description`, cover images and `links` keyed by platform
(`store`, `webtoons`, `tapas`, `tumblr`, `bluesky`, `x`, `instagram`, `facebook`). Artist
accounts sit in the footer (Instagram, X, Tumblr, Threads, Bluesky, Facebook, all
`tiffatiel`), and _Between Walks_ has its own set of four accounts.

**slantofrain.com** — "Comics by Petrichor Lin". `/page-data/index/page-data.json` →
`allMetadataYaml`: 2 issues with `title`, `publishDate`, `contentWarnings`. `allAltTextYaml`
holds alt text **per page**, and it is already a panel-by-panel script ("1. Opening shot of a
suburban house at night. 2. …"). No social links on the site.

### Pen names, series and accounts

**Decided:** one pen name per comic for now, possibly more later. Series (_Between Walks_) can
have their own accounts but are not pen names.

Four kinds of thing, kept **flat and linked**, not nested in a tree:

| Entity                                                | Examples                                              | Owns accounts? |
| ----------------------------------------------------- | ----------------------------------------------------- | -------------- |
| **Persona** (a pen name)                              | Tiffatiel, Petrichor Lin                              | Yes            |
| **Series** (comics that belong together)              | _Between Walks_, Slant of Rain                        | Yes            |
| **Comic** (a Lyrefly project: one-shot or issue)      | _The Perfect Wedding_, _Fighting_                     | No             |
| **Account** (somewhere you post, including a website) | @tiffatiel on Bluesky, @betweenwalks, slantofrain.com | —              |

A **publication** (today's `PublishLogEntry`) joins a comic to the account it went out on.

```ts
type Persona = { id: string; name: string };
type Series = { id: string; title: string };
type Account = {
  id: string;
  platform: string;                // same vocabulary as inferPublishPlatform; 'Website' for sites
  handle: string;
  url: string;
  owner: { kind: 'persona' | 'series'; id: string };
  retiredAt?: string;              // stop using it; never delete it
};

ComicProject.personaIds?: string[];  // stored as a list, picked from a single menu for now
ComicProject.seriesId?: string;
PublishLogEntry.accountId?: string;
```

Why it is shaped this way:

1. **Flat, not a tree.** A tree (pen name → series → comic) bakes today's arrangement into the
   structure. Brands move: a series could switch pen names, a pen name could retire, two accounts
   could merge. With flat entities and links, each of those is one edited link. With a tree,
   each is a migration.
2. **Store a list, show one choice.** `personaIds` is an array from day one, but the UI is a
   single menu. Crediting a comic to two pen names later is then a UI change, not a data
   migration. Do not build the multi-select until you need it.
3. **Inherit as a default, then store it on the comic.** A new _Between Walks_ issue starts with
   the series' pen name filled in, but the comic keeps its own copy. If the series ever changes
   pen names, comics already out keep the credit they shipped with. Credit read live from the
   parent would rewrite history.
4. **Accounts belong to exactly one owner,** persona or series, and that is what "series can
   have accounts separate from authorship" means in the data. Where a comic was posted lives on
   the publication, so "posted from @betweenwalks, credited to Tiffatiel" needs no special case.
5. **Retire, don't delete.** Handles change and accounts get abandoned, but old publications
   still point at them. Keep the account, change its handle, or mark it retired. Deleting would
   orphan its publications.
6. **No "imprint" or "brand" type yet.** Slant of Rain looks like an imprint, but a series that
   holds unrelated stories under one pen name covers it, website included. Add a third owner
   kind only when something fits neither persona nor series.

`PublishLogEntry` already exists (`src/lyrefly/types/index.ts:293`) with platform inferred from
the URL, so each imported link becomes a publish-log row with no new UI.

### One-off import or ongoing sync?

**One-off import first, built so it is safe to run again.**

- The sites change a few times a year, when you publish a comic. A background sync would spend
  most of its life doing nothing.
- After import, Lyrefly becomes where you record new publications. If the site then stays the
  source of truth too, you have two places to update and they will drift.
- Running it again after a new release should add the new comic and nothing else. That covers
  the "sync" need without a sync engine, but only with three fixes to how Lyrefly stores data:

  1. **Stable identity.** Project and publish-log ids are random UUIDs today
     (`src/lyrefly/db/lyreflyProjectMutations.ts:103`, `:170`). Add `importKey` (`tiffatiel:perfect-wedding`,
     `slantofrain:1-fighting`) to `ComicProject` and derive ids from it: the project from the key,
     each publish row from `key + platform`. Two devices importing then produce the same rows.
  2. **Deletes stay deleted.** Lyrefly's tombstones match on project id
     (`src/lyrefly/drive/lyreflyDriveEnvelope.ts:16`). With random ids, delete an imported comic,
     re-run the import, and it comes back under a new id. Deterministic ids fix the match; also keep
     a list of import keys you dismissed, because tombstones are capped at 500.
  3. **Publish rows must merge across devices.** Done: archive rows now merge by id with per-row
     delete records (`mergeLyreflyArchive`). The characterization test also exposed a wider bug,
     fixed in the same change: a device that already held a comic's pages never re-downloaded it,
     so no remote edit to its script, captions or archive arrived.

**What the import fills:** a project per comic (title, year or date, synopsis, cover image,
status Published, persona), a publish-log row per platform link, content warnings, and the
personas and accounts. For Slant of Rain, the page alt text can seed `script.md`, which turns
two finished comics into fully-scripted reference projects.

**What it cannot fill:** page art beyond what the site shows, drafts, and anything only in your
head. Those stay manual.

### Longer term: flip the direction

Once Lyrefly holds the catalog, the sites could build _from_ Lyrefly's public snapshot
(`public_snapshot.json` already exists per project) instead of their own YAML. That is the
real fix for drift, and it is a website change, not a Lyrefly one. Worth doing only if you find
yourself editing both.

---

## 3. Social posting: feasibility

### The two things that make this expensive

1. **Labs is a static site.** Posting needs OAuth client secrets and long-lived refresh tokens;
   those cannot live in the browser. The Cloudflare Worker BFF that already handles Google
   sign-in could hold them, but every platform adds a secret, a token store and a refresh path.
2. **Scheduling needs a server that runs when your laptop is closed.** A Worker with a cron
   trigger and a queue of posts can do it. That is a new piece of infrastructure to watch, with
   failures you would only notice when a post did not appear.

### Platform by platform

| Platform              | Can an app post for you?                                                                               | Cost to set up              | Verdict                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------- | -------------------------------------------------- |
| Bluesky               | Yes. Open AT Protocol, image posts, OAuth or app password                                              | Low                         | **Do first**                                       |
| Tumblr                | Yes. Public API, image posts, OAuth                                                                    | Low–medium                  | Good second                                        |
| Threads               | Yes. Meta publishing API                                                                               | Medium (Meta developer app) | Pair with Instagram                                |
| Instagram             | Yes, for professional (creator/business) accounts; carousels supported; images must be at a public URL | Medium–high                 | Worth it only if IG matters most                   |
| Facebook Page         | Yes, Pages API under the same Meta app                                                                 | Medium                      | Rides along with Meta                              |
| X                     | Paid API tiers; pricing has changed often                                                              | High, recurring             | Skip; post by hand                                 |
| WEBTOON Canvas, Tapas | No public upload API                                                                                   | —                           | Lyrefly already exports their ZIPs; keep it manual |
| Mixam                 | No API                                                                                                 | —                           | Manual                                             |

Meta's app review rules, X's pricing and every platform's limits change; confirm each before
writing code for it.

### Recommendation

Build in this order, and stop at whichever step makes posting stop feeling like a chore:

1. **Accounts and publications in Lyrefly** (part 2). Useful today, needed by every later step.
2. **Post kits, no integrations.** For a comic, prepare each platform's version in one place:
   image set cropped to that platform's ratio, caption, alt text (Slant of Rain already writes
   it), hashtags, and links. Each platform gets a "Copy caption" and an "Open composer" button
   (Bluesky, Threads, X and Tumblr all have compose-intent URLs). Paste the posted link back and
   it lands in the publish log. This removes most of the repetitive work with no OAuth, no
   server and nothing that can break while you sleep.
3. **Direct posting to Bluesky only.** The cheapest real integration, and enough to tell whether
   one-click posting changes how often you post.
4. **Scheduling, or the Meta trio,** only if step 3 earns its keep. Before building it, compare
   with a scheduling service that already supports those platforms; for one person, renting
   that is usually cheaper than owning token refresh for four APIs.

---

## Suggested build order

| #   | Slice                                                                                                                | Size |
| --- | -------------------------------------------------------------------------------------------------------------------- | ---- |
| 0   | ~~Archive pull merges publish-log rows by id~~ (done: fixed with the pull-skip bug it exposed)                       | —    |
| 1   | Personas, series and accounts: a portfolio-level Drive file, merge rule and tombstones (no home for them exists yet) | M    |
| 2   | Site importer: `importKey`, deterministic ids, dismissed keys                                                        | M    |
| 3   | Shared Encore originals contract, its tests, and the ADR                                                             | S    |
| 4   | `ComicSource` + "Make a comic" from Encore + "From a song" in Lyrefly                                                | M    |
| 5   | Song-changed / not-backed-up / deleted states                                                                        | S    |
| 6   | Post kits                                                                                                            | M    |
| 7   | Bluesky posting (needs BFF token storage)                                                                            | M–L  |

Slices 0–2 and 3–5 do not touch the same files and can run in parallel.

## Open questions

- Is Slant of Rain a series (as modelled above) or something you think of differently?
- Do you want Encore's "Make a comic" button on every original, or only once a song has
  lyrics?
