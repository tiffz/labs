# App quality tiers

How much rigor a change to an app deserves — testing depth, review gates, and
tolerance for sweeping changes — keyed to how much the app matters, not to how
public it is. The reviewer subagents and the test strategy calibrate to an app's
tier; the machine-readable tiers live in
[`app-quality-tiers.json`](app-quality-tiers.json).

## Two orthogonal axes

An app has two independent properties. Do not conflate them.

- **Visibility (`stage` in `src/labsHome/labsCatalog.manifest.json`)** — `stable`
  (public), `development` (public, experimental), `unlisted` (private / off the
  grid). This is about who can _see_ it.
- **Quality tier (this doc)** — `protected`, `standard`, `experimental`. This is
  about _regression-criticality_: how bad it is to break the app.

They are orthogonal. The canonical proof is **Encore**: it is `unlisted` because it
is private — a Google Drive app with an experimental integration that only the owner
and their husband can log into, deliberately not listed publicly — **and** it is
`protected`, because nearly all of the owner's singing practice runs through it.
`unlisted` says nothing about quality; a private app can be the most critical one.
Likewise Melodia, Muscle Memory, and Color Sight Trainer are also off the public
grid, but they are early and low-use, so they are `experimental`. Same stage,
opposite tiers.

## The tiers

### `protected` — do not regress

Apps the owner relies on regularly (e.g. Darbuka/`drums`, `encore`, the metronome).
A regression here breaks a real workflow.

- Full rigor: run the `labs-qa-review` and `labs-ux-review` gates on major changes; visual and e2e coverage is expected and treated as blocking; guardrails are required, never weakened.
- No sweeping rewrites without an architecture pass and a green review.
- The mandatory feature-test matrix (`docs/TEST_STRATEGY.md`) is enforced strictly.

### `standard` — normal rigor

Established apps in ordinary use. Default scoped tests, the standard `labs-local-review`
trio at merge, review gates by the usual right-sizing.

### `experimental` — move fast

Early-development, low-use apps (e.g. `melodia`, `muscle`, `sight`). Breaking them
costs little, and speed of iteration is worth more than protection.

- Sweeping changes are fine with minimal testing; do not gold-plate tests for an app that is still finding its shape.
- Skip the heavy gates; a smoke that the app still boots is usually enough.
- Promote to `standard`/`protected` when usage rises or the app graduates to `stable`.

## How a tier is set

`tier = f(usage, owner-declared criticality, lifecycle)` — usage first, listing
never:

1. **Usage (Google Analytics)** — the primary signal. `scripts/fetch-app-usage.mjs`
   pulls per-app metrics (active users, sessions, engaged time) from GA4 into
   `app-quality-tiers.json`. High sustained use → `protected`; near-zero → a
   candidate for `experimental`.
2. **Owner-declared criticality** — the override. Some apps are critical regardless
   of raw counts (a tool used intensely by one person still matters). The owner sets
   `criticality` in the JSON; it wins over the usage heuristic.
3. **Lifecycle** — an app still in early development defaults toward `experimental`
   until it stabilizes, unless usage or criticality says otherwise.

The seed tiers in the JSON come from the owner's stated usage; refresh with GA data
and adjust `criticality` by hand. This is intentionally advisory calibration, not a
hard CI switch — it tells an agent how much care to take, and it feeds the
"right-size the review" step in every gate. Wiring tiers directly into which apps
get blocking visual/e2e is a possible future step and would itself warrant an
architecture review (`labs-architecture-review`).

## Refreshing usage

```bash
# Requires a GA4 property id and credentials (see the script header).
GA4_PROPERTY_ID=... GOOGLE_APPLICATION_CREDENTIALS=... node scripts/fetch-app-usage.mjs
```

Run it periodically (a scheduled routine is a good fit) and commit the updated
`app-quality-tiers.json`. Usage numbers guide tiers; they do not set them
automatically — a human confirms a tier change, so a quiet week does not demote a
critical app.

## Who consults this

- **Reviewer gates** (`labs-pm-review`, `labs-architecture-review`, `labs-ux-review`, `labs-qa-review`) right-size their depth by the touched app's tier.
- **Agents making changes** — read the tier before deciding how much to test. Protected apps get the full care; experimental apps get speed.
- **The PM reviewer** treats usage as product signal, not just a test dial (a `protected` private app like Encore is a portfolio anchor; a long-idle `experimental` app is a sunset candidate).
