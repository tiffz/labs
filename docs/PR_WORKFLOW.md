# Pull request workflow (solo developer)

Labs has **no human code review**. Pull requests exist for three reasons:

1. **CI gate** — GitHub Actions runs lint, typecheck, tests, e2e smoke, and build before code lands on `main`.
2. **Audit trail** — Each merge is a squash commit with a PR title/body you (or an agent) can search later.
3. **Scoped rollback** — One PR ≈ one revert unit if production misbehaves.

Bots (e.g. CodeRabbit) are **optional signal**, not approvers. They can rate-limit or miss context; **green CI + local presubmit** is the merge bar.

Canonical merge policy for this repo: **squash merge** into `main`, **delete the branch** after merge.

## When to open a PR vs push to `main`

| Situation                                                                 | Prefer                                                                                   |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Feature, refactor, multi-file change, or anything that should run full CI | **PR**                                                                                   |
| Agent batch work (decomposition series, roadmap slices)                   | **PR per slice** — skill `labs-split-to-prs`                                             |
| Docs-only typo on `main` you want live in 30 seconds                      | Direct commit to `main` is OK if you accept skipping PR CI (still run presubmit locally) |
| Visual/audio baseline updates                                             | **PR + explicit human review** of snapshot diffs — never silent baseline refresh         |
| Hotfix for broken `main`                                                  | Branch + PR (or hotfix branch); use [rollback workflow](ROLLBACK.md) if already deployed |

Default for agents: **branch → PR → merge**, unless you explicitly say “commit/push to main.”

## Branch naming

```
refactor/<short-topic>     # behavior-preserving splits
fix/<short-topic>          # bug fixes
feat/<short-topic>         # user-visible features
docs/<short-topic>         # docs-only
chore/<short-topic>        # tooling, deps, CI
```

One logical change per branch. Prefer **≤ ~400 lines** diff when splitting is easy (see `labs-split-to-prs`).

## End-to-end loop

```mermaid
flowchart LR
  A[Branch from main] --> B[Implement]
  B --> C["npm run presubmit"]
  C --> D[Push + open PR]
  D --> E[CI green]
  E --> F[Triage bot comments]
  F --> G{Merge bar met?}
  G -->|yes| H[Squash merge]
  G -->|no| B
  H --> I[Delete branch + pull main]
```

### 1. Branch

```bash
git fetch origin
git checkout main && git pull
git checkout -b refactor/my-topic
```

### 2. Implement + verify locally

Before **every** push that you intend to merge:

```bash
npm run presubmit
```

Presubmit matches the Husky pre-commit hook (import boundaries, lint, knip, typecheck, fast tests). CI also runs e2e smoke and other checks — see `.github/workflows/ci.yml`.

### 3. Push and open PR

```bash
git push -u origin HEAD
gh pr create --title "Short imperative title" --body "$(cat <<'EOF'
## Summary
- …

## Test plan
- [x] `npm run presubmit`
- [ ] …
EOF
)"
```

Use the [PR template](../.github/pull_request_template.md). For solo work, **Summary + Test plan** are enough; skip Bug-fix handoff unless it was a regression fix.

### 4. Wait for CI

Watch the **`test`** job on the PR (≈8–15 min). CodeRabbit may comment; treat inline suggestions as a **second pair of eyes**, not a veto.

**Merge blockers**

- Any required CI check failed
- You have not run presubmit on the latest commit
- Visual/audio snapshot changes you have not inspected
- Known flaky failure you have not confirmed is unrelated (re-run CI once; merge latest `main` if branch is stale)

**Not merge blockers**

- CodeRabbit rate limit / “review skipped”
- CodeRabbit nit with no CI impact (still fix quick wins like syntax errors)
- Empty human review (there are no human reviewers)

### 5. Triage feedback

Skill: **`labs-babysit-pr`**.

1. Read **inline review comments** and **CI logs** only — ignore bot walkthrough noise unless it points at a real bug.
2. Fix valid issues on the PR branch; push; wait for CI again.
3. Reply on fixed threads when the bot asked for a specific change (optional; helps future you).

Do **not** weaken CI, skip hooks, or `--no-verify` to merge.

### 6. Merge

When CI is green and presubmit passed on HEAD:

```bash
gh pr merge <number> --squash --delete-branch
git checkout main && git pull
```

Merge **stacked PRs in dependency order** (foundation first). After merging PR _n_, rebase or merge `main` into downstream branches before merging _n+1_.

Agents: merge only when the user asked to merge (or babysit through merge-ready **and** merge).

### 7. After merge

- Confirm [open PRs](https://github.com/tiffz/labs/pulls) list is clean for that batch.
- Continue decomposition/refactor series from updated `main`.
- Optional: note process learnings in PR § Process improvements or skill `labs-session-retrospective`.

## Review signal hierarchy (solo)

| Priority | Signal                                                         | Action                            |
| -------- | -------------------------------------------------------------- | --------------------------------- |
| 1        | CI failed                                                      | Fix or abort merge                |
| 2        | Local presubmit failed                                         | Fix before push                   |
| 3        | Guardrail / regression test you added                          | Must pass                         |
| 4        | CodeRabbit inline **actionable** bug (syntax, logic, security) | Fix if valid                      |
| 5        | CodeRabbit style/nit                                           | Fix if trivial; otherwise backlog |
| 6        | CodeRabbit rate limit                                          | Ignore for merge decision         |

## Splitting large work

Use skill **`labs-split-to-prs`**:

- Propose slices → get approval → one PR per slice → presubmit each → merge in order.
- Example series: route registry → SessionScreen helpers → ScoreDisplay helpers.

Do not open five PRs and merge all at once without checking CI on each; merge sequentially reduces “everything broke at once” debugging.

## Agent + user conventions

| Action            | Default                                                   |
| ----------------- | --------------------------------------------------------- |
| Commit            | Ask first (unless you said “commit”)                      |
| Push              | Ask first (unless you said “push”)                        |
| Open PR           | Ask first (unless you said “open a PR”)                   |
| Merge             | Ask first (unless you said “merge” / “babysit and merge”) |
| Force-push `main` | Never without explicit request                            |

## Related docs

- [`AGENTS.md`](../AGENTS.md) — agent boundaries and task routing
- [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — what CI actually runs
- [`docs/REGRESSION_WORKFLOW.md`](REGRESSION_WORKFLOW.md) — visual/audio baselines
- [`docs/ROLLBACK.md`](ROLLBACK.md) — production rollback
- Skills: `labs-babysit-pr`, `labs-split-to-prs`
