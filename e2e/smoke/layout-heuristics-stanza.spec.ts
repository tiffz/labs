import { test, expect } from '@playwright/test';
import { runHorizontalScrollHeuristicInBrowser } from '../helpers/horizontalScrollHeuristic';
import { runLayoutHeuristicsInBrowser } from '../helpers/layoutHeuristics';
import { runContrastAuditInBrowser } from '../helpers/contrastAudit';
import { expectStanzaLibraryChrome } from '../helpers/stanzaLibrary';

test.describe('Stanza layout heuristics', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/stanza/');
    await expectStanzaLibraryChrome(page);
  });

  test('library main has padding and readable copy', async ({ page }) => {

    const result = await page.evaluate(runLayoutHeuristicsInBrowser, {
      containerSelector: 'main#main',
      contentSelector: 'main#main h1, main#main h2',
      mutedTextSelector: 'main#main p',
    });
    expect(result.ok, result.ok ? '' : JSON.stringify(result)).toBe(true);
  });

  test('library main has no horizontal overflow', async ({ page }) => {
    const result = await page.evaluate(runHorizontalScrollHeuristicInBrowser, {
      rootSelector: 'main#main',
    });
    expect(result.ok, result.ok ? '' : JSON.stringify(result)).toBe(true);
  });

  test('library main text meets contrast guard', async ({ page }) => {
    const result = await page.evaluate(runContrastAuditInBrowser, {
      rootSelector: 'main#main',
    });
    expect(result.ok, result.ok ? '' : JSON.stringify(result)).toBe(true);
  });

  test('narrow phone library has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const result = await page.evaluate(runHorizontalScrollHeuristicInBrowser, {
      rootSelector: 'main#main',
    });
    expect(result.ok, result.ok ? '' : JSON.stringify(result)).toBe(true);
  });
});
