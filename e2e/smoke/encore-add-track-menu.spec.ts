import { test, expect } from '@playwright/test';
import { enterEncoreApp } from '../helpers/enterEncoreApp';

const MUI_MENU_FRAGMENT_RE = /MUI: The Menu component doesn't accept a Fragment as a child/i;

/**
 * CUJ: Song page media hub — Add track / Add chart menus open without MUI Menu Fragment errors.
 * @see src/encore/CUJs.md · src/encore/PERFORMANCE_UX.md § Add-track menu checklist
 */
test.describe('Encore add-track menu', () => {
  test('Add track and Add chart menus open on song page', async ({ page }) => {
    const menuFragmentErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      if (MUI_MENU_FRAGMENT_RE.test(text)) menuFragmentErrors.push(text);
    });

    await enterEncoreApp(page);
    await page.goto('/encore/#/library');
    await expect(page.getByRole('heading', { name: 'Your repertoire' })).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Add song' }).first().click();
    const addSongDialog = page.getByRole('dialog', { name: 'Add song' });
    await expect(addSongDialog).toBeVisible();
    await addSongDialog.getByLabel('Title').fill('E2E Smoke Song');
    await addSongDialog.getByLabel('Artist').fill('Labs Agent');
    await addSongDialog.getByRole('button', { name: 'Add song' }).click();

    await expect(page).toHaveURL(/#\/song\//, { timeout: 15_000 });

    const addTrack = page.getByRole('button', { name: 'Add track' }).first();
    await expect(addTrack).toBeVisible({ timeout: 10_000 });
    await addTrack.click();

    await expect(page.getByText('Paste a link', { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder('Paste link')).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Upload file/i })).toBeVisible();
    await page.keyboard.press('Escape');

    const addChart = page.getByRole('button', { name: 'Add chart' });
    await expect(addChart).toBeVisible();
    await addChart.click();
    await expect(page.getByRole('menuitem', { name: 'Upload file…' })).toBeVisible();
    await page.keyboard.press('Escape');

    expect(menuFragmentErrors, 'MUI Menu must not use Fragment children').toEqual([]);
  });
});
