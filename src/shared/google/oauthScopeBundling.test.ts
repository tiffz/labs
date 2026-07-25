import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  LABS_GOOGLE_DRIVE_SESSION_SCOPES,
  LABS_GOOGLE_DRIVE_IMPORT_SCOPES,
} from './labsGoogleDriveAccess';
import { LABS_GOOGLE_OAUTH_SCOPES } from '../../../workers/labs-session-bff/src/constants';

/**
 * Guardrail for a production auth outage: Google rejects `youtube.readonly` bundled with
 * `drive.file` in a single authorization ("scopes that cannot be requested together",
 * Error 400 invalid_request). All four login/Drive scope sets once carried both, which blocked
 * every sign-in. YouTube read access must be requested on its OWN consent (incremental auth,
 * `ensureYouTubeReadonlyAccessToken`). This asserts no login/Drive consent ever re-adds YouTube.
 */

const YOUTUBE_SCOPE_ENTRY = "'https://www.googleapis.com/auth/youtube.readonly'";

function readFile(relative: string): string {
  return readFileSync(new URL(relative, import.meta.url), 'utf8');
}

describe('OAuth scope bundling — youtube.readonly is never combined with drive.file', () => {
  it('the exported Drive/session/import/BFF scope strings request drive.file but not youtube', () => {
    for (const scopes of [
      LABS_GOOGLE_DRIVE_SESSION_SCOPES,
      LABS_GOOGLE_DRIVE_IMPORT_SCOPES,
      LABS_GOOGLE_OAUTH_SCOPES,
    ]) {
      expect(scopes).toContain('auth/drive.file');
      expect(scopes, 'youtube.readonly must not share a consent with drive.file').not.toContain('youtube');
    }
  });

  it('Encore login GOOGLE_SCOPES does not list youtube.readonly as a requested scope', () => {
    // Not exported (React module) — assert the scope-array entry is absent. A future re-add of the
    // quoted scope string trips this, even though explanatory comments mention the scope name.
    const encoreAuth = readFile('../../encore/context/EncoreAuthContext.tsx');
    expect(encoreAuth).not.toContain(YOUTUBE_SCOPE_ENTRY);
  });

  it('sanity: the guardrail can detect the scope entry it forbids', () => {
    // Guards the detector itself — the helper file legitimately holds the entry.
    const youtubeAccess = readFile('../../encore/youtube/youtubeAccess.ts');
    expect(youtubeAccess).toContain('auth/youtube.readonly');
  });
});
