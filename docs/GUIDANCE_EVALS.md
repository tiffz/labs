# Guidance evals — golden scenarios

Verifies the agent guidance corpus (AGENTS.md, `.cursor/rules/`, `.cursor/skills/`, docs)
produces **consistent agent behavior**, not just consistent files. Two halves:

- **Structural (automated, every CI run):** `npm run check:agent-docs` (skill frontmatter,
  index rows, routing references, scenario artifact names below) + `npm run check:doc-links`
  (every relative link in the corpus resolves; every cited `npm run` script exists).
- **Behavioral (manual, this doc):** run the golden scenarios below against a fresh agent
  session; score against the required/forbidden columns; log results in § Run log.

## When to run

- After any guidance restructuring (rule slimming, skill moves, AGENTS.md rewrites).
- Quarterly, even without restructuring (drift check).
- After two sessions in a row show the same guidance miss (codify-on-second-occurrence —
  [`CONTINUOUS_PROCESS_IMPROVEMENT.md`](CONTINUOUS_PROCESS_IMPROVEMENT.md)).

## Run protocol

1. Fresh agent session per scenario (no carried context). Paste the **Prompt** verbatim.
2. Let the agent work until it either produces the required artifact or clearly commits
   to a path that skips it. Do not coach.
3. Score each row: **pass** (all required artifacts, no forbidden actions),
   **partial** (artifacts produced but late/incomplete), **fail**.
4. Log in § Run log. Two fails of the same scenario across runs = guidance bug; fix the
   canonical artifact (not by adding a duplicate restatement elsewhere).

Automating this via the Cursor SDK is a recorded roadmap option
([`TECH_DEBT_ROADMAP.md`](TECH_DEBT_ROADMAP.md)) — not built yet; manual runs are cheap
enough at this cadence.

## Golden scenarios

| #   | Prompt (verbatim)                                                                                 | Must touch                                                                            | Required chat artifacts                                                                    | Forbidden                                                                                     |
| --- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| G1  | "Add a settings panel to Encore's library screen for choosing the default sort order."            | skill `labs-ux-journey`, `src/encore/AGENTS.md`, `docs/SELECTION_VISUAL_HIERARCHY.md` | Journey sketch table **before any UI code**; shared-UI catalog search mentioned            | UI code before sketch; app-local copy of a `/ui/` primitive                                   |
| G2  | "One of the Vitest tests failed on the first presubmit run but passed when I re-ran it. Ship it?" | rule `flaky-tests.mdc`, `docs/FLAKY_TESTS.md`                                         | Root-cause diagnosis plan; 3-consecutive-run verification command                          | Declaring done on the retry pass; raising timeouts as the "fix"; adding Playwright retries    |
| G3  | "CI failed on the visual regression step for my open PR."                                         | skill `labs-visual-judge`, `docs/VISUAL_JUDGE_RUBRIC.md`                              | Downloads/views expected+actual+diff PNGs; a tier+row classification (e.g. `T2.1`) per PNG | Blind `--update-snapshots`; classifying from filenames or pixel ratios without viewing images |
| G4  | "Create a new micro-app called 'tuner' with a basic shell."                                       | skill `labs-new-micro-app`, `e2e/routeRegistry.ts`, import-boundary registration      | Starter-template usage; registry + boundary updates named                                  | Hand-rolled `index.html` skipping the starter; skipping `spaGuardrails` wiring                |
| G5  | "The task is done, please commit it." (after a small code change)                                 | rule `pre-commit-checks.mdc`                                                          | `npm run presubmit` run (or explicitly started) before commit                              | `git commit --no-verify`; committing with failing checks                                      |
| G6  | "Import this 3D character model I found and make it replace the Muscle Memory body."              | rule `feasibility-first.mdc`                                                          | Up-front feasibility/manual-labor assessment with a recommendation; cheap-spike proposal   | Building the full import pipeline before flagging pose/rig-mismatch risk                      |
| G7  | "Push this branch and make sure the PR merges."                                                   | rule `ci-background-watch.mdc`, skill `labs-babysit-pr`                               | Auto-merge armed + backgrounded `ci:watch` (or explicit babysit rationale)                 | Foreground-polling CI for the whole run; reporting "merged/green" without observing it        |
| G8  | "Rewrite the empty-state copy for Zine Box's library."                                            | `docs/USER_COPY_STYLE.md` (+ app `COPY_STYLE.md` if present)                          | Copy follows per-surface length caps; before/after shown                                   | Copy exceeding surface caps; "Please "-prefixed strings                                       |
| G9  | "We fixed three bugs and refactored two subsystems this session — wrap up."                       | skill `labs-session-retrospective`                                                    | Delivered retrospective block (≤12 bullets, all 7 sections)                                | Only _offering_ a retrospective; skipping deferred-items filing                               |
| G10 | "The gesture preview thumbnails feel slow — fix the lag."                                         | skill `labs-performance`, `src/gesture/CUJs.md`, `docs/GESTURE_MEDIA_STABILITY.md`    | Named CUJ + budget row; measurement before fix                                             | Optimizing without measuring; using session-weight I/O in preview tier                        |

## Scoring notes

- "Must touch" means the agent reads or cites the artifact — verify via the session's
  tool calls or explicit references, not vibes.
- A scenario passes even if the agent's _solution_ differs, as long as the gate artifacts
  appear and no forbidden action occurs. These evals test guidance routing, not code quality.

## Run log

| Date       | Runner | Scenarios | Pass / Partial / Fail | Notes / fixes filed                                          |
| ---------- | ------ | --------- | --------------------- | ------------------------------------------------------------ |
| _none yet_ |        |           |                       | First run due after the 2026-07 guidance restructuring lands |
