import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, type Locator } from '@playwright/test';
import { enterEncoreApp } from '../helpers/enterEncoreApp';
import { gotoEncoreOriginalsQueue, openSeededOriginalStage } from '../helpers/encoreOriginalsQueue';

const MOV = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/encore-take.mov'));

/** Drop files onto `target` the way the OS does: a DataTransfer carrying real File objects. */
async function dropFiles(target: Locator, files: { name: string; type: string; base64: string }[]) {
  const dataTransfer = await target.page().evaluateHandle((list) => {
    const dt = new DataTransfer();
    for (const f of list) {
      const bytes = Uint8Array.from(atob(f.base64), (c) => c.charCodeAt(0));
      dt.items.add(new File([bytes], f.name, { type: f.type }));
    }
    return dt;
  }, files);
  await target.dispatchEvent('dragover', { dataTransfer });
  await target.dispatchEvent('drop', { dataTransfer });
}

test.describe('Encore Originals dropped take', () => {
  test('a dropped file becomes a take with no confirm step (ADR 0030)', async ({ page }) => {
    await enterEncoreApp(page);
    await gotoEncoreOriginalsQueue(page);
    await openSeededOriginalStage(page, 'E2E Queue A', 'Record takes');

    const takesSection = page.getByRole('region', { name: 'Demo takes' });
    await dropFiles(takesSection, [
      { name: 'dropped-take.mov', type: 'video/quicktime', base64: MOV.toString('base64') },
      { name: 'notes.txt', type: 'text/plain', base64: Buffer.from('not audio').toString('base64') },
    ]);

    // The take is added without anyone pressing "Add take".
    await expect(
      page.getByRole('textbox', { name: 'Take name' }).and(page.locator('[value="dropped-take.mov"]')),
    ).toHaveCount(1, { timeout: 10_000 });

    // The file that can't be a take stays listed with the reason; there is nothing to confirm.
    const review = page.getByRole('region', { name: 'Takes ready to add' });
    await expect(review.getByText("That file isn't an audio or video file.")).toBeVisible();
    await expect(review.getByRole('button', { name: /^Add/ })).toHaveCount(0);
  });

  test('a file dropped on the song files "Demo takes" slot is added at once', async ({ page }) => {
    await enterEncoreApp(page);
    await gotoEncoreOriginalsQueue(page);
    await page.getByText('E2E Queue A', { exact: true }).click();
    // A fresh seeded song opens on the Brainstorm step, where the song files sidebar lives.
    await expect(page.locator('.encore-originals-song-references')).toBeVisible({ timeout: 15_000 });

    const slot = page.getByRole('region', { name: /^Demo takes/ });
    await dropFiles(slot, [
      { name: 'slot-take.mov', type: 'video/quicktime', base64: MOV.toString('base64') },
      { name: 'notes.txt', type: 'text/plain', base64: Buffer.from('not audio').toString('base64') },
    ]);

    await expect(slot.getByText('slot-take.mov')).toBeVisible({ timeout: 10_000 });
    // The refused file is listed with its reason, with nothing to confirm.
    const review = page.getByRole('region', { name: 'Takes ready to add' });
    await expect(review.getByText("That file isn't an audio or video file.")).toBeVisible();
    await expect(review.getByRole('button', { name: /^Add/ })).toHaveCount(0);
  });
});
