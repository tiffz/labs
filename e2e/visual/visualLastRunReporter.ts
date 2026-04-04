import type { FullConfig, FullResult, Reporter, Suite } from '@playwright/test/reporter';
import fs from 'node:fs';
import path from 'node:path';

/** Matches apps captured for the UI baselines gallery (`apps.visual.spec.ts`). */
function isVisualBaselineSpec(testFile: string): boolean {
  const normalized = testFile.replace(/\\/g, '/');
  return normalized.endsWith('e2e/visual/apps.visual.spec.ts');
}

/**
 * Writes `test-results/visual-last-run.json` after each run so the UI gallery can show
 * status scoped to visual baseline tests only (not the whole Playwright workspace).
 */
export default class VisualLastRunReporter implements Reporter {
  private rootSuite: Suite | undefined;

  onBegin(_config: FullConfig, suite: Suite): void {
    this.rootSuite = suite;
  }

  async onEnd(result: FullResult): Promise<void> {
    if (!this.rootSuite) return;

    const visualTests = this.rootSuite.allTests().filter((t) => isVisualBaselineSpec(t.location.file));
    if (visualTests.length === 0) return;

    const failedTests = visualTests.filter((t) => !t.ok()).map((t) => t.id);
    const status = failedTests.length === 0 ? 'passed' : 'failed';

    const outputDir = path.join(process.cwd(), 'test-results');
    fs.mkdirSync(outputDir, { recursive: true });
    const outPath = path.join(outputDir, 'visual-last-run.json');
    fs.writeFileSync(
      outPath,
      JSON.stringify(
        {
          status,
          failedTests,
          visualTestCount: visualTests.length,
          finishedAt: new Date().toISOString(),
          playwrightRunStatus: result.status,
        },
        null,
        2
      ),
      'utf-8'
    );
  }
}
