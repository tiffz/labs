import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isPublicDriveGuestFetchConfigured,
  resolvePublicDriveFetchRoute,
} from './buildPublicDriveAltMediaUrl';

/**
 * Guardrail: static hosting cannot call Google Drive `alt=media` directly from the browser
 * (CORS/referrer/redirect). Production must route guest reads through the session BFF when
 * `VITE_LABS_SESSION_BFF_URL` is set. See `docs/AGENT_INVARIANTS.md` and Encore README.
 */
describe('public Drive fetch policy (static hosting)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses BFF route in production when session BFF URL is configured', () => {
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_LABS_SESSION_BFF_URL', 'https://labs-session-bff.example.workers.dev');
    vi.stubEnv('VITE_GOOGLE_API_KEY', '');
    expect(resolvePublicDriveFetchRoute()).toBe('bff');
    expect(isPublicDriveGuestFetchConfigured()).toBe(true);
  });

  it('does not treat missing API key as unconfigured when BFF route is active', () => {
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_LABS_SESSION_BFF_URL', 'https://labs-session-bff.example.workers.dev');
    vi.stubEnv('VITE_GOOGLE_API_KEY', '');
    expect(isPublicDriveGuestFetchConfigured()).toBe(true);
  });
});
