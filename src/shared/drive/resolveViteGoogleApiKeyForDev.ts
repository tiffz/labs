/**
 * Resolve VITE_GOOGLE_API_KEY for local dev: `.env.local` / `.env.development` first,
 * then GitHub Actions **variables** via `gh` (secrets are write-only and cannot be fetched).
 */
import { execFileSync, execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const GH_ENV_CANDIDATES: (string | undefined)[] = [undefined, 'github-pages'];

/** Vite env file merge order (see Vite `loadEnv`). */
const envFilesForMode = (mode: string): string[] =>
  ['.env', `.env.${mode}`, '.env.local', `.env.${mode}.local`];

export function readLabsViteEnvFiles(envDir: string, mode = 'development'): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const file of envFilesForMode(mode)) {
    Object.assign(merged, parseDotEnvFile(join(envDir, file)));
  }
  return merged;
}

function parseDotEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {};
  const out: Record<string, string> = {};
  for (const rawLine of readFileSync(filePath, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

export function resolveViteGoogleApiKeyForDev(options: {
  envDir: string;
  mode?: string;
  allowGitHub?: boolean;
}): string | undefined {
  const { envDir, mode = 'development', allowGitHub = true } = options;

  const fromFiles = readLabsViteEnvFiles(envDir, mode).VITE_GOOGLE_API_KEY?.trim();
  if (fromFiles) return fromFiles;

  const fromProcess = process.env.VITE_GOOGLE_API_KEY?.trim();
  if (fromProcess) return fromProcess;

  if (!allowGitHub || mode !== 'development') {
    return undefined;
  }

  return fetchGoogleApiKeyFromGitHubActionsVariable();
}

/** Read `VITE_GOOGLE_API_KEY` from GitHub Actions variables (repo, then `github-pages` env). */
export function fetchGoogleApiKeyFromGitHubActionsVariable(): string | undefined {
  if (!commandExists('gh')) return undefined;

  for (const ghEnv of GH_ENV_CANDIDATES) {
    const value = tryGhVariableGet('VITE_GOOGLE_API_KEY', ghEnv);
    if (value) return value;
  }

  return undefined;
}

/** Set `process.env.VITE_GOOGLE_API_KEY` when missing locally and resolvable (files or GitHub). */
export function applyDevGoogleApiKeyFromGitHub(envDir: string): string | undefined {
  const fromFiles = readLabsViteEnvFiles(envDir, 'development').VITE_GOOGLE_API_KEY?.trim();
  if (fromFiles) {
    process.env.VITE_GOOGLE_API_KEY = fromFiles;
    return fromFiles;
  }

  const existing = process.env.VITE_GOOGLE_API_KEY?.trim();
  if (existing) return existing;

  const fromGitHub = fetchGoogleApiKeyFromGitHubActionsVariable();
  if (!fromGitHub) return undefined;

  process.env.VITE_GOOGLE_API_KEY = fromGitHub;
  if (!process.env.LABS_GOOGLE_API_KEY_QUIET) {
    console.warn(
      '[labs] Loaded VITE_GOOGLE_API_KEY from a GitHub Actions variable (gh CLI). Local `.env*` overrides still win.',
    );
  }
  return fromGitHub;
}

function commandExists(name: string): boolean {
  try {
    execSync(`command -v ${name}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function tryGhVariableGet(name: string, ghEnv: string | undefined): string | undefined {
  const args = ['variable', 'get', name];
  if (ghEnv) args.push('--env', ghEnv);
  try {
    const out = execFileSync('gh', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const value = out.trim();
    return value || undefined;
  } catch {
    return undefined;
  }
}
