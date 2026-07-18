import { expect, test } from '@playwright/test';

/** Inline for page.evaluate — must not close over module imports. */
function auditBubblePathsInBrowser(): {
  bubbleCount: number;
  invalid: Array<{ index: number; closed: boolean; hasLegacyArc: boolean; commandCount: number }>;
} {
  const paths = Array.from(
    document.querySelectorAll('.comic-mockup-svg__bubble path'),
  ) as SVGPathElement[];

  const invalid: Array<{
    index: number;
    closed: boolean;
    hasLegacyArc: boolean;
    commandCount: number;
  }> = [];

  paths.forEach((path, index) => {
    const d = (path.getAttribute('d') ?? '').trim();
    const closed = d.endsWith('Z');
    const hasLegacyArc = /\sA\s/i.test(d);
    const commandCount = (d.match(/[MLQZ]/gi) ?? []).length;
    if (!closed || hasLegacyArc || commandCount < 4) {
      invalid.push({ index, closed, hasLegacyArc, commandCount });
    }
  });

  return { bubbleCount: paths.length, invalid };
}

test('scrapboard mad-libs bubbles use closed non-legacy paths', async ({ page }) => {
  await page.goto('/scrapboard/');
  await page.getByTestId('scrapboard-randomize-text').click();
  await expect(page.getByTestId('scrapboard-board').getByTestId('comic-mockup-svg')).toBeVisible();

  const audit = await page.evaluate(auditBubblePathsInBrowser);
  expect(audit.bubbleCount, 'expected at least one speech bubble').toBeGreaterThan(0);
  expect(audit.invalid, JSON.stringify(audit.invalid)).toEqual([]);
});

test('scrapboard 10-panel grid bubbles pass path audit after mad-libs fill', async ({ page }) => {
  await page.goto('/scrapboard/');

  const addPanels = page.getByLabel('More panels');
  for (let i = 0; i < 6; i++) {
    await addPanels.click();
  }
  await expect(page.getByTestId('scrapboard-panel-count')).toContainText('10');
  await expect(page.getByTestId('scrapboard-board').locator('[data-panel-index]')).toHaveCount(10);

  await page.getByTestId('scrapboard-randomize-text').click();
  await expect(page.getByTestId('scrapboard-board').getByTestId('comic-mockup-svg')).toBeVisible();

  const audit = await page.evaluate(auditBubblePathsInBrowser);
  if (audit.bubbleCount > 0) {
    expect(audit.invalid, JSON.stringify(audit.invalid)).toEqual([]);
  }
});
