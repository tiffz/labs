import type { Page } from '@playwright/test';

export type AxeViolationSummary = {
  id: string;
  impact: string | null;
  description: string;
  nodes: number;
};

export type AxeAuditResult =
  | { ok: true; skipped?: string }
  | { ok: false; violations: AxeViolationSummary[] };

type AxeAuditOptions = {
  /** Scope audit to this selector (recommended — full-page MUI is noisy). */
  rootSelector?: string;
  /** Violation impact levels that fail the check */
  failImpacts?: Array<'critical' | 'serious' | 'moderate' | 'minor'>;
};

/**
 * Advisory axe pass — injects axe-core from CDN in the browser context.
 * Prefer scoping to a stable region (e.g. app lede) rather than full MUI shells.
 */
export async function runAxeAuditInPage(page: Page, options: AxeAuditOptions = {}): Promise<AxeAuditResult> {
  const failImpacts = options.failImpacts ?? ['critical', 'serious'];
  return page.evaluate(
    async ({ rootSelector, failImpacts: impacts }) => {
      const loadAxe = (): Promise<void> =>
        new Promise((resolve, reject) => {
          if ((window as Window & { axe?: unknown }).axe) {
            resolve();
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.3/axe.min.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('axe-core load failed'));
          document.head.appendChild(script);
        });

      try {
        await loadAxe();
      } catch {
        return { ok: true as const, skipped: 'axe-core unavailable' };
      }

      const axe = (window as Window & { axe?: { run: (ctx?: Element, opts?: object) => Promise<{ violations: Array<{ id: string; impact?: string; description: string; nodes: unknown[] }> }> } }).axe;
      if (!axe) return { ok: true as const, skipped: 'axe missing after load' };

      const root = rootSelector ? document.querySelector(rootSelector) : document.body;
      if (!root) return { ok: true as const, skipped: `root not found: ${rootSelector}` };

      const result = await axe.run(root instanceof Element ? root : undefined, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'best-practice'] },
      });

      const violations = result.violations
        .filter((v) => impacts.includes((v.impact ?? 'minor') as (typeof impacts)[number]))
        .map((v) => ({
          id: v.id,
          impact: v.impact ?? null,
          description: v.description,
          nodes: v.nodes.length,
        }));

      return violations.length === 0 ? { ok: true as const } : { ok: false as const, violations };
    },
    { rootSelector: options.rootSelector, failImpacts },
  );
}
