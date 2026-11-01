/**
 * The `test` every Labs spec imports, in place of `@playwright/test`'s.
 *
 * It adds one thing: no request leaves the machine. A test that reaches a real service races it,
 * and the race shows up as a flake that has nothing to do with the change under test. Encore's
 * sign-in spec failed on `main` twice in October 2026 because the real Google Identity script
 * sometimes loaded before the stub and sometimes after (docs/CI_RELIABILITY.md § Failure audit).
 *
 * How it works: a context-level route aborts every request whose host is not this machine. Page
 * routes run first, so a spec or helper that stubs a host (`page.route(...)` + `fulfill`) still
 * wins. A catch-all stub must end in `route.fallback()`, never `route.continue()`: `continue`
 * sends the request to the network and skips this block. `src/shared/e2eNetworkIsolation.test.ts`
 * enforces both the import and the `fallback`.
 *
 * Blocked hosts are recorded as a `blocked-external-hosts` annotation on the test, so a spec that
 * starts depending on one shows up in the report rather than as a mystery timeout.
 */
import { test as base, type Request, type Route } from '@playwright/test';

export { expect } from '@playwright/test';
export type { Locator, Page, TestInfo } from '@playwright/test';

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);

/**
 * External hosts allowed through, each with the reason. Keep this short: every entry is a host
 * whose outage or latency can fail a run.
 */
const ALLOWED_EXTERNAL_HOSTS: Record<string, string> = {
  // Corp and Scrapboard load Noto Color Emoji from Google Fonts in their index.html. Fonts change
  // pixels, and the visual baselines were captured with them.
  'fonts.googleapis.com': 'emoji font stylesheet in corp and scrapboard index.html',
  'fonts.gstatic.com': 'font files the stylesheet above points at',
};

/** Host of `url`, or null for URLs with no network host (data:, blob:, about:). */
function requestHost(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:' && parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
    return null;
  }
  return parsed.hostname.toLowerCase();
}

/** True when a request to `url` would leave this machine and is not allowlisted. */
function isBlockedExternalUrl(url: string): boolean {
  const host = requestHost(url);
  if (host === null) return false;
  if (LOCAL_HOSTS.has(host) || host.endsWith('.localhost')) return false;
  return !(host in ALLOWED_EXTERNAL_HOSTS);
}

export const test = base.extend<{ blockExternalHosts: void }>({
  blockExternalHosts: [
    async ({ context }, use, testInfo) => {
      const blocked = new Set<string>();
      const handler = async (route: Route, request: Request) => {
        blocked.add(requestHost(request.url()) ?? request.url());
        await route.abort('blockedbyclient');
      };
      await context.route((url) => isBlockedExternalUrl(url.href), handler);
      await use();
      if (blocked.size > 0) {
        testInfo.annotations.push({ type: 'blocked-external-hosts', description: [...blocked].sort().join(', ') });
      }
    },
    { auto: true },
  ],
});
