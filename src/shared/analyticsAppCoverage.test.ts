import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * ANALYTICS MUST KNOW ABOUT EVERY APP.
 *
 * `public/scripts/analytics.js` used to resolve a page to an app by looking
 * its path up in a hand-written map, and a miss fell through to
 * `{ name: 'landing' }`. Nine of twenty-four apps were missing — maqam,
 * palette, stanza, muscle, scrapboard, sight, midi, zinebox, lyrefly — so
 * every visit to any of them was recorded as a visit to the HOME PAGE.
 *
 * That is worse than missing data. The landing page looked busier than it was,
 * nine apps looked dead, and nothing anywhere said so. It was found only
 * because someone asked why the numbers felt wrong.
 *
 * The name is now derived from the URL, so an unmapped app can no longer be
 * mistaken for the landing page. This test covers what is left: the human
 * GROUP, which still has to be written down, and which would otherwise drift
 * the same way.
 *
 * Both sides are derived — the apps from the manifest that builds the public
 * directory, the map out of the shipped script — so a new app enrols itself
 * here by existing rather than by someone remembering.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const manifest = JSON.parse(
  readFileSync(path.join(repoRoot, 'src/labsHome/labsCatalog.manifest.json'), 'utf8'),
) as { apps: { path: string; title: string; stage: string }[] };

const analyticsSource = readFileSync(
  path.join(repoRoot, 'public/scripts/analytics.js'),
  'utf8',
);

/** The paths `APP_MAP` supplies a group for. */
const mappedPaths = new Set(
  [...analyticsSource.matchAll(/'(\/[a-z0-9-]+\/)':\s*\{/g)].map((match) => match[1]),
);

describe('analytics knows about every app', () => {
  it('finds both sides of the comparison', () => {
    // Either list coming back empty would make the assertions below vacuous —
    // a regex that stops matching must fail loudly, not quietly pass.
    expect(manifest.apps.length).toBeGreaterThan(10);
    expect(mappedPaths.size).toBeGreaterThan(10);
  });

  it('gives every listed app a content group', () => {
    const missing = manifest.apps
      .filter((app) => !mappedPaths.has(app.path))
      .map((app) => `${app.path} (${app.title})`);

    expect(
      missing,
      'These apps are in the public directory but have no entry in APP_MAP in ' +
        'public/scripts/analytics.js, so their traffic will be grouped as "Unknown":\n  ' +
        missing.join('\n  '),
    ).toEqual([]);
  });

  it('derives the app name from the path rather than a lookup', () => {
    /*
     * The behavioural half. A source scan, and it says so: what matters is
     * that a path with no map entry still reports its own name, and the only
     * way to check that here without a DOM is to require the derivation.
     *
     * If this anchor is renamed the test fails rather than silently passing,
     * which is the point — the lookup version of this function is the bug.
     */
    expect(
      analyticsSource,
      'detectApp should derive the slug from window.location.pathname',
    ).toMatch(/window\.location\.pathname\.match\(/);
    expect(
      analyticsSource,
      'a path that is not in APP_MAP must keep its own name, not become "landing"',
    ).toMatch(/group:\s*known\s*\?\s*known\.group\s*:\s*'Unknown'/);
  });
});
