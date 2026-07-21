import { test, expect } from '@playwright/test';
import { clickStanzaLibraryCard } from '../helpers/stanzaLibrary';
import { expectMetronomeSplitControl } from '../helpers/metronomeSplitControl';
import { STANZA_E2E_LOOP_SONG_TITLE } from '../../src/stanza/e2e/stanzaE2eBootstrap';

test.describe('Metronome split control', () => {
  test('Drums split control opens advanced panel', async ({ page }) => {
    await page.goto('/drums/');
    await expect(page.getByPlaceholder('D-T-__T-D---T---')).toBeVisible({ timeout: 15_000 });

    const root = page.locator('.right-controls-group');
    await expectMetronomeSplitControl(page, root, { appearance: 'drums' });

    const settingsButton = root.getByRole('button', { name: 'Metronome settings' });
    await settingsButton.click();

    const panel = page.getByRole('group', { name: 'Advanced metronome settings' });
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('checkbox', { name: 'Metronome on' })).toBeVisible();
    await expect(panel.getByText(/Metronome is off\. Turn it on to apply settings\./i)).toBeVisible();
    await expect(panel.getByText('Subdivision')).toBeVisible();
    await expect(panel.getByText('Levels')).toBeVisible();
    await expect(panel.getByRole('slider', { name: 'Downbeat volume' })).toBeVisible();

    await panel.getByRole('checkbox', { name: 'Metronome on' }).check();
    await expect(panel.getByText(/Metronome is off\. Turn it on to apply settings\./i)).toBeHidden();
    await expect(root.locator('.labs-split-action-button__primary')).toHaveAttribute('aria-pressed', 'true');
  });

  test('Chords split control is cohesive', async ({ page }) => {
    await page.goto('/chords/');
    await expect(page.getByRole('heading', { name: /Chord Progression Generator/i })).toBeVisible({
      timeout: 15_000,
    });
    await expectMetronomeSplitControl(page, page.locator('#root'), {
      appearance: 'chords',
    });
  });

  test('Words split control is cohesive', async ({ page }) => {
    await page.goto('/words/');
    await expect(page.locator('main#main')).toBeVisible({ timeout: 15_000 });
    await expectMetronomeSplitControl(page, page.locator('main#main'), {
      appearance: 'words',
    });
  });

  test('Midi split control is cohesive', async ({ page }) => {
    await page.goto('/midi/');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /Midi Scratchpad/i })).toBeVisible();
    await expectMetronomeSplitControl(page, page.locator('#main'), {
      appearance: 'midi',
    });
  });

  test('Stanza practice rail split control is cohesive', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('STANZA_E2E_HOOKS', '1');
    });
    await page.goto('/stanza/');
    await page.waitForFunction(
      () => typeof window !== 'undefined' && (window as Window & { __stanzaE2e?: unknown }).__stanzaE2e != null,
    );
    await page.evaluate(async () => {
      const api = (window as Window & { __stanzaE2e?: { seedSongWithLoopPlayback: () => Promise<string> } })
        .__stanzaE2e;
      await api!.seedSongWithLoopPlayback();
    });

    await clickStanzaLibraryCard(page, STANZA_E2E_LOOP_SONG_TITLE);
    await expect(page.locator('.stanza-metronome-strip')).toBeVisible({ timeout: 15_000 });
    await expectMetronomeSplitControl(page, page.locator('.stanza-metronome-strip'), {
      appearance: 'stanza',
    });
  });
});
