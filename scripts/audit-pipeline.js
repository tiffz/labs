#!/usr/bin/env node
/**
 * Stateful audit orchestrator: jscpd (duplication), code-audit from code-auditor-mcp
 * (SOLID / DRY and related analyzers on ./src), and knip (unused exports / dead code).
 *
 * The npm package `code-auditor` is unrelated; SOLID/DRY scanning is provided by
 * `code-auditor-mcp` (CLI binary: `code-audit`).
 */
import { spawn, spawnSync } from 'node:child_process';
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  statSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const STATE_PATH = join(REPO_ROOT, '.audit-state.json');
const REPORT_PATH = join(REPO_ROOT, 'AUDIT_REPORT.md');
const RAW_REPORT_DIR = join(REPO_ROOT, '.audit-reports');
const LINE_CHANGE_THRESHOLD = 5000;

const args = new Set(process.argv.slice(2));
const force = args.has('--force');
const skipCodeAudit =
  args.has('--skip-code-audit') || process.env.AUDIT_SKIP_CODE_AUDIT === '1';

/** @typedef {{ version: number; lastSuccessfulAudit: { gitSha: string; lineCount: number; completedAt: string } }} AuditState */

function execGit(args, cwd = REPO_ROOT) {
  return new Promise((resolvePromise, reject) => {
    const chunks = [];
    const errChunks = [];
    const child = spawn('git', args, {
      cwd,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', (d) => chunks.push(d));
    child.stderr.on('data', (d) => errChunks.push(d));
    child.on('error', reject);
    child.on('close', (code) => {
      const out = Buffer.concat(chunks).toString('utf8').trimEnd();
      const err = Buffer.concat(errChunks).toString('utf8').trimEnd();
      resolvePromise({ code, out, err });
    });
  });
}

function parseShortstat(line) {
  if (!line) return { insertions: 0, deletions: 0, files: 0 };
  let insertions = 0;
  let deletions = 0;
  let files = 0;
  const fi = line.match(/(\d+)\s+file(?:s)?\s+changed/);
  if (fi) files = Number(fi[1], 10);
  const ins = line.match(/(\d+)\s+insertion/);
  if (ins) insertions = Number(ins[1], 10);
  const del = line.match(/(\d+)\s+deletion/);
  if (del) deletions = Number(del[1], 10);
  return { insertions, deletions, files };
}

function lineDeltaFromShortstat(line) {
  const { insertions, deletions } = parseShortstat(line);
  return insertions + deletions;
}

/** Count newlines in tracked text-like files under `src/` (approximate codebase size). */
function countTrackedSourceLinesSync() {
  const r = spawnSync('git', ['ls-files', '-z', '--', 'src'], {
    cwd: REPO_ROOT,
    encoding: 'buffer',
    maxBuffer: 50 * 1024 * 1024,
  });
  if (r.status !== 0) {
    throw new Error(
      `git ls-files failed: ${(r.stderr || r.stdout || '').toString()}`,
    );
  }
  const out = r.stdout.toString('binary');
  const files = out.split('\0').filter(Boolean);
  const ext = /\.(tsx?|jsx?|mtsx?|mjsx?|css|json|md)$/i;
  let lines = 0;
  for (const rel of files) {
    if (!ext.test(rel)) continue;
    const abs = join(REPO_ROOT, rel);
    try {
      if (!statSync(abs).isFile()) continue;
      const buf = readFileSync(abs);
      if (buf.includes(0)) continue;
      const s = buf.toString('utf8');
      lines += s.split(/\r\n|\r|\n/).length;
    } catch {
      /* skip */
    }
  }
  return lines;
}

function loadState() {
  try {
    const raw = readFileSync(STATE_PATH, 'utf8');
    return /** @type {AuditState} */ (JSON.parse(raw));
  } catch {
    return null;
  }
}

function saveState(state) {
  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function getHeadSha() {
  const r = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  if (r.status !== 0) throw new Error('Not a git repository or rev-parse failed');
  return r.stdout.trim();
}

function runCommand(command, commandArgs, options = {}) {
  const {
    cwd = REPO_ROOT,
    timeoutMs = Number(process.env.AUDIT_CMD_TIMEOUT_MS || 600_000),
  } = options;
  return new Promise((resolvePromise) => {
    const chunks = [];
    const errChunks = [];
    const child = spawn(command, commandArgs, {
      cwd,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, CI: process.env.CI || '1' },
    });
    let timedOut = false;
    const timer =
      timeoutMs > 0
        ? setTimeout(() => {
            timedOut = true;
            child.kill('SIGTERM');
            setTimeout(() => child.kill('SIGKILL'), 5000).unref();
          }, timeoutMs)
        : null;
    child.stdout.on('data', (d) => chunks.push(d));
    child.stderr.on('data', (d) => errChunks.push(d));
    child.on('error', (err) => {
      if (timer) clearTimeout(timer);
      resolvePromise({
        code: 1,
        stdout: '',
        stderr: String(err.message || err),
        timedOut: false,
      });
    });
    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      resolvePromise({
        code: timedOut ? 124 : code ?? 1,
        stdout: Buffer.concat(chunks).toString('utf8'),
        stderr: Buffer.concat(errChunks).toString('utf8'),
        timedOut,
      });
    });
  });
}

