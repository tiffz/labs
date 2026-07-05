#!/usr/bin/env node
/**
 * Background CI watcher — poll a PR, branch run, or workflow run until finished,
 * then print ONE stable sentinel line. Designed to be run as a backgrounded Shell job
 * so an agent (or human) can keep working and only be interrupted on failure.
 *
 * Usage:
 *   node scripts/ci-watch.mjs [<pr-number>|<run-id>|<branch>|<run-url>] [--interval=20] [--timeout=2400]
 *   npm run ci:watch -- <pr-number>
 *   npm run ci:watch -- main          # latest run on branch (direct push to main)
 *   npm run ci:watch -- 28727869247   # specific workflow run id
 *
 * Sentinels (always exactly one, last line):
 *   CI_WATCH: PASS pr=<n> url=<pr-url>
 *   CI_WATCH: PASS branch=<b> run=<id> url=<run-url>
 *   CI_WATCH: PASS run=<id> url=<run-url>
 *   CI_WATCH: FAIL pr=<n> failed="a, b" run=<run-id> url=<failing-check-url>
 *   CI_WATCH: FAIL branch=<b> run=<id> failed="a, b" url=<run-url>
 *   CI_WATCH: FAIL run=<id> failed="a, b" url=<run-url>
 *   CI_WATCH: TIMEOUT pr=<n> url=<pr-url>
 *   CI_WATCH: TIMEOUT branch=<b> url=<run-url>
 *   CI_WATCH: TIMEOUT run=<id> url=<run-url>
 *   CI_WATCH: NO_CHECKS pr=<n> url=<pr-url>
 *   CI_WATCH: ERROR <message>
 *
 * Exit codes: 0 pass / no-checks, 1 fail, 2 timeout, 3 error.
 *
 * Process: see docs/PR_WORKFLOW.md § CI without blocking the session and
 * .cursor/rules/ci-background-watch.mdc. On FAIL, classify with
 * `npm run report:ci-failure -- <run-id>`.
 */
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith('--'));
const flags = Object.fromEntries(
  args
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, v] = a.replace(/^--/, '').split('=');
      return [k, v ?? 'true'];
    }),
);

const inputRef = positional[0] ?? '';
const intervalMs = Math.max(5, Number(flags.interval ?? 20)) * 1000;
const timeoutMs = Math.max(60, Number(flags.timeout ?? 2400)) * 1000;
/** How long to keep waiting for checks to register before declaring NO_CHECKS. */
const startupGraceMs = 150 * 1000;

function gh(ghArgs) {
  try {
    return {
      ok: true,
      out: execFileSync('gh', ghArgs, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }),
    };
  } catch (err) {
    return { ok: false, out: String(err.stdout ?? ''), errText: String(err.stderr ?? err.message ?? '') };
  }
}

