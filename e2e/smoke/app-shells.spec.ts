import { test, expect } from '@playwright/test';

const ROUTE_SPECS: Array<{
  route: string;
  title: RegExp;
  visibleSelector: string;
}> = [
  { route: '/', title: /Tiff Zhang Labs/i, visibleSelector: '.container' },
  { route: '/beat/', title: /Find the Beat/i, visibleSelector: '#root' },
  { route: '/cats/', title: /Cat Clicker/i, visibleSelector: '#root' },
  { route: '/chords/', title: /Chord Progression Generator/i, visibleSelector: '#root' },
  { route: '/corp/', title: /Corporate Ladder/i, visibleSelector: '#root' },
  { route: '/count/', title: /Count Me In/i, visibleSelector: '#root' },
  { route: '/drums/', title: /Darbuka Rhythm Trainer/i, visibleSelector: '#root' },
  { route: '/forms/', title: /Form Intersections/i, visibleSelector: '#root' },
  { route: '/piano/', title: /Piano Practice/i, visibleSelector: '#root' },
  { route: '/pitch/', title: /Vocal Pitch Detector/i, visibleSelector: '#root' },
  { route: '/scales/', title: /Learn Your Scales/i, visibleSelector: '#root' },
  { route: '/story/', title: /Save the Cat/i, visibleSelector: '#root' },
  { route: '/ui/', title: /UI Catalog/i, visibleSelector: '#root' },
  { route: '/words/', title: /Words in Rhythm/i, visibleSelector: '#root' },
  { route: '/zines/', title: /Zine Studio/i, visibleSelector: '#root' },
  { route: '/drums/universal_tom/', title: /Universal Tom Importer/i, visibleSelector: '#root' },
];

test.describe('All app shells smoke', () => {
  for (const { route, title, visibleSelector } of ROUTE_SPECS) {
    test(`boots ${route}`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveTitle(title);
      await expect(page.locator(visibleSelector)).toBeVisible();
    });
  }
});
