import { test, expect } from '../labsTest';
import { statSync } from 'node:fs';

const COMPLEX_RHYTHM =
  'D-T-K-S-D-T-K-S-D-T-K-S-D-T-K-S|D-T-K-S-D-T-K-S-D-T-K-S-D-T-K-S|'
  + 'D-T-K-S-D-T-K-S-D-T-K-S-D-T-K-S|D-T-K-S-D-T-K-S-D-T-K-S-D-T-K-S|'
  + 'D-T-K-S-D-T-K-S-D-T-K-S-D-T-K-S|D-T-K-S-D-T-K-S-D-T-K-S-D-T-K-S|'
  + 'D-T-K-S-D-T-K-S-D-T-K-S-D-T-K-S|D-T-K-S-D-T-K-S-D-T-K-S-D-T-K-S';

test.describe('Darbuka score export', () => {
  test('PNG export saves a non-trivial score snapshot', async ({ page }, testInfo) => {
    await page.goto('/drums/');
    const input = page.getByPlaceholder('D-T-__T-D---T---');
    await expect(input).toBeVisible({ timeout: 10_000 });
    await input.fill(COMPLEX_RHYTHM);
    await input.blur();
    await expect(page.locator('.vexflow-container svg')).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: /Download rhythm/i }).click();
    const exportPanel = page.locator('.shared-export-panel-drums');
    await expect(exportPanel).toBeVisible({ timeout: 10_000 });
    await exportPanel.getByText('PNG', { exact: true }).click();

    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
    await exportPanel.getByRole('button', { name: /^Export$/ }).click();
    const download = await downloadPromise;

    // test-results/ is gitignored, so a run never dirties the working tree.
    const pngPath = testInfo.outputPath('score-export-verify.png');
    await download.saveAs(pngPath);

    expect(statSync(pngPath).size).toBeGreaterThan(10_000);
    expect(download.suggestedFilename()).toMatch(/\.png$/i);
  });
});
