#!/usr/bin/env node
/**
 * The dev-server port a checkout owns.
 *
 * Playwright runs with `reuseExistingServer` outside CI, so it adopts whatever
 * is already listening instead of starting its own Vite. With one hardcoded
 * port across every checkout that is silent cross-checkout contamination: a dev
 * server left running in ANOTHER worktree serves its code, specs pass or fail
 * against a branch you are not on, and nothing in the output says so. This repo
 * has been bitten by it (root cause class `stale-server-verification`), and
 * with parallel agent sessions under `.claude/worktrees/*` it is the normal
 * case rather than an edge one.
 *
 * So every **linked** worktree gets its own deterministic port and the **main**
 * checkout keeps 5173 — bookmarks, docs and muscle memory all assume it, and it
 * is the one checkout that cannot collide with itself.
 *
 * Main vs linked comes from `.git`: a directory in the main worktree, a
 * `gitdir:` pointer *file* in every linked one.
 *
 * Lives in one module because two callers need the answer — `playwright.config.ts`
 * and `.husky/pre-push` — and a second copy of the arithmetic would drift
 * (`duplicated-invariant`). Run it directly to print the port:
 *
 *     node scripts/labs-dev-port.mjs [dir]
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export const DEFAULT_DEV_PORT = 5173;

/** Ports 5174-5973 — 800 slots, clear of 5173 and of common service ports. */
const DERIVED_PORT_SPAN = 800;

/** True when `dir` is a linked git worktree rather than the main checkout. */
export function isLinkedWorktree(dir) {
  try {
    return fs.statSync(path.join(dir, '.git')).isFile();
  } catch {
    // No `.git` at all (tarball, container copy, degraded checkout): there is
    // no second worktree to collide with, so the default port is correct.
    return false;
  }
}

/**
 * @param {string} dir checkout root
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {number}
 */
export function resolveDevServerPort(dir, env = process.env) {
  const override = Number(env.LABS_E2E_PORT);
  if (Number.isInteger(override) && override > 0 && override < 65536) return override;
  if (!isLinkedWorktree(dir)) return DEFAULT_DEV_PORT;

  // Deterministic per path, so a worktree reuses its own server across runs
  // instead of stranding a fresh Vite on every invocation.
  const digest = createHash('sha256').update(dir).digest();
  return DEFAULT_DEV_PORT + 1 + (digest.readUInt16BE(0) % DERIVED_PORT_SPAN);
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  process.stdout.write(`${resolveDevServerPort(process.argv[2] ?? process.cwd())}\n`);
}
