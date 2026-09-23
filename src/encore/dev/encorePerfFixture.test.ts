// @vitest-environment node
/**
 * The owner's localhost syncs to the same Drive storage as production, so a fixture that seeded the
 * wrong device would corrupt the only copy of her songwriting. These pin the refusals.
 *
 * Deliberately not gated on `isLabsE2eHarness()`: its comment says "Never true on production Pages
 * deploy", but its own `?labsE2e` branch makes it true there, so it is not a safety boundary.
 */
import { describe, expect, it } from 'vitest';
import { assertSafeToSeedEncorePerfFixture } from './encorePerfFixture';

const ok = { hostname: 'localhost', googleIdentity: null };

describe('perf fixture refuses anything that could reach real data', () => {
  it('allows a clean loopback device', () => {
    expect(() => assertSafeToSeedEncorePerfFixture(ok)).not.toThrow();
    expect(() => assertSafeToSeedEncorePerfFixture({ ...ok, hostname: '127.0.0.1' })).not.toThrow();
  });

  it('refuses the production host', () => {
    expect(() =>
      assertSafeToSeedEncorePerfFixture({ ...ok, hostname: 'labs.tiffzhang.com' }),
    ).toThrow(/not loopback/);
  });

  it('refuses any non-loopback host, including lookalikes', () => {
    for (const hostname of ['localhost.evil.com', 'my-localhost', '192.168.1.20', 'preview.app']) {
      expect(() => assertSafeToSeedEncorePerfFixture({ ...ok, hostname })).toThrow(/not loopback/);
    }
  });

  it('refuses a signed-in device even on loopback — it could push to Drive', () => {
    expect(() =>
      assertSafeToSeedEncorePerfFixture({ ...ok, googleIdentity: '{"email":"real@user"}' }),
    ).toThrow(/Google identity/);
  });

  it('treats empty and literal "null" identity as signed out', () => {
    for (const googleIdentity of ['', '   ', 'null', null]) {
      expect(() => assertSafeToSeedEncorePerfFixture({ ...ok, googleIdentity })).not.toThrow();
    }
  });
});
