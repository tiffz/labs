import { test, expect, Page } from '@playwright/test';

test.describe('Corporate Ladder movement', () => {
  test('arrow keys move the player and change player position', async ({ page }: { page: Page }) => {
    await page.goto('/corp/');
    await page.waitForSelector('#map-container', { state: 'attached' });
    const getPlayerPos = async () => {
      const el = await page.waitForSelector('#player');
      const pos = await el.getAttribute('data-pos');
      return pos ?? '0,0';
    };
    const start = await getPlayerPos();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(50);
    const after = await getPlayerPos();
    expect(after).not.toBe(start);
  });
});


