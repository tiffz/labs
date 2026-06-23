import type { Page } from '@playwright/test';

export type LcpSample = {
  ok: boolean;
  lcpMs: number | null;
  budgetMs: number;
  reason?: string;
};

/** Advisory LCP sample via PerformanceObserver (Chromium). */
export async function sampleLcpMs(page: Page, budgetMs = 2500): Promise<LcpSample> {
  const lcpMs = await page.evaluate(async () => {
    return await new Promise<number | null>((resolve) => {
      let settled = false;
      const finish = (value: number | null) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const last = entries[entries.length - 1];
          if (last) finish(last.startTime);
        });
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
        window.setTimeout(() => {
          observer.disconnect();
          finish(null);
        }, 3000);
      } catch {
        finish(null);
      }
    });
  });

  if (lcpMs == null) {
    return { ok: true, lcpMs: null, budgetMs, reason: 'LCP not available (non-Chromium or no paint)' };
  }
  if (lcpMs > budgetMs) {
    return {
      ok: false,
      lcpMs,
      budgetMs,
      reason: `LCP ${Math.round(lcpMs)}ms exceeds ${budgetMs}ms budget`,
    };
  }
  return { ok: true, lcpMs, budgetMs };
}
