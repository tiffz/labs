import { test, expect, Page } from '@playwright/test';

// Simple stability checks for the Corporate Ladder app
// - Page should load and render a frame within a short budget
// - DOM should not explode beyond a reasonable cap
// - Repeated input should not freeze the page (two RAFs after key spams)

const gotoCorp = async (page: Page) => {
  await page.goto('/corp/', { waitUntil: 'domcontentloaded' });
  // Wait for the game init to run
  await page.waitForSelector('#map-container', { state: 'attached' });
  await page.waitForSelector('#fog-container', { state: 'attached' });
};

const nextFrame = async (page: Page) => {
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  );
};

test.describe('Corp Dungeon stability', () => {
  test('initial load is responsive and not overly heavy', async ({ page }) => {
    await gotoCorp(page);

    // Ensure at least two frames tick - if the page is jammed, this will time out
    await nextFrame(page);
    await nextFrame(page);

    // Sanity check DOM size for tiles/fog/entities (cap generous to avoid flakes)
    const nodeCount = await page.evaluate(() => (
      document.querySelectorAll('.tile, .entity, .fog-tile').length
    ));
    expect(nodeCount).toBeLessThan(15000);
  });

  test('keyboard movement does not freeze the page', async ({ page }) => {
    await gotoCorp(page);

    // Spam some arrow keys to trigger updates
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowDown');
    }

    // Still should render frames after interaction
    await nextFrame(page);
    await nextFrame(page);

    // Keep DOM caps in check after movement
    const nodeCount = await page.evaluate(() => (
      document.querySelectorAll('.tile, .entity, .fog-tile').length
    ));
    expect(nodeCount).toBeLessThan(16000);
  });
});


