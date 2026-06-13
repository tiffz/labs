import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isLabsGoogleSessionBffEnabled,
  isRecoverableBffSignInFailure,
  readLabsSessionBffUrl,
  signInWithGoogleViaBff,
  tryRefreshGoogleAccessTokenViaBff,
} from './labsGoogleSessionPort';
import {
  clearPersistedGoogleSession,
  readPersistedGoogleSession,
  writePersistedGoogleSession,
} from '../google/encoreGoogleTokenStorage';

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  vi.stubGlobal('fetch', vi.fn());
  vi.stubEnv('VITE_LABS_SESSION_BFF_URL', '');
});

afterEach(() => {
  clearPersistedGoogleSession();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('labsGoogleSessionPort', () => {
  it('is disabled when VITE_LABS_SESSION_BFF_URL is unset', () => {
    expect(readLabsSessionBffUrl()).toBeNull();
    expect(isLabsGoogleSessionBffEnabled()).toBe(false);
  });

  it('refreshViaBff persists a fresh access token', async () => {
    vi.stubEnv('VITE_LABS_SESSION_BFF_URL', 'http://127.0.0.1:8787');
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ access_token: 'bff-tok', expires_in: 3600, email: 'me@example.com' }),
        { status: 200 },
      ),
    );

    const token = await tryRefreshGoogleAccessTokenViaBff();
    expect(token).toBe('bff-tok');
    expect(readPersistedGoogleSession()?.accessToken).toBe('bff-tok');
    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8787/v1/session/google/access-token',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('returns null when BFF refresh fails', async () => {
    vi.stubEnv('VITE_LABS_SESSION_BFF_URL', 'http://127.0.0.1:8787');
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ error: 'Not signed in.' }), { status: 401 }));

    const token = await tryRefreshGoogleAccessTokenViaBff();
    expect(token).toBeNull();
    expect(readPersistedGoogleSession()).toBeNull();
  });

  it('returns null when BFF is disabled', async () => {
    writePersistedGoogleSession('old', -120);
    expect(await tryRefreshGoogleAccessTokenViaBff()).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('classifies recoverable vs user-aborted BFF sign-in failures', () => {
    expect(isRecoverableBffSignInFailure(new TypeError('Failed to fetch'))).toBe(true);
    expect(isRecoverableBffSignInFailure(new Error('Session service unreachable.'))).toBe(true);
    expect(isRecoverableBffSignInFailure(new Error('Could not start Google sign-in.'))).toBe(true);
    expect(
      isRecoverableBffSignInFailure(
        new Error('Google sign-in closed before finishing. Try again and complete the Google window.'),
      ),
    ).toBe(false);
    expect(
      isRecoverableBffSignInFailure(
        new Error('Google sign-in could not open a popup window. Allow popups for this site, then try again.'),
      ),
    ).toBe(true);
  });

  it('opens the OAuth popup before navigating to Google', async () => {
    vi.stubEnv('VITE_LABS_SESSION_BFF_URL', 'http://127.0.0.1:8787');
    const events: string[] = [];
    const popup = {
      closed: false,
      close: vi.fn(),
      location: {
        get href() {
          return href;
        },
        set href(next: string) {
          events.push(`navigate:${next}`);
          href = next;
        },
      },
      document: { title: '', body: { textContent: '' } },
    };
    let href = 'about:blank';
    const openSpy = vi.spyOn(window, 'open').mockImplementation((...args) => {
      events.push(`open:${String(args[0])}`);
      return popup as unknown as Window;
    });

    let resolveFetch!: (value: Response) => void;
    vi.mocked(fetch).mockImplementation((url) => {
      const target = String(url);
      if (target.includes('/v1/session/google/access-token')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              access_token: 'tok',
              expires_in: 3600,
              email: 'me@example.com',
            }),
            { status: 200 },
          ),
        );
      }
      events.push('fetch:start');
      return new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });
    });

    const signInPromise = signInWithGoogleViaBff();
    await Promise.resolve();
    expect(events).toEqual(['open:about:blank', 'fetch:start']);

    resolveFetch(
      new Response(JSON.stringify({ authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?state=test' }), {
        status: 200,
      }),
    );
    await vi.waitUntil(() => events.some((e) => e.startsWith('navigate:')));
    expect(events).toEqual([
      'open:about:blank',
      'fetch:start',
      'navigate:https://accounts.google.com/o/oauth2/v2/auth?state=test',
    ]);

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: window.location.origin,
        data: {
          type: 'labs_google_oauth_done',
          complete: true,
        },
      }),
    );

    await expect(signInPromise).resolves.toMatchObject({ access_token: 'tok', email: 'me@example.com' });
    expect(openSpy).toHaveBeenCalledWith('about:blank', 'labs_google_oauth', 'width=520,height=640');
    openSpy.mockRestore();
  });

  it('signInWithGoogleViaBff throws when start fetch fails (network)', async () => {
    vi.stubEnv('VITE_LABS_SESSION_BFF_URL', 'http://127.0.0.1:8787');
    const popup = { closed: false, close: vi.fn(), location: { href: 'about:blank' }, document: { title: '', body: { textContent: '' } } };
    vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(signInWithGoogleViaBff()).rejects.toThrow('Session service unreachable.');
    expect(popup.close).toHaveBeenCalled();
  });
});