function emit(line, code) {
  console.log(line);
  process.exit(code);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function runIdFromLink(link) {
  const m = /\/actions\/runs\/(\d+)/.exec(link ?? '');
  return m ? m[1] : '';
}

/** Classify CLI ref: PR number, workflow run id/url, branch name, or default PR. */
function classifyRef(ref) {
  const trimmed = ref.trim();
  if (!trimmed) return { mode: 'pr' };

  const urlRun = /\/actions\/runs\/(\d+)/.exec(trimmed);
  if (urlRun) return { mode: 'run', runId: urlRun[1] };

  if (/^\d{10,}$/.test(trimmed)) return { mode: 'run', runId: trimmed };

  if (/^\d+$/.test(trimmed)) return { mode: 'pr', prRef: trimmed };

  return { mode: 'branch', branch: trimmed };
}

/** Resolve PR number + url once so the sentinel is unambiguous. */
function resolvePr(prRef) {
  const a = prRef ? [prRef] : [];
  const res = gh(['pr', 'view', ...a, '--json', 'number,url']);
  if (!res.ok) return null;
  try {
    return JSON.parse(res.out);
  } catch {
    return null;
  }
}

function prChecks(prRef) {
  const a = prRef ? [prRef] : [];
  const res = gh(['pr', 'checks', ...a, '--json', 'bucket,name,workflow,link,state']);
  const body = res.out.trim();
  if (!body || body[0] !== '[') return { kind: 'none', raw: res.errText || body };
  try {
    return { kind: 'json', rows: JSON.parse(body) };
  } catch {
    return { kind: 'none', raw: body };
  }
}

function fetchRun(runId) {
  const res = gh([
    'run',
    'view',
    runId,
    '--json',
    'databaseId,status,conclusion,url,displayTitle,jobs',
  ]);
  if (!res.ok) return null;
  try {
    return JSON.parse(res.out);
  } catch {
    return null;
  }
}

function latestBranchRun(branch) {
  const res = gh(['run', 'list', '--branch', branch, '--limit', '1', '--json', 'databaseId,status,url']);
  if (!res.ok) return null;
  try {
    const rows = JSON.parse(res.out);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

function failedJobNames(run) {
  return (run.jobs ?? [])
    .filter((j) => j.conclusion === 'failure' || j.conclusion === 'cancelled')
    .map((j) => j.name)
    .filter(Boolean)
    .join(', ');
}

async function watchRun(runId, label) {
  const started = Date.now();

  for (;;) {
    const elapsed = Date.now() - started;
    if (elapsed > timeoutMs) emit(`CI_WATCH: TIMEOUT ${label} url=https://github.com/tiffz/labs/actions/runs/${runId}`, 2);

    const run = fetchRun(runId);
    if (!run) {
      emit(`CI_WATCH: ERROR could not fetch run ${runId}`, 3);
    }

    if (run.status === 'completed') {
      const url = run.url ?? `https://github.com/tiffz/labs/actions/runs/${runId}`;
      if (run.conclusion === 'success') {
        emit(`CI_WATCH: PASS ${label} url=${url}`, 0);
      }
      const failed = failedJobNames(run);
      emit(
        `CI_WATCH: FAIL ${label} failed="${failed || run.conclusion || 'unknown'}" url=${url}`,
        1,
      );
    }

    await sleep(intervalMs);
  }
}

async function watchBranch(branch) {
  const started = Date.now();
  let runId = '';

  for (;;) {
    const elapsed = Date.now() - started;
    if (elapsed > timeoutMs) {
      const url = runId
        ? `https://github.com/tiffz/labs/actions/runs/${runId}`
        : `branch=${branch}`;
      emit(`CI_WATCH: TIMEOUT branch=${branch} url=${url}`, 2);
    }

    const latest = latestBranchRun(branch);
    if (!latest?.databaseId) {
      if (elapsed > startupGraceMs) {
        emit(`CI_WATCH: ERROR no workflow runs found for branch ${branch}`, 3);
      }
      await sleep(intervalMs);
      continue;
    }

    runId = String(latest.databaseId);
    const run = fetchRun(runId);
    if (!run) {
      await sleep(intervalMs);
      continue;
    }

    if (run.status === 'completed') {
      const url = run.url ?? `https://github.com/tiffz/labs/actions/runs/${runId}`;
      const label = `branch=${branch} run=${runId}`;
      if (run.conclusion === 'success') {
        emit(`CI_WATCH: PASS ${label} url=${url}`, 0);
      }
      const failed = failedJobNames(run);
      emit(`CI_WATCH: FAIL ${label} failed="${failed || run.conclusion || 'unknown'}" url=${url}`, 1);
    }

    await sleep(intervalMs);
  }
}

async function watchPr(prRef) {
  const pr = resolvePr(prRef);
  if (!pr) emit('CI_WATCH: ERROR could not resolve PR (open a PR first, or pass a number)', 3);
  const prUrl = pr.url;
  const prNum = pr.number;
  const started = Date.now();

  for (;;) {
    const elapsed = Date.now() - started;
    if (elapsed > timeoutMs) emit(`CI_WATCH: TIMEOUT pr=${prNum} url=${prUrl}`, 2);

    const c = prChecks(prRef);
    if (c.kind === 'none') {
      if (elapsed > startupGraceMs) emit(`CI_WATCH: NO_CHECKS pr=${prNum} url=${prUrl}`, 0);
      await sleep(intervalMs);
      continue;
    }

    const rows = c.rows;
    const pending = rows.filter((r) => r.bucket === 'pending');
    if (rows.length === 0 || pending.length > 0) {
      await sleep(intervalMs);
      continue;
    }

    const failed = rows.filter((r) => r.bucket === 'fail');
    if (failed.length > 0) {
      const names = failed.map((r) => r.name || r.workflow).filter(Boolean).join(', ');
      const link = failed[0].link ?? prUrl;
      const runId = runIdFromLink(link);
      emit(
        `CI_WATCH: FAIL pr=${prNum} failed="${names}"${runId ? ` run=${runId}` : ''} url=${link}`,
        1,
      );
    }
    emit(`CI_WATCH: PASS pr=${prNum} url=${prUrl}`, 0);
  }
}

async function main() {
  const kind = classifyRef(inputRef);

  if (kind.mode === 'run') {
    await watchRun(kind.runId, `run=${kind.runId}`);
    return;
  }

  if (kind.mode === 'branch') {
    await watchBranch(kind.branch);
    return;
  }

  await watchPr(kind.prRef ?? inputRef);
}

main().catch((err) => emit(`CI_WATCH: ERROR ${String(err?.message ?? err)}`, 3));
