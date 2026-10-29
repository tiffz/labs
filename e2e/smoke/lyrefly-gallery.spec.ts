import { expect, test } from '@playwright/test';

// 1x1 transparent PNG: a piece image for the bundle import, never shown at size.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

/** The demo comic is still being made, so the Library hides it until "Show unfinished" is on. */
async function showUnfinished(page: import('@playwright/test').Page): Promise<void> {
  await page.getByLabel('Show unfinished comics').check();
}

test.describe('Lyrefly gallery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lyrefly/?e2eSeed=1');
    await expect(page).toHaveTitle(/Lyrefly/i);
    await expect(page.getByTestId('lyrefly-app')).toBeVisible();
    await expect(page.getByTestId('lyrefly-showcase')).toBeVisible({ timeout: 15000 });
  });

  // ADR 0031: the Library is for finished work. The demo comic has pages but no publish log.
  test('the Library shows complete comics only until Show unfinished is on', async ({ page }) => {
    await expect(page.getByTestId('lyrefly-shelf-toolbar')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Open Midnight Courier/i })).toHaveCount(0);
    await showUnfinished(page);
    await expect(page.getByRole('button', { name: /Open Midnight Courier/i })).toBeVisible();
  });

  test('opens script stage from seeded project', async ({ page }) => {
    await showUnfinished(page);
    await expect(page.getByRole('heading', { name: /Midnight Courier/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /Open Midnight Courier/i }).click();
    await expect(page).toHaveURL(/#\/project\//, { timeout: 15000 });
    await expect(page.getByTestId('lyrefly-project-workbench')).toBeVisible();
    await expect(page.getByTestId('lyrefly-script-editor')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('lyrefly-script-preview')).toBeVisible();
    await expect(page.getByTestId('lyrefly-workflow-stepper')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Script (current step)' })).toBeVisible();
  });

  test('creates a new comic with brainstorm workflow', async ({ page }) => {
    await page.getByRole('button', { name: /New comic/i }).click();
    await expect(page).toHaveURL(/#\/project\//, { timeout: 15000 });
    await expect(page.getByTestId('lyrefly-project-workbench')).toBeVisible();
    await expect(page.getByTestId('lyrefly-brainstorm-stage')).toBeVisible();
    await expect(page.getByTestId('lyrefly-brainstorm-board')).toBeVisible();
    await expect(page.getByTestId('lyrefly-concept-shelf')).toBeVisible();
    await expect(page.getByTestId('lyrefly-brainstorm-resources')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Concept art' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Add concept art/i })).toBeVisible();
    await expect(page.getByTestId('lyrefly-workflow-stepper')).toBeVisible();
    await expect(page.getByTestId('lyrefly-continue-next-stage')).toBeVisible();
  });

  // The stage actions change text per stage ("Continue to Publish", "Back to gallery"); they used
  // to resize their grid column and slide the stepper up to 33px sideways on every click.
  for (const viewport of [
    { width: 1440, height: 900 },
    // Between md and lg the title column used to collapse to 0px and the comic's name vanished.
    { width: 1024, height: 768 },
    { width: 390, height: 844 },
  ]) {
    test(`workbench header holds still across stages at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await showUnfinished(page);
      await page.getByRole('button', { name: /Open Midnight Courier/i }).click();
      const stepper = page.getByTestId('lyrefly-workflow-stepper');
      const actions = page.getByTestId('lyrefly-stage-actions');
      await expect(stepper).toBeVisible({ timeout: 15000 });

      const geometry = async () => {
        const s = await stepper.boundingBox();
        const a = await actions.boundingBox();
        return [s?.x, s?.y, s?.width, a?.x, a?.width].map((n) => Math.round(n ?? NaN));
      };

      const title = page.getByRole('textbox', { name: 'Comic title' });
      expect((await title.boundingBox())?.width ?? 0, 'comic title width').toBeGreaterThan(100);

      const stages = ['Brainstorm', 'Script', 'Draw', 'Publish'];
      await stepper.getByRole('button', { name: stages[0] }).click();
      await expect(stepper.getByRole('button', { name: `${stages[0]} (current step)` })).toBeVisible();
      const baseline = await geometry();
      for (const stage of stages.slice(1)) {
        await stepper.getByRole('button', { name: stage }).click();
        await expect(stepper.getByRole('button', { name: `${stage} (current step)` })).toBeVisible();
        expect(await geometry(), `header geometry on ${stage}`).toEqual(baseline);
      }
    });
  }

  test('the Workbench tracks comics in progress by step; the shelf stays a library', async ({ page }) => {
    // The shelf no longer carries the old priority queue or a step pill per cover.
    await expect(page.getByTestId('lyrefly-pipeline-queue')).toHaveCount(0);
    await page.getByTestId('lyrefly-workbench-tab').click();
    await expect(page).toHaveURL(/#\/workbench/);
    const publish = page.getByTestId('lyrefly-board-publish');
    await expect(publish.getByRole('button', { name: /Open Midnight Courier/i })).toBeVisible({ timeout: 15000 });
    await publish.getByRole('button', { name: /Open Midnight Courier/i }).click();
    await expect(page).toHaveURL(/#\/project\/.+\/publish/);
  });

  // The Draw stage scrolls as one flex column; the print-size panel hides overflow, so it used to
  // shrink to 2px under a tall page grid.
  test('the print-size panel keeps its height above the page grid', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await showUnfinished(page);
    await page.getByRole('button', { name: /Open Midnight Courier/i }).click();
    await page.getByTestId('lyrefly-workflow-stepper').getByRole('button', { name: 'Draw' }).click();
    const panel = page.locator('.lyrefly-print-spec');
    await expect(panel).toBeVisible();
    const fits = await panel.evaluate((el) => el.getBoundingClientRect().height >= el.scrollHeight);
    expect(fits, 'print-size panel shows all of its content').toBe(true);
  });

  test('the old Accounts link opens Identities', async ({ page }) => {
    await page.goto('/lyrefly/?e2eSeed=1#/accounts');
    await expect(page.getByRole('heading', { name: 'Identities' })).toBeVisible();
    await expect(page.getByTestId('lyrefly-accounts-tab')).toHaveText('Identities');
  });

  test('makes, renames and archives a collection from the Sketchbook', async ({ page }) => {
    await page.getByTestId('lyrefly-sketchbook-tab').click();
    await page.getByTestId('lyrefly-sketchbook-mode-switch').getByRole('button', { name: 'Collections' }).click();
    await expect(page.getByTestId('lyrefly-collections')).toBeVisible();
    await page.getByRole('button', { name: 'New collection' }).click();

    await expect(page.getByTestId('lyrefly-collection')).toBeVisible();
    // An empty collection opens straight onto adding pieces.
    await expect(page.getByTestId('lyrefly-collection-add')).toBeVisible();
    const title = page.getByRole('textbox', { name: 'Collection title' });
    await title.fill('Daily comics');
    await title.blur();
    await page.getByRole('button', { name: 'Archive' }).click();
    await page.getByRole('button', { name: 'All collections' }).click();

    await expect(page.getByText('No collections yet.', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Archived (1)' }).click();
    await expect(page.getByRole('button', { name: /Daily comics/ })).toBeVisible();
  });

  // Picked with Import ideas, or dropped on the board: either way the bundle opens its preview.
  // A drop used to save the whole folder as one idea with every image attached.
  for (const how of ['picked', 'dropped'] as const) {
    test(`previews a bundle of collections ${how} with its images`, async ({ page }) => {
      const bundle = {
        format: 'lyrefly-bundle',
        version: 1,
        source: 'an old site',
        comics: [],
        seeds: [],
        collections: [
          {
            key: 'e2e:old-site',
            title: 'Old Site',
            status: 'archived',
            pieces: [
              { key: '1', file: 'old-1.png', title: 'Sheep' },
              { key: '2', file: 'old-2.png', title: 'Deer' },
            ],
          },
        ],
      };
      await page.getByTestId('lyrefly-sketchbook-tab').click();
      // One image goes with the bundle, one is left behind.
      const files = [
        { name: 'archive.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(bundle)) },
        { name: 'old-1.png', mimeType: 'image/png', buffer: PNG },
      ];
      if (how === 'picked') {
        await page.getByTestId('lyrefly-sketchbook-import-input').setInputFiles(files);
      } else {
        const board = page.getByTestId('lyrefly-sketchbook-input').locator('..');
        const dataTransfer = await page.evaluateHandle(
          (list) => {
            const dt = new DataTransfer();
            for (const f of list) {
              const bytes = Uint8Array.from(atob(f.base64), (c) => c.charCodeAt(0));
              dt.items.add(new File([bytes], f.name, { type: f.type }));
            }
            return dt;
          },
          files.map((f) => ({ name: f.name, type: f.mimeType, base64: f.buffer.toString('base64') })),
        );
        await board.dispatchEvent('dragover', { dataTransfer });
        await board.dispatchEvent('drop', { dataTransfer });
      }
      await expect(page.getByTestId('lyrefly-bundle-summary')).toHaveText(
        'Old Site (archived): 1 image to upload, 1 not picked with the file',
      );
      await expect(page.getByTestId('lyrefly-bundle-confirm')).toBeEnabled();
    });
  }

  // A brand-new comic left with nothing but the sample script is an idea: it sits in the
  // Sketchbook, and "Start developing" moves it to the Workbench.
  test('a brainstorm-only comic sits in the Sketchbook until you start developing it', async ({ page }) => {
    await page.getByTestId('lyrefly-sketchbook-tab').click();
    await expect(page.getByTestId('lyrefly-sketchbook')).toBeVisible();
    await page.getByTestId('lyrefly-sketchbook-input').fill('A moon girl who is lonely');
    await page.getByTestId('lyrefly-sketchbook-add').click();
    const card = page.locator('[data-testid^="lyrefly-sketchbook-seed-"]').first();
    await card.getByRole('button', { name: 'Start developing' }).click();
    await expect(page).toHaveURL(/#\/project\//, { timeout: 15000 });
    await page.getByTestId('lyrefly-workbench-tab').click();
    // The note's text counts as brainstorming done, so the comic waits in the Script column.
    await expect(page.getByTestId('lyrefly-board-script').getByRole('button', { name: /Open A moon girl/ })).toBeVisible();
  });

  test('uses riso cube theme on app root', async ({ page }) => {
    await expect(page.getByTestId('lyrefly-app')).toHaveAttribute('data-lyrefly-theme', 'risocube');
    await expect(page.getByTestId('lyrefly-design-picker')).toHaveCount(0);
  });

  test('switches between shelf and table views with shared toolbar', async ({ page }) => {
    await expect(page.getByTestId('lyrefly-shelf-toolbar')).toBeVisible({ timeout: 15000 });
    await showUnfinished(page);
    await expect(page.getByTestId('lyrefly-shelf-view-grid')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('lyrefly-shelf-view-table').click();
    await expect(page.getByTestId('lyrefly-shelf-table')).toBeVisible();
    await page.getByTestId('lyrefly-shelf-view-grid').click();
    await expect(page.getByRole('button', { name: /Open Midnight Courier/i })).toBeVisible();
  });
});
