# Does this check earn its place?

How to decide whether a CI check should be **blocking**, **advisory**, **scheduled**, or
**deleted**. Companion to [`CI_RELIABILITY.md`](CI_RELIABILITY.md) (how to keep checks green) and
[`ENGINEERING_HEALTH.md`](ENGINEERING_HEALTH.md) (how healthy they currently are). This doc is about
whether a check should exist at all.

## Why this repo needs its own rule

Almost all CI literature assumes a team. The economics here are different, and in both directions:

- **Cheaper:** a red trunk blocks nobody. There is no coordination cost, no one waiting.
- **More expensive:** there is no reviewer. Nothing catches what CI misses, and nothing makes a
  warning get read. **The developer's attention is the scarcest resource in the system.**

That second point drives everything below. Google can afford non-blocking static analysis because a
human reviewer sees the comment and decides ([SWE at Google ch.
20](https://abseil.io/resources/swe-book/html/ch20.html)). Here, a finding with no gate goes
nowhere — as six untriaged CodeQL alerts and a nightly that ran red for ten days both demonstrate.

## The four questions

**Q1 — Uniqueness.** What defect class does it catch, and what else catches that class? If
something else catches it earlier or cheaper, this one is redundant.

**Q2 — Consequence.** If the defect ships, what does it cost?

- **Reversible** — wrong behaviour, broken layout, a dead app. Cost: revert and redeploy.
- **Irreversible** — data loss, a leaked secret, corrupted sync state, a published artifact already
  fetched and cached. Cost: unbounded.

This repo's risk posture is deliberately lopsided: high tolerance for behaviour breakage, near-zero
for durability ([`major-change-review-gates.md`](../.agents/rules/major-change-review-gates.md)).
Checks should be lopsided the same way.

**Q3 — Accuracy.** Of the last 10 failures, how many were real defects?

- **≥95%** — trustworthy.
- **50–95%** — noisy. You will start skimming it, then ignoring it.
- **<50%** — **broken by definition**, not a judgment call. Ewaschuk's rule: ["Alerts that are less
  than 50% accurate are broken"](https://gist.github.com/msgodf/86a3fc7fcd3ce663ff37).

**Q4 — Actionability.** When it fires, can you act _where it fires_, without a research project?
"Rerun it" is not an action.

## Placement

| Placement     | Requires                                                                                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Blocking**  | Unique · **and** (irreversible **or** high-consequence) · **and** accuracy ≥95% · **and** actionable in the PR · **and** inside the 10-minute budget¹ |
| **Advisory**  | A real defect class, but accuracy <95%, or not actionable in-PR, or too slow. **Must write something down** — see the solo rule.                      |
| **Scheduled** | Slow · unique class · not needed per-change. Must have a notification path and a wall-clock cap.                                                      |
| **Deleted**   | Never caught anything **and** the class is reversible **and** something else overlaps. Or accuracy <50% with no repair planned.                       |

¹ Ten minutes is [Fowler's commit-build budget](https://www.martinfowler.com/bliki/DeploymentPipeline.html).
It binds here not because teammates are waiting but because past ~10 minutes you context-switch and
stop reading the result. **A check running in parallel with a longer one is free** — CodeQL's 3.4
minutes alongside a 9.2-minute CI/CD costs zero wall clock.

## The solo rule

**Advisory means off, unless it writes something down.**

A team repo can rely on someone noticing a yellow warning. This one cannot. An advisory check must
open or update a GitHub issue on failure and close it on success. **An advisory check whose only
output is a workflow log is deleted — it just hasn't been removed yet.**

Two live examples of the failure mode: the nightly's `jscpd` and complexity ratchets are both
labelled "advisory (never fails)" and neither has ever prompted an action; and
`weekly-engineering-health.yml` runs `--fail-below 90` under `continue-on-error: true`, so the CI
health monitor was warning into a log during the same ten days the nightly sat red.

## Four hard cases

### A check that never fails

Never-failed is **ambiguous**, not damning: it means either prevention is working or the check is
vacuous. Do not argue about which — **resolve it empirically.**

Every blocking check needs a recorded falsification: a fixture, a test, or a commit proving it goes
red when the thing it guards breaks. A check nobody can make fail is deleted or repaired, however
cheap it is. Cheap insurance is only insurance if it pays out.

This is the same rule as
[`guardrails-must-be-falsifiable.md`](../.agents/rules/guardrails-must-be-falsifiable.md), applied
to CI jobs instead of test files, and for the same reason: this repo has shipped four guardrails
that could not fail and two whose coverage excluded the code they governed.

### A check that always fails

Zero information — and worse than useless, because sustained red trains you to ignore _all_ red,
so a real failure gets ["masked by the noise"](https://sre.google/sre-book/monitoring-distributed-systems/).

Deleting is usually wrong; the class it covers may still matter. Force a decision instead:

> **Three-strike rule.** A check red for 3 consecutive scheduled runs is demoted to advisory, and a
> repair issue opens with a two-week deadline. If the deadline passes, the check is deleted —
> deliberately, recording in the deletion commit which defect class is now uncovered.

The worst state is not red, and not deleted. It is **red and tolerated**.

### Slow, but catches a class nothing else does

Keep it, and move it off the per-change path into a later stage. Then cap its wall clock, split it
so one failure cannot mask another, and give it a notification path.

Splitting matters more than it sounds. GitHub Actions aborts remaining steps in a job on failure, so
three sequential steps in one job means failure #1 hides #2 and #3 — which is exactly how the
nightly produced three different failures in sequence, each discovered only after the last was
fixed. **Separate jobs also give each class its own red/green history**, which is what makes the
three-strike rule applicable per-class instead of to the whole workflow.

### A ratchet that only prevents growth

Ratchets are legitimate [fitness
functions](https://www.thoughtworks.com/radar/techniques/architectural-fitness-function). But a
ratchet with no burn-down commitment quietly converts "we have 684 violations" into "684 is
acceptable." Three states:

- **At 0** → delete the ratchet, replace with a plain gate. A ratchet at zero is a gate in costume.
- **Trending down** → healthy. Keep it blocking.
- **Flat for 90 days** → it is not a ratchet, it is a baseline. Demote to advisory, and either
  commit to a target number and date or accept the state and delete the check.

Measured example: `react-hooks-baseline.json` was created at 684 on 2026-07-22, dipped to 681 on
2026-08-09, and was raised back to 684 the same day to unblock CI. Both of its post-creation commits
are titled "unblock CI". It has cost more in maintenance than it has recovered in debt.

**Prefer per-file baselines over a single total.** Per-file localises the debt, lets a file reach
zero and drop out of the map, and makes progress legible in a diff. `css-important-baseline.json` and
`knip-exports-baseline.json` have the right shape; `react-hooks-baseline.json`'s single `total: 684`
does not — nobody can tell from it whether anything improved.

## Escape hatch

Any check can be bypassed for a production fire, in the open, with the reason recorded. A gate with
no bypass gets bypassed silently. This does **not** license `--no-verify`, which stays on the Never
list in [`AGENTS.md`](../AGENTS.md) — it means a documented, deliberate override, visible in history.

## When you add a check

1. Name the defect class, and name what else covers it.
2. Prove it fails against the broken version (falsification, above).
3. Pick a placement from the table — not "blocking" by default.
4. If advisory or scheduled, wire the notification path in the same PR.
5. Record it in [`ENGINEERING_HEALTH.md`](ENGINEERING_HEALTH.md).

## When you delete a check

Record the deletion in `ENGINEERING_HEALTH.md` § What we stopped doing, naming **the defect class
that is now uncovered**. A deletion nobody wrote down is indistinguishable from a check that broke
and got quietly removed.

Root cause classes: `check-with-no-teeth` (a real finding that merged because nothing gated on it),
`advisory-into-the-void` (a check whose only output is a log), `ratchet-as-permission` (a baseline
flat long enough to have become the target).
