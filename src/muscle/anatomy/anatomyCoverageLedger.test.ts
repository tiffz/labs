import { describe, expect, it } from 'vitest';
import {
  buildAnatomyCoverageReport,
  formatAnatomyCoverageReport,
  loadCoverageBaseline,
} from './anatomyCoverageLedger';

describe('anatomyCoverageLedger', () => {
  it('has no blocking CSV muscle or skin overlay gaps', () => {
    const report = buildAnatomyCoverageReport();
    const blocking = report.gaps.filter(
      (gap) => gap.kind === 'csv_muscle' || gap.kind === 'skin_overlay',
    );
    expect(blocking, formatAnatomyCoverageReport(report)).toEqual([]);
  });

  it('has no module region mesh gaps outside explicit waivers', () => {
    const report = buildAnatomyCoverageReport();
    const moduleGaps = report.gaps.filter((gap) => gap.kind === 'module_region_mesh');
    expect(moduleGaps, formatAnatomyCoverageReport(report)).toEqual([]);
  });

  it('does not regress full-body coverage beyond baseline', () => {
    const report = buildAnatomyCoverageReport();
    const baseline = loadCoverageBaseline();
    expect(
      report.summary.fullBodyGaps,
      `Full-body gaps ${report.summary.fullBodyGaps} exceed baseline ${baseline.maxFullBodyGaps}. ` +
        'Run npm run muscle:coverage, fix or waive, then lower baseline when improved.\n' +
        formatAnatomyCoverageReport(report),
    ).toBeLessThanOrEqual(baseline.maxFullBodyGaps);
  });
});

describe('anatomy coverage report (optional)', () => {
  it('prints human-readable report when MUSCLE_COVERAGE_REPORT=1', () => {
    if (process.env.MUSCLE_COVERAGE_REPORT !== '1') return;
    const report = buildAnatomyCoverageReport();
    console.warn(formatAnatomyCoverageReport(report));
    expect(report.gaps.length).toBeGreaterThanOrEqual(0);
  });
});
