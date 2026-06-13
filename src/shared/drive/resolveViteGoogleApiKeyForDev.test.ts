import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readLabsViteEnvFiles, resolveViteGoogleApiKeyForDev } from './resolveViteGoogleApiKeyForDev';

describe('resolveViteGoogleApiKeyForDev', () => {
  let envDir: string;

  beforeEach(() => {
    envDir = mkdtempSync(join(tmpdir(), 'labs-env-'));
    delete process.env.VITE_GOOGLE_API_KEY;
  });

  afterEach(() => {
    delete process.env.VITE_GOOGLE_API_KEY;
  });

  it('prefers .env.local over process.env', () => {
    writeFileSync(join(envDir, '.env.local'), 'VITE_GOOGLE_API_KEY=from-local\n');
    process.env.VITE_GOOGLE_API_KEY = 'from-process';
    expect(resolveViteGoogleApiKeyForDev({ envDir, allowGitHub: false })).toBe('from-local');
  });

  it('reads development env file merge order', () => {
    writeFileSync(join(envDir, '.env'), 'VITE_GOOGLE_API_KEY=base\n');
    writeFileSync(join(envDir, '.env.local'), 'VITE_GOOGLE_API_KEY=local-wins\n');
    expect(readLabsViteEnvFiles(envDir, 'development').VITE_GOOGLE_API_KEY).toBe('local-wins');
  });

  it('skips GitHub when allowGitHub is false', () => {
    expect(resolveViteGoogleApiKeyForDev({ envDir, allowGitHub: false })).toBeUndefined();
  });
});
