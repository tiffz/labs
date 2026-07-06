import { expect, type Locator, type Page } from '@playwright/test';

export type MetronomeSplitExpectations = {
  appearance: string;
  /** When omitted, asserts default off label. */
  enabled?: boolean;
};

/** Assert shared split control chrome: unified shell, no per-button borders, tooltips via aria. */
export async function expectMetronomeSplitControl(
  page: Page,
  scope: Locator,
  { appearance, enabled = false }: MetronomeSplitExpectations,
) {
  const splitControl = scope.locator(`.labs-metronome-split-control--${appearance}`).first();
  await expect(splitControl).toBeVisible({ timeout: 15_000 });

  const shell = splitControl.locator('.labs-split-action-button').first();
  await expect(shell).toBeVisible();

  const toggleButton = shell.locator('.labs-split-action-button__primary').first();
  const isOn =
    enabled ||
    (await toggleButton.getAttribute('aria-pressed')) === 'true' ||
    (await toggleButton.getAttribute('aria-label')) === 'Metronome on';

  const toggle = shell.getByRole('button', { name: isOn ? 'Metronome on' : 'Metronome off' });
  const settings = shell.getByRole('button', { name: 'Metronome settings' });
  await expect(toggle).toBeVisible();
  await expect(settings).toBeVisible();

  const styles = await shell.evaluate((el) => {
    const shellStyle = getComputedStyle(el);
    const toggleEl = el.querySelector('.labs-split-action-button__primary') as HTMLElement | null;
    const menuEl = el.querySelector('.labs-split-action-button__menu') as HTMLElement | null;
    if (!toggleEl || !menuEl) {
      return null;
    }
    const toggleStyle = getComputedStyle(toggleEl);
    const menuStyle = getComputedStyle(menuEl);
    return {
      shellBorderWidth: shellStyle.borderTopWidth,
      shellBorderRadius: shellStyle.borderRadius,
      toggleBorderWidth: toggleStyle.borderTopWidth,
      menuBorderWidth: menuStyle.borderTopWidth,
      toggleBackground: toggleStyle.backgroundColor,
      menuBackground: menuStyle.backgroundColor,
    };
  });

  expect(styles).not.toBeNull();
  expect(parseFloat(styles!.shellBorderRadius)).toBeGreaterThan(0);
  expect(parseFloat(styles!.toggleBorderWidth)).toBe(0);
  expect(parseFloat(styles!.menuBorderWidth)).toBe(0);

  await toggle.hover();
  await expect(page.getByRole('tooltip', { name: isOn ? 'Metronome on' : 'Metronome off' })).toBeVisible({
    timeout: 3_000,
  });

  await settings.hover();
  await expect(page.getByRole('tooltip', { name: 'Metronome settings' })).toBeVisible({ timeout: 3_000 });
}
