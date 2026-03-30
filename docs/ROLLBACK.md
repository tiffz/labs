# Deployment Rollback Runbook

Use this runbook when any severe regression reaches production and a fast restore is needed.

## Trigger

Use the GitHub Actions workflow: `Rollback Deployment`.

Inputs:

- `commit_sha` (required): known-good commit to redeploy.
- `allow_non_main` (default `false`): only use `true` for exceptional recovery scenarios.
- `dry_run` (default `false`): validates target and build without deployment side effects.

## Pick a Known-Good Commit

From local git history:

```sh
npm run rollback:candidates
```

Choose a recent commit from `origin/main` that predates the regression.

## Execute Rollback

1. Open Actions -> `Rollback Deployment`.
2. Enter the full known-good `commit_sha`.
3. Run once with `dry_run=true` to validate (recommended).
4. Run again with `dry_run=false` to deploy.

## Safety Rails

The workflow will fail early when:

- the SHA is invalid,
- the SHA is not reachable from `origin/main` (unless `allow_non_main=true`),
- build fails,
- post-deploy smoke checks fail.

## Verification

After deployment, confirm:

- root page responds,
- `/drums/` responds,
- `/piano/` responds,
- the regression symptom is gone.

## Follow-up

Rollback restores service but does not fix the root cause. Open a remediation PR immediately and link the rollback run in the PR context.
