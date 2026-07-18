import { describe, expect, it } from 'vitest';

import {
  formatScrapboardLayoutAuditReport,
  runScrapboardLayoutAudit,
} from './scrapboardLayoutAudit';

describe('scrapboardLayoutAudit', () => {
  it('passes hard quality rules on 100 generated story layouts', { timeout: 120_000 }, () => {
    const report = runScrapboardLayoutAudit({ pageCount: 100 });
    expect(report.pages).toBe(100);
    expect(report.panels).toBeGreaterThan(200);
    if (report.failed > 0) {
      throw new Error(formatScrapboardLayoutAuditReport(report));
    }
  });
});
