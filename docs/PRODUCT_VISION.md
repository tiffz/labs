# Product vision

The portfolio-level product contract for Labs. Per-app intent lives in each
`src/<app>/README.md`; this doc owns the whole: who Labs is for, what holds it
together, and the test for adding to it. The senior-PM review gate
([`labs-pm-review`](../.agents/skills/labs-pm-review/SKILL.md),
[`.claude/agents/labs-review-pm.md`](../.claude/agents/labs-review-pm.md)) reviews
proposals against this doc.

## Who Labs is for

- **Primary audience: one person — the portfolio owner.** Labs is a personal suite
  of small, well-made tools. Success is not reach or growth; it is that the owner
  **actually uses each app and enjoys it**. The North Star is use, not scale.
- **Auxiliary audience: a tiny trusted circle** — the owner's husband and a friend.
  Their access is app-specific: some apps share a read-only snapshot for a viewer;
  a few private apps (e.g. Encore, restricted to the owner and their husband) grant
  full login. This circle matters as a **sharing/access boundary** — what a guest or
  a trusted co-user can see and do — not as a second market to design for.

What this rules out: market sizing, A/B tests, growth funnels, reach-weighted
prioritization, competitive positioning. With an audience of one, prioritization is
value-to-owner vs. effort, and effort includes **perpetual maintenance** — every
app is maintained forever by the same one person.

## What Labs is

A cohesive family of small web apps, catalogued in
[`src/labsHome/labsCatalog.manifest.json`](../src/labsHome/labsCatalog.manifest.json)
(the single source of truth for the `/` home grid). Today: **23 apps** across three
categories, on a lifecycle ladder.

- **Categories:** **Music** (practice, notation, rhythm, ear training), **Art &
  Writing** (drawing practice, comics/zines, generators), **Games**.
- **Stage:** `stable` (public), `development` (public, "Experimental"),
  `unlisted` (URL-reachable, off the grid). Stage is the honest lifecycle signal —
  an app graduates to `stable` when it is good, or gets sunset when it is not.

Beneath the three catalog categories, apps share **domain clusters** in code:
music/audio/notation (drums, chords, scales, stanza, encore, words, count, pitch,
melodia, midi, agility) and comics/zines (zines, zinebox, lyrefly, scrapboard). The
shared code (`src/shared/**`), the shared UI catalog (`/ui/`), the shared token
families, and per-app `DESIGN.md` overrides are what make the portfolio read as one
product family while each app keeps its own identity. See
[`SHARED_UX_PATTERNS.md`](SHARED_UX_PATTERNS.md) and
[`SHARED_UI_CONVENTIONS.md`](../src/shared/SHARED_UI_CONVENTIONS.md).

## Coherence principles

1. **One clear job per app.** Every app has one primary user and one primary
   journey (a verb phrase — see its `src/<app>/CUJs.md`). "For everyone" and
   "does a bit of everything" are anti-patterns.
2. **Scope is explicit, and so are non-goals.** Each app states what it is and what
   it is **not** — in the style of Encore ("not a separate learning app"), Zine Box
   (`## MVP scope`), and Count ("portability is not a goal"). The MVP is the
   smallest thing that does the job; name what is out.
3. **No overlap.** Two apps doing the same job split the owner's data and double the
   maintenance. Resolve overlap by **subsuming** into one app
   ([ADR 0013](adr/0013-stanza-subsumes-find-the-beat.md)) or by **clear domain
   ownership** ([ADR 0007](adr/0007-encore-owned-practice-resources-stanza-secondary-client.md)),
   never a long parallel run of two similar apps.
4. **Cohesion over sprawl.** Reuse shared primitives and tokens; a new app adds a
   shell, sync, a regression surface, and catalog area — all a permanent cost.

## The new-app-vs-extend test

Default to **extending** an existing app. A **new app** is justified only when all
three are genuinely distinct from every existing app:

- **Job** — the thing the user is trying to do.
- **Audience/context** — who, and in what situation.
- **Interaction model** — the core way the user works.

If the job overlaps an existing app, extend or subsume it instead. If in doubt, it
is not a new app. Adding an app is the highest-stakes portfolio decision because the
cost is paid forever by one person — run the [`labs-pm-review`](../.agents/skills/labs-pm-review/SKILL.md)
gate and, for the build, [`labs-new-micro-app`](../.agents/skills/labs-new-micro-app/SKILL.md).

## Deciding not to build

A "no" is a real product decision. Record it in
[`TECH_DEBT_ROADMAP.md`](TECH_DEBT_ROADMAP.md) § "Consciously skipped (decided, not
forgotten)" with a **named re-open trigger** — the condition that would change the
decision ("when the friend needs write access," "when a second concurrent editor
exists"). A deferral with a trigger is durable; one without is just forgetting.

## Related

- Proposal gate: [`labs-pm-review`](../.agents/skills/labs-pm-review/SKILL.md); design-time journey: [`labs-ux-journey`](../.agents/skills/labs-ux-journey/SKILL.md).
- Journeys and scope encoding: [`CRITICAL_USER_JOURNEYS.md`](CRITICAL_USER_JOURNEYS.md) + `src/<app>/CUJs.md`.
- Feasibility of a big ask (manual-labor yield): [`feasibility-first`](../.agents/rules/feasibility-first.md).
- The quality loop the portfolio runs on: [`QUALITY_SYSTEM.md`](QUALITY_SYSTEM.md).
