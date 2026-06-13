import type { Page } from '@playwright/test';

/** Pass Encore access gate so hash routes mount the signed-in shell. */
export async function enterEncoreApp(page: Page): Promise<void> {
  await page.goto('/encore/');
  await page.waitForSelector('#root', { state: 'attached' });
  const continueLocal = page.getByRole('button', { name: 'Continue without Google' });
  if (await continueLocal.isVisible().catch(() => false)) {
    await continueLocal.click();
  }
}
