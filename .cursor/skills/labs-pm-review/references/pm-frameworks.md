# Product-management frameworks — review reference

The toolkit the `labs-review-pm` subagent draws on, filtered for a portfolio whose
primary audience is one person (the owner) and whose auxiliary audience is a friend
as a read-only guest. Use the framework that fits; do not cargo-cult big-company PM.

## Prioritization (n=1 calibrated)

- **Value vs. Effort (2×2)** — the default here. Quick wins / big bets / fill-ins / money pits. Effort must include perpetual maintenance, not just build.
- **ICE** (Impact × Confidence × Ease) — light ranking with little data. Fits a solo portfolio.
- **RICE** (Reach × Impact × Confidence ÷ Effort) — the standard for a real user base, but **Reach ≈ 1** here, so it collapses to Impact-to-owner ÷ Effort. Do not reach-weight.
- **MoSCoW** (Must / Should / Could / Won't) — the scoping lever. The **"Won't (this time)"** bucket is the point: it names what is out of the MVP.
- **Kano model** — basic/hygiene vs performance vs delighter. Guards against hygiene-only work dressed up as delight, and against gold-plating.

**Do not use here:** market sizing / TAM, A/B testing, statistically-powered experiments, growth-funnel scoring, competitive positioning. For n=1 they add ceremony without signal.

## Discovery & framing

- **Jobs-To-Be-Done** — frame a feature as the job the user hires it to do, independent of implementation. "What job does this do that no existing Labs app does?"
- **Opportunity Solution Tree** (Teresa Torres) — outcome → opportunities (needs/pains) → solutions → assumption tests. Keeps a proposed solution traceable to a real need, and surfaces lighter solutions to the same need.
- **One primary persona** — tailor to a specific user, not "everyone." Here the specific user is usually the owner; sometimes the friend as a viewer.

## Vision & scope artifacts

- **Product vision statement** — durable "who + what problem + why." The portfolio's lives in `docs/PRODUCT_VISION.md`.
- **Working Backwards / PR-FAQ** (Amazon) — write the one-page "launch note" and FAQ before building; forces a specific customer and a clear job up front. A lightweight PR-FAQ is a good shape for a net-new Labs app proposal.
- **Explicit non-goals** — every proposal names what it will **not** do. Labs already does this well (Encore "not a separate learning app"; Count "portability is not a goal"; ADR 0013 scope lines). Demand it.
- **North Star** — the single leading signal of value. For Labs it is "the owner actually uses it," not a growth metric.

## Portfolio management

- **Overlap / cannibalization** — two surfaces doing the same job split the user's data and double the maintenance. Resolve by **subsuming** into one app (ADR 0013) or **clear domain ownership** (ADR 0007), not a long parallel run.
- **Cohesion vs. sprawl** — a shared design system, shared primitives, and consistent conventions keep a large portfolio reading as one family. Each new app adds shell + sync + regression + catalog surface, all maintained by one person.
- **Sunset discipline** — retire or redirect a stalled app rather than run it forever (precedent: `/beat/` → `/stanza/` redirect). `development`/`unlisted` apps that never ship are a cost, not an option.
- **New app vs. extend** — the default is extend; a new app needs a genuinely distinct job, audience, and interaction model. This is the test in `docs/PRODUCT_VISION.md`.

## The "decide not to do" pattern

From `docs/TECH_DEBT_ROADMAP.md` § "Consciously skipped (decided, not forgotten)":
state the decision **and the named re-open trigger** that would change it ("when the
friend needs write access," "when a second concurrent editor exists"). A deferral
with a trigger is durable; a deferral without one is just forgetting.

## Reviewer patterns worth borrowing

- **Uber's first-pass AI PRD reviewer** — lenses: opportunity/hypothesis (is the problem real and success defined?), product scope (well-scoped, decision-ready), UX & impact, metric rigor; and it **calibrates depth by proposal type** (light for parity → full for net-new). The Labs adaptation swaps "market headroom / segments" for "will the owner use it, and does it fit the portfolio?"
- General lesson from PRD-reviewer tools: **frameworks beat generic critique** — tie each finding to an explicit criterion and a known failure mode (scope creep, undefined non-goals, overlap, second-order effects).
