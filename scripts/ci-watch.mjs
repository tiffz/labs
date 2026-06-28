#!/usr/bin/env node
/**
 * Background CI watcher — poll a PR's checks until they finish, then print ONE
 * stable sentinel line. Designed to be run as a backgrounded Shell job so an
 * agent (or human) can keep working and only be interrupted on failure.
 *
 * Usage:
 *   node scripts/ci-watch.mjs [<pr-number>|<url>|<branch>] [--interval=20] [--timeout=2400]
 *   npm run ci:watch -- <pr-number>
 *
 * Sentinels (always exactly one, last line):
 *   CI_WATCH: PASS pr=<n> url=<pr-url>
 *   CI_WATCH: FAIL pr=<n> failed="a, b" run=<run-id> url=<failing-check-url>
 *   CI_WATCH: TIMEOUT pr=<n> url=<pr-url>
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

const prRef = positional[0] ?? '';
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

/** Resolve PR number + url once so the sentinel is unambiguous. */
function resolvePr() {
  const a = prRef ? [prRef] : [];
  const res = gh(['pr', 'view', ...a, '--json', 'number,url']);
  if (!res.ok) return null;
  try {
    return JSON.parse(res.out);
  } catch {
    return null;
  }
}

function checks() {
  const a = prRef ? [prRef] : [];
  // gh exits non-zero while pending (8) or on fail; --json still prints the body.
  const res = gh(['pr', 'checks', ...a, '--json', 'bucket,name,workflow,link,state']);
  const body = res.out.trim();
  if (!body || body[0] !== '[') return { kind: 'none', raw: res.errText || body };
  try {
    return { kind: 'json', rows: JSON.parse(body) };
  } catch {
    return { kind: 'none', raw: body };
  }
}

function runIdFromLink(link) {
  const m = /\/actions\/runs\/(\d+)/.exec(link ?? '');
  return m ? m[1] : '';
}

async function main() {
  const pr = resolvePr();
  if (!pr) emit('CI_WATCH: ERROR could not resolve PR (open a PR first, or pass a number)', 3);
  const prUrl = pr.url;
  const prNum = pr.number;
  const started = Date.now();

  for (;;) {
    const elapsed = Date.now() - started;
    if (elapsed > timeoutMs) emit(`CI_WATCH: TIMEOUT pr=${prNum} url=${prUrl}`, 2);

    const c = checks();
    if (c.kind === 'none') {
      // Checks not registered yet (just pushed) — wait through the startup grace.
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

main().catch((err) => emit(`CI_WATCH: ERROR ${String(err?.message ?? err)}`, 3));
