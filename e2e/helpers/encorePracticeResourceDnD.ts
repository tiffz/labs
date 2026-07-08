import { expect, type Locator, type Page } from '@playwright/test';

/** Minimum pointer travel so dnd-kit PointerSensor (distance: 4) activates. */
const DND_ACTIVATION_PX = 10;

/**
 * Pointer drag between two locators (dnd-kit chips / section drop zones).
 * Uses manual mouse steps — Playwright `dragTo` uses HTML5 DnD, which dnd-kit ignores.
 */
export async function pointerDragBetween(
  page: Page,
  source: Locator,
  target: Locator,
): Promise<void> {
  await source.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();

  const from = await source.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) {
    throw new Error('pointerDragBetween: missing bounding box on source or target');
  }

  const startX = from.x + Math.min(12, from.width * 0.15);
  const startY = from.y + from.height / 2;
  const endX = to.x + to.width / 2;
  const endY = to.y + Math.min(to.height * 0.65, to.height - 8);

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(50);
  await page.mouse.move(startX + DND_ACTIVATION_PX, startY + DND_ACTIVATION_PX, { steps: 3 });
  await page.waitForTimeout(50);
  await page.mouse.move(endX, endY, { steps: 30 });
  await page.waitForTimeout(50);
  await page.mouse.up();
}

export const ENCORE_PRACTICE_RESOURCE_SECTION = {
  listen: '#encore-media-hub-listen',
  play: '#encore-media-hub-play',
  playDropZone: '[data-testid="encore-practice-section-drop-play"]',
} as const;

export async function addReferenceLinkViaPaste(
  page: Page,
  listenSection: Locator,
  url: string,
): Promise<void> {
  await listenSection.getByRole('button', { name: 'Add track' }).click();
  const paste = page.getByPlaceholder('Paste link');
  await expect(paste).toBeVisible();
  await paste.fill(url);
  await paste.press('Enter');
  await expect(paste).toBeHidden({ timeout: 10_000 });
}

export async function dragPracticeResourceChipToPlay(
  page: Page,
  chip: Locator,
): Promise<void> {
  const dropZone = page.locator(ENCORE_PRACTICE_RESOURCE_SECTION.playDropZone);
  await pointerDragBetween(page, chip, dropZone);
  await page.waitForTimeout(200);
}
