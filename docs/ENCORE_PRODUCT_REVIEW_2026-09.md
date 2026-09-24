# Encore product review — 2026-09

**Trigger:** the owner reported dreading the idea of opening Encore, and asked for a
product-management read rather than another bug fix.

This is an **analysis, not a decision**. Every recommendation is a proposal; the taste calls
belong to the owner. Nothing here has been implemented.

## The measurement

Encore is measured against Labs' own first coherence principle
([`PRODUCT_VISION.md`](PRODUCT_VISION.md) § Coherence principles):

> **One clear job per app.** Every app has one primary user and one primary journey (a verb
> phrase). "For everyone" and "does a bit of everything" are anti-patterns.

Encore today:

| Dimension                               | Count                                                                                                                                         |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Co-equal top-level tabs                 | **6** (Repertoire, Originals, Performances, Practice, Settings, Help)                                                                         |
| Documented CUJs                         | **8**                                                                                                                                         |
| Distinct jobs                           | **4** (repertoire tracking, songwriting, gig log, practice planning)                                                                          |
| Columns on the entry screen             | **~14** (Title, Artist, Tags, Key, Performances, Practicing, Milestones, Ref tracks, Backing, Spotify, Charts, Takes, Venues, Last performed) |
| Columns in Originals                    | **9**, including a stage badge and a `n/4 stages` score per row                                                                               |
| External integrations in primary chrome | Drive, Spotify, YouTube, public snapshot, guest share                                                                                         |

Encore is not failing at its job. It is doing four jobs, which is the anti-pattern the vision
doc names. The dread is a predictable consequence, not a mystery.

## Three mechanisms that produce dread

### 1. It scores creative work, and finds it wanting

Every row in the Originals library renders `originalsLibraryStageLabel` plus
`originalsLibraryStageProgressDetail` — a stage name and `3/4 stages`. With twenty originals,
opening the songwriting surface presents a **wall of unfinished business**, sorted and
quantified.

Until #219 this was worse than nagging: `inferredWorkflowStage` used the monotonic predicate
while `isOriginalDemoReady` used the raw one, so a song with takes but no chord markers read
"Record Takes" **forever** and could never reach "Demo ready". The app displayed permanent,
unresolvable incompleteness about the owner's own songwriting.

A song is not 3/4 done. Songwriting has no denominator. Stage is genuinely useful as a
**filter** ("show me things without takes"); as a **score on every row** it is a reproach.

### 2. There is no front door

Six co-equal tabs, landing on the largest table in the app. Nothing answers _"what should I do
now?"_ — so every visit opens with a decision. Decision load at the threshold is what converts
"I could work on music" into "not today".

None of the eight CUJs is "make progress on something today". They are all _browse X_ or _edit
X_ mechanics. The missing journey and the missing front door are the same gap.

### 3. The visible surface is mostly metadata, not music

Roughly 23 columns across the two libraries, plus Drive sync status, Spotify, YouTube import
and share settings in primary chrome. Most of the pixels are _about_ music rather than for
_doing_ music. That is the right trade for an archivist auditing a catalogue, and the wrong one
for a singer deciding what to sing.

## The mode conflict

The deeper issue is that Encore contains two incompatible kinds of work:

|        | Originals                         | Repertoire · Practice · Performances |
| ------ | --------------------------------- | ------------------------------------ |
| Nature | Creative, open-ended, exploratory | Maintenance, enumerable, completable |
| Wants  | A blank page, quiet, no counters  | Lists, filters, counts, history      |
| "Done" | Does not exist                    | Is the point                         |

Putting them behind sibling tabs means **every attempt to write passes the admin backlog on the
way in**. That is a reliable way to make someone stop writing.

## Recommendations

### P0 — cheap, and aimed directly at the dread

1. **Remove the per-row stage score from the Originals grid.** Keep Stage as a filter and sort
   key; drop `n/4 stages` from the row. One-line change to a display helper.
2. **Open Originals on the song last touched**, not the table. The table stays one click away.
3. **Default the repertoire table to ~5 columns** (Title, Artist, Key, Practicing, Last
   performed); the remaining nine behind a "more columns" control.

### P1 — structural, needs a design pass

4. **Give Encore a front door.** Land on what is actually live: the next gig, the song touched
   yesterday, the one practice item due. Tabs become navigation rather than the entry decision.
   This wants a `labs-ux-journey` sketch before any code.
5. **Consider splitting Originals into its own app.** The seam is already clean — separate Dexie
   store, separate Drive folder (`Encore_App/Originals/`), its own ADR
   ([0012](adr/0012-encore-originals-local-first-domain.md)), and **zero shared rows** with
   repertoire: the only `EncoreSong` reference in Originals' 13,497 lines is a comment saying
   they are separate.

   Per the vision doc's own new-app-vs-extend test, two jobs this different, with no shared
   data, are two apps. The counter-argument is real (a new app costs a shell, sync, a regression
   surface and catalog area) — which is why this is a proposal, not a plan.

## Proposed CUJ reprioritization

| CUJ                                               | Today              | Proposed                  | Why                                                                                    |
| ------------------------------------------------- | ------------------ | ------------------------- | -------------------------------------------------------------------------------------- |
| **"I have 20 minutes — show me what to work on"** | does not exist     | **P0, primary**           | The missing primary journey. Its absence is why there is no front door.                |
| CUJ-001 Browse repertoire                         | primary by default | P1                        | Browsing is how you _find_ something, not why you opened the app.                      |
| CUJ-005 Browse Originals (grid)                   | listed             | P2, and stop scoring rows | The grid is an audit tool; the song is the work.                                       |
| CUJ-003 Originals chord editing                   | listed             | P1                        | Real creative work — deserves higher standing than browsing.                           |
| CUJ-002 Practice / performance log                | listed             | P1                        | Genuine recurring job.                                                                 |
| CUJ-006 Guest share preview                       | **P0**             | P2                        | A sharing feature outranking the owner's daily use is inverted for an audience of one. |
| CUJ-004 Performance video UX                      | listed             | P2                        | Valuable, but downstream of logging a performance at all.                              |
| CUJ-007/008 Song page resources, drag-and-drop    | listed             | P3                        | Mechanics, not journeys.                                                               |

## What this review does not recommend

- **Not deleting features the owner uses.** Nothing above removes a capability; the P0 items
  change what is _shown by default_.
- **Not a rewrite.** Items 1–3 are display changes. Items 4–5 are design questions.
- **Not more performance work.** Typing latency was real and is fixed (#211, #214, #221). It was
  not the cause of the dread, and treating it as the cause would have kept missing the point.

## Related

- [`PRODUCT_VISION.md`](PRODUCT_VISION.md) — coherence principles, new-app-vs-extend test
- [`src/encore/CUJs.md`](../src/encore/CUJs.md) — the eight current journeys
- [`APP_QUALITY_TIERS.md`](APP_QUALITY_TIERS.md) — Encore is `protected`
- Skill `labs-pm-review`, skill `labs-ux-journey`
