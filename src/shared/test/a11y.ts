import { axe, type AxeResults } from 'jest-axe';

export async function runA11yAudit(container: HTMLElement): Promise<AxeResults> {
  return axe(container, {
    rules: {
      // JSDOM does not provide landmarks/body context equivalent to browser screen readers.
      region: { enabled: false },
    },
  });
}