function truncate(s, max = 24_000) {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n\n… (truncated, ${s.length} chars total)`;
}

function parseJscpdSummary(jsonPath) {
  try {
    const j = JSON.parse(readFileSync(jsonPath, 'utf8'));
    const t = j?.statistics?.total;
    if (!t) return null;
    return {
      duplicatedLines: t.duplicatedLines,
      totalLines: t.lines,
      duplicationPercent: t.percentage,
      cloneCount: t.clones,
    };
  } catch {
    return null;
  }
}

function buildSkippedReport({
  headSha,
  baseSha,
  shortstatLine,
  delta,
  lineCount,
  state,
}) {
  const prev = state?.lastSuccessfulAudit;
  return `# Audit report (skipped)

Generated: ${new Date().toISOString()}

## Delta gate

Full audit tools were **not** run: insertions + deletions since the last recorded commit are at most ${LINE_CHANGE_THRESHOLD} (threshold is **strictly greater than** ${LINE_CHANGE_THRESHOLD} to trigger a run).

| Field | Value |
| --- | --- |
| Current \`HEAD\` | \`${headSha}\` |
| Last audited SHA | \`${baseSha}\` |
| \`git diff --shortstat\` | \`${shortstatLine || '(empty)'}\` |
| Insertions + deletions | **${delta}** |
| Tracked \`src/**\` line count (approx.) | ${lineCount} |
| Previous run line count | ${prev?.lineCount ?? '—'} |

Use \`npm run audit-refresh\` or \`node scripts/audit-pipeline.js --force\` to run jscpd, code-audit, and knip anyway. For a quicker run (jscpd + knip only): \`npm run audit-refresh:fast\`.

_Threshold rule: full audit runs when \`insertions + deletions\` > ${LINE_CHANGE_THRESHOLD}, or when there is no prior state, or with \`--force\`._
`;
}

function buildFullReport({
  headSha,
  shortstatLine,
  delta,
  lineCount,
  jscpd,
  codeAudit,
  knip,
  skipCodeAudit,
}) {
  const jscpdBlock = jscpd.summary
    ? `| Metric | Value |
| --- | --- |
| Total lines scanned | ${jscpd.summary.totalLines} |
| Duplicated lines | ${jscpd.summary.duplicatedLines} |
| Duplication (lines %) | **${jscpd.summary.duplicationPercent}%** |
| Clone groups | ${jscpd.summary.cloneCount} |

Raw JSON: \`${jscpd.jsonPath}\`
`
    : `_Could not read jscpd JSON summary._\n\nStdout:\n\n\`\`\`\n${truncate(jscpd.stdout)}\n\`\`\``;

  const codeAuditStatus = codeAudit.skipped
    ? 'skipped'
    : `exit **${codeAudit.code}**${codeAudit.timedOut ? ' (timed out)' : ''}`;
  const codeBlock = codeAudit.skipped
    ? '_Skipped (`--skip-code-audit` or `AUDIT_SKIP_CODE_AUDIT=1`). Re-run without that flag for SOLID/DRY output._'
    : `\`\`\`text\n${truncate(codeAudit.stdout + (codeAudit.stderr ? `\n--- stderr ---\n${codeAudit.stderr}` : ''))}\n\`\`\`\n\nExit code: **${codeAudit.code}**${codeAudit.timedOut ? ' (timed out)' : ''}`;

  const knipBlock = `\`\`\`text\n${truncate(knip.stdout + (knip.stderr ? `\n--- stderr ---\n${knip.stderr}` : ''))}\n\`\`\`\n\nExit code: **${knip.code}**`;

  return `# Audit report

Generated: ${new Date().toISOString()}
Repository \`HEAD\`: \`${headSha}\`

## Summary

| Tool | Role | Status |
| --- | --- | --- |
| jscpd | Copy/paste / duplication | exit **${jscpd.code}** |
| code-audit (\`code-auditor-mcp\`) | SOLID, DRY, and related checks on \`./src\` | ${codeAuditStatus} |
| knip | Unused exports, dead code | exit **${knip.code}** |

Since last recorded audit commit: \`${shortstatLine || '(n/a)'}\` → **${delta}** insertion+deletion lines. Current approximate \`src/**\` line count: **${lineCount}**.

${skipCodeAudit ? '_`.audit-state.json` was not updated (code-audit skipped)._\n' : ''}
## jscpd (duplication)

${jscpdBlock}

## code-audit (SOLID / DRY / architecture)

${codeBlock}

## knip

${knipBlock}
`;
}

async function main() {
  mkdirSync(RAW_REPORT_DIR, { recursive: true });
  const headSha = getHeadSha();
  const lineCount = countTrackedSourceLinesSync();
  const state = loadState();
  const baseSha = state?.lastSuccessfulAudit?.gitSha ?? null;

  let shortstatLine = '';
  let delta = 0;
  let diffFailed = false;
  if (baseSha) {
    const { out, code, err } = await execGit([
      'diff',
      '--shortstat',
      `${baseSha}..HEAD`,
    ]);
    if (code !== 0) {
      diffFailed = true;
      console.warn(
        `[audit-pipeline] git diff failed (${code}): ${err || out}. Running full audit.`,
      );
    } else {
      shortstatLine = out.trim();
      delta = lineDeltaFromShortstat(shortstatLine);
    }
  } else {
    delta = Number.POSITIVE_INFINITY;
  }

  const shouldRunFull =
    force || !baseSha || diffFailed || delta > LINE_CHANGE_THRESHOLD;

  if (!shouldRunFull) {
    const md = buildSkippedReport({
      headSha,
      baseSha: baseSha ?? '(none)',
      shortstatLine,
      delta,
      lineCount,
      state,
    });
    writeFileSync(REPORT_PATH, md, 'utf8');
    console.log(
      `[audit-pipeline] Skipped full audit: delta ${delta} ≤ ${LINE_CHANGE_THRESHOLD}. Report: ${REPORT_PATH}`,
    );
    process.exit(0);
  }

  console.log(
    `[audit-pipeline] Running full audit (force=${force}, delta=${delta === Number.POSITIVE_INFINITY ? 'n/a (no state)' : delta}, skipCodeAudit=${skipCodeAudit})…`,
  );

  const jscpdOut = join(RAW_REPORT_DIR, 'jscpd');
  mkdirSync(jscpdOut, { recursive: true });

  const jscpdBin = join(REPO_ROOT, 'node_modules', '.bin', 'jscpd');
  const jscpdArgs = [
    '--config',
    join(REPO_ROOT, '.jscpd.json'),
    '--reporters',
    'json,console',
    '--output',
    jscpdOut,
    '-s',
  ];

  const jscpd = await runCommand(jscpdBin, jscpdArgs, {
    timeoutMs: Number(process.env.AUDIT_JSCPD_TIMEOUT_MS || 300_000),
  });
  const jscpdJsonPath = join(jscpdOut, 'jscpd-report.json');
  const jscpdSummary = existsSync(jscpdJsonPath)
    ? parseJscpdSummary(jscpdJsonPath)
    : null;

  let codeAudit;
  if (skipCodeAudit) {
    codeAudit = {
      code: 0,
      stdout: '',
      stderr: '',
      timedOut: false,
      skipped: true,
    };
  } else {
    const codeAuditOut = join(RAW_REPORT_DIR, 'code-audit');
    mkdirSync(codeAuditOut, { recursive: true });
    const codeAuditBin = join(REPO_ROOT, 'node_modules', '.bin', 'code-audit');
    codeAudit = await runCommand(
      codeAuditBin,
      ['audit', '-p', join(REPO_ROOT, 'src'), '-o', codeAuditOut],
      {
        timeoutMs: Number(process.env.AUDIT_CODE_AUDIT_TIMEOUT_MS || 600_000),
      },
    );
    codeAudit = { ...codeAudit, skipped: false };
  }

  const knipBin = join(REPO_ROOT, 'node_modules', '.bin', 'knip');
  const knip = await runCommand(
    knipBin,
    ['--no-progress'],
    { timeoutMs: Number(process.env.AUDIT_KNIP_TIMEOUT_MS || 300_000) },
  );

  const shortstatForReport = baseSha
    ? (await execGit(['diff', '--shortstat', `${baseSha}..HEAD`])).out.trim()
    : '(no previous audit SHA)';
  const deltaForReport = baseSha
    ? lineDeltaFromShortstat(shortstatForReport)
    : delta;

  const md = buildFullReport({
    headSha,
    shortstatLine: shortstatForReport,
    delta: deltaForReport,
    lineCount,
    jscpd: {
      code: jscpd.code,
      stdout: jscpd.stdout,
      summary: jscpdSummary,
      jsonPath: jscpdJsonPath,
    },
    codeAudit,
    knip,
    skipCodeAudit,
  });
  writeFileSync(REPORT_PATH, md, 'utf8');

  const codeAuditOk =
    codeAudit.skipped ||
    (codeAudit.code === 0 && !codeAudit.timedOut);
  const toolsOk = jscpd.code === 0 && codeAuditOk && knip.code === 0;

  if (toolsOk) {
    if (skipCodeAudit) {
      console.log(
        `[audit-pipeline] Report written (${REPORT_PATH}). State file not updated because code-audit was skipped; run without --skip-code-audit for a full baseline.`,
      );
    } else {
      saveState({
        version: 1,
        lastSuccessfulAudit: {
          gitSha: headSha,
          lineCount,
          completedAt: new Date().toISOString(),
        },
      });
      console.log(`[audit-pipeline] State updated (${STATE_PATH}). Report: ${REPORT_PATH}`);
    }
    process.exit(0);
  }

  console.warn(
    `[audit-pipeline] One or more tools failed or timed out; state not updated. See ${REPORT_PATH}`,
  );
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
