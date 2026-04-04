import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

type VisualSnapshot = {
  name: string;
  sizeBytes: number;
  updatedAt: string;
  url: string;
  appId: string;
  formFactor: string;
  platform: string;
};

type VisualFailure = {
  id: string;
  snapshotName: string;
  appId: string;
  formFactor: string;
  platform: string;
  baselineUrl: string;
  actualUrl: string;
  diffUrl: string;
  baselineAttachmentUrl: string | null;
  baselinePath?: string;
  actualPath?: string;
  diffPath?: string;
  actualGeneratedAt?: string | null;
  diffGeneratedAt?: string | null;
};

type RegressionSummary = {
  generatedAt: string;
  visual: {
    snapshotDir: string;
    snapshotDirAbsolute?: string;
    count: number;
    snapshots: VisualSnapshot[];
    lastRun: {
      status: string;
      failedTests: string[];
      visualTestCount?: number;
      finishedAt?: string;
      playwrightRunStatus?: string;
    } | null;
  };
  audio: {
    reportPath: string;
    available: boolean;
    mode: string | null;
    driftCount: number;
    driftIds: string[];
  };
  report: {
    available: boolean;
    url: string;
  };
  runner: {
    active: boolean;
    target:
      | 'visual'
      | 'visual-update'
      | 'visual-update-fresh'
      | 'audio'
      | 'all'
      | null;
    startedAt: string | null;
    finishedAt: string | null;
    exitCode: number | null;
    command: string | null;
    log: string[];
  };
  failures: VisualFailure[];
};

/** Top-bar runner targets exposed in the UI (not `all` / incremental `visual-update`). */
type RunTarget = 'visual' | 'visual-update-fresh' | 'audio';

type RegressionSectionTab = 'screenshots' | 'report';

type RegressionPanelProps = {
  routeSection?: RegressionSectionTab;
  onRouteSectionChange?: (section: RegressionSectionTab) => void;
  /** Increment (e.g. from `#regression/runner`) to expand the runner log. */
  runnerExpandNonce?: number;
};

type LightboxItem = {
  label: string;
  src: string;
};

function bytesToLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isoToLocal(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

function withBaselineImageCacheBust(
  url: string,
  summaryGeneratedAt: string,
  fileFingerprint: { updatedAt: string; sizeBytes: number }
): string {
  if (!summaryGeneratedAt) return url;
  const sep = url.includes('?') ? '&' : '?';
  const token = `${summaryGeneratedAt}|${fileFingerprint.updatedAt}|${fileFingerprint.sizeBytes}`;
  return `${url}${sep}cb=${encodeURIComponent(token)}`;
}

function withFailureImageCacheBust(url: string, summaryGeneratedAt: string, failureId: string): string {
  if (!summaryGeneratedAt) return url;
  const sep = url.includes('?') ? '&' : '?';
  const token = `${summaryGeneratedAt}|${failureId}`;
  return `${url}${sep}cb=${encodeURIComponent(token)}`;
}

function buildLlmRegressionPrompt(failure: VisualFailure, summary: RegressionSummary): string {
  const lines = [
    '## UI regression (Labs monorepo)',
    '',
    'A Playwright visual test reported a pixel difference between the committed baseline PNG and the latest run.',
    '',
    '### Snapshot',
    `- snapshot: ${failure.snapshotName}`,
    `- app: ${failure.appId}, form: ${failure.formFactor}, platform: ${failure.platform}`,
    '',
    '### Local file paths (dev machine)',
    `- baseline: ${failure.baselinePath ?? '(see e2e/visual/apps.visual.spec.ts-snapshots/)'}`,
    `- latest actual: ${failure.actualPath ?? '(n/a)'}`,
    `- diff: ${failure.diffPath ?? '(n/a)'}`,
    '',
    '### Timestamps',
    `- baseline file (from summary): see gallery`,
    `  - latest generated: ${failure.actualGeneratedAt ? isoToLocal(failure.actualGeneratedAt) : 'n/a'}`,
    `  - diff generated: ${failure.diffGeneratedAt ? isoToLocal(failure.diffGeneratedAt) : 'n/a'}`,
    '',
    '### Dev URLs (Vite only; `npm run dev`)',
    `- Baseline image: ${typeof window !== 'undefined' ? window.location.origin : ''}${failure.baselineAttachmentUrl ?? failure.baselineUrl}`,
    `- Latest: ${typeof window !== 'undefined' ? window.location.origin : ''}${failure.actualUrl}`,
    `- Diff: ${typeof window !== 'undefined' ? window.location.origin : ''}${failure.diffUrl}`,
    '',
    '### What to do',
    '1. Decide if the visual change is intentional (design update, font pipeline, test wait).',
    '2. If intentional: update the baseline PNG in the repo (or use Accept in the Regression UI).',
    '3. If not: fix the app or test so the screenshot matches the baseline.',
    '',
    `Summary generated at: ${summary.generatedAt}`,
  ];
  return lines.join('\n');
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function icon(name: string) {
  return <span className="material-symbols-outlined ui-md-icon" aria-hidden="true">{name}</span>;
}

export default function RegressionPanel({
  routeSection = 'screenshots',
  onRouteSectionChange,
  runnerExpandNonce = 0,
}: RegressionPanelProps) {
  const [summary, setSummary] = useState<RegressionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<RegressionSectionTab>(routeSection);
  const [runnerLogExpanded, setRunnerLogExpanded] = useState(runnerExpandNonce > 0);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [runnerDotPhase, setRunnerDotPhase] = useState(0);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [selectedForms, setSelectedForms] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [lightboxItems, setLightboxItems] = useState<LightboxItem[] | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [copyPromptId, setCopyPromptId] = useState<string | null>(null);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const runnerLogScrollRef = useRef<HTMLDivElement>(null);
  const prevRunnerActiveRef = useRef<boolean | undefined>(undefined);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/__regression/summary?_=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });
      if (!response.ok) throw new Error(`Failed to load summary (${response.status})`);
      const payload = (await response.json()) as RegressionSummary;
      setSummary(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load regression data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    setActiveSection(routeSection);
  }, [routeSection]);

  useEffect(() => {
    if (runnerExpandNonce > 0) setRunnerLogExpanded(true);
  }, [runnerExpandNonce]);

  useLayoutEffect(() => {
    if (!runnerLogExpanded || !summary?.runner.log.length) return;
    const el = runnerLogScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [runnerLogExpanded, summary?.runner.log]);

  useEffect(() => {
    onRouteSectionChange?.(activeSection);
  }, [activeSection, onRouteSectionChange]);

  useEffect(() => {
    if (!summary?.runner.active) return;
    const poll = window.setInterval(() => void loadSummary(), 2000);
    return () => window.clearInterval(poll);
  }, [summary?.runner.active, loadSummary]);

  useEffect(() => {
    if (!summary) return;
    const active = summary.runner.active;
    const prev = prevRunnerActiveRef.current;
    if (prev === true && active === false) {
      void loadSummary();
    }
    prevRunnerActiveRef.current = active;
  }, [summary, summary?.runner.active, loadSummary]);

  useEffect(() => {
    if (!summary?.runner.active) return;
    const dots = window.setInterval(() => {
      setRunnerDotPhase((prev) => (prev + 1) % 4);
    }, 350);
    return () => window.clearInterval(dots);
  }, [summary?.runner.active]);

  useEffect(() => {
    if (!lightboxItems) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightboxItems(null);
      if (event.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev + 1) % lightboxItems.length);
      }
      if (event.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev - 1 + lightboxItems.length) % lightboxItems.length);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxItems]);

  useEffect(() => {
    if (!copyPromptId) return;
    const t = window.setTimeout(() => setCopyPromptId(null), 2000);
    return () => window.clearTimeout(t);
  }, [copyPromptId]);

  const appOptions = useMemo(() => {
    const apps = new Set(summary?.visual.snapshots.map((s) => s.appId) ?? []);
    return Array.from(apps).sort((a, b) => a.localeCompare(b));
  }, [summary]);

  const formOptions = useMemo(() => {
    const forms = new Set(summary?.visual.snapshots.map((s) => s.formFactor) ?? []);
    return Array.from(forms).sort((a, b) => a.localeCompare(b));
  }, [summary]);

  const platformOptions = useMemo(() => {
    const platforms = new Set(summary?.visual.snapshots.map((s) => s.platform) ?? []);
    return Array.from(platforms).sort((a, b) => a.localeCompare(b));
  }, [summary]);

  const failureBySnapshotName = useMemo(() => {
    const m = new Map<string, VisualFailure>();
    for (const f of summary?.failures ?? []) {
      m.set(f.snapshotName, f);
    }
    return m;
  }, [summary?.failures]);

  const filteredSnapshots = useMemo(() => {
    const snapshots = summary?.visual.snapshots ?? [];
    return snapshots.filter((snapshot) => {
      if (selectedApps.length > 0 && !selectedApps.includes(snapshot.appId)) return false;
      if (selectedForms.length > 0 && !selectedForms.includes(snapshot.formFactor)) return false;
      if (selectedPlatforms.length > 0 && !selectedPlatforms.includes(snapshot.platform)) return false;
      return true;
    });
  }, [summary, selectedApps, selectedForms, selectedPlatforms]);

  const toggleChip = useCallback(
    (dimension: 'app' | 'form' | 'platform', value: string) => {
      const setters = {
        app: setSelectedApps,
        form: setSelectedForms,
        platform: setSelectedPlatforms,
      } as const;
      const setter = setters[dimension];
      setter((prev) => {
        if (value === '__all__') return [];
        const next = new Set(prev);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        return [...next];
      });
    },
    []
  );

  const visualTotalCount = summary?.visual.count ?? 0;
  const visualLastRun = summary?.visual.lastRun ?? null;
  const failedVisualTests = visualLastRun?.failedTests?.length ?? 0;
  const visualPassedCount = useMemo(() => {
    if (!visualLastRun) return null;
    return Math.max(visualTotalCount - failedVisualTests, 0);
  }, [visualLastRun, visualTotalCount, failedVisualTests]);

  const visualRunKnown = Boolean(visualLastRun);
  const visualPassed = visualRunKnown && visualLastRun?.status === 'passed';
  const visualChipTone = !visualRunKnown ? 'neutral' : visualPassed ? 'passed' : 'failed';
  const audioTotalCount = summary?.audio.available ? 1 : 0;
  const audioPassedCount = summary?.audio.available && (summary?.audio.driftCount ?? 0) === 0 ? 1 : 0;
  const runnerDots = '.'.repeat(runnerDotPhase);

  const triggerRefresh = useCallback(
    async (target: RunTarget) => {
      setRunError(null);
      setRunnerLogExpanded(true);
      setPendingAction(target);
      try {
        const response = await fetch('/__regression/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target }),
        });
        if (!response.ok) {
          const txt = await response.text();
          throw new Error(txt || `Failed to start ${target} refresh`);
        }
        await loadSummary();
      } catch (err) {
        setRunError(err instanceof Error ? err.message : `Failed to run ${target}`);
      } finally {
        setPendingAction(null);
      }
    },
    [loadSummary]
  );

  const runRegenerateBaselines = useCallback(() => {
    setShowRegenerateConfirm(false);
    void triggerRefresh('visual-update-fresh');
  }, [triggerRefresh]);

  const acceptFailure = useCallback(async (id: string) => {
    setRunError(null);
    setPendingAction(`accept:${id}`);
    try {
      const response = await fetch('/__regression/failure/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error(await response.text());
      await loadSummary();
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Failed to accept screenshot');
    } finally {
      setPendingAction(null);
    }
  }, [loadSummary]);

  const rejectFailure = useCallback(async (id: string) => {
    setRunError(null);
    setPendingAction(`reject:${id}`);
    try {
      const response = await fetch('/__regression/failure/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error(await response.text());
      await loadSummary();
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Failed to save rejection report');
    } finally {
      setPendingAction(null);
    }
  }, [loadSummary]);

  const generateFailureReport = useCallback(async () => {
    setRunError(null);
    setPendingAction('failure-report');
    try {
      const response = await fetch('/__regression/failure/report', { method: 'POST' });
      if (!response.ok) throw new Error(await response.text());
      await loadSummary();
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Failed to generate failure report');
    } finally {
      setPendingAction(null);
    }
  }, [loadSummary]);

  const copyLlmPrompt = useCallback(
    async (failure: VisualFailure) => {
      if (!summary) return;
      const text = buildLlmRegressionPrompt(failure, summary);
      const ok = await copyTextToClipboard(text);
      if (ok) setCopyPromptId(failure.id);
    },
    [summary]
  );

  const openLightbox = useCallback((items: LightboxItem[], index: number) => {
    setLightboxItems(items);
    setLightboxIndex(index);
  }, []);

  return (
    <div className="ui-regression-layout">
      <section className="ui-regression-header-card">
        <div>
          <h2>Regression Dashboard</h2>
        </div>
        <div className="ui-regression-actions">
          <button
            type="button"
            className="ui-demo-button ui-action-btn ui-regression-btn-danger"
            disabled={summary?.runner.active || pendingAction !== null}
            onClick={() => setShowRegenerateConfirm(true)}
          >
            {icon('warning')}
            <span>Regenerate baselines</span>
          </button>
          <button
            type="button"
            className="ui-demo-button ui-action-btn"
            disabled={summary?.runner.active || pendingAction !== null}
            onClick={() => void triggerRefresh('visual')}
          >
            {icon('photo_library')}
            <span>{pendingAction === 'visual' ? 'Starting...' : 'Run screenshot tests'}</span>
          </button>
          <button
            type="button"
            className="ui-demo-button ui-action-btn"
            disabled={summary?.runner.active || pendingAction !== null}
            onClick={() => void triggerRefresh('audio')}
          >
            {icon('graphic_eq')}
            <span>{pendingAction === 'audio' ? 'Starting...' : 'Run audio tests'}</span>
          </button>
        </div>
      </section>

      {showRegenerateConfirm ? (
        <div className="ui-regression-modal-backdrop" role="presentation">
          <div
            className="ui-regression-modal"
            role="dialog"
            aria-labelledby="regen-baselines-title"
            aria-modal="true"
          >
            <h3 id="regen-baselines-title">Regenerate all baselines?</h3>
            <p>
              This deletes every PNG in <code>e2e/visual/apps.visual.spec.ts-snapshots/</code> and
              re-runs Playwright with <code>--update-snapshots</code>. Commit the new PNGs only after
              review. Incremental updates (without deleting) stay CLI-only:{' '}
              <code>npm run test:e2e:visual:update</code>.
            </p>
            <div className="ui-regression-modal-actions">
              <button type="button" className="ui-demo-button" onClick={() => setShowRegenerateConfirm(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="ui-demo-button ui-regression-btn-danger"
                onClick={() => runRegenerateBaselines()}
              >
                Regenerate everything
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {summary ? (
        <section className="ui-regression-runner-panel">
          <button
            type="button"
            className="ui-regression-runner-toggle"
            aria-expanded={runnerLogExpanded}
            onClick={() => setRunnerLogExpanded((open) => !open)}
          >
            <span className="ui-regression-runner-toggle-main">
              <strong>Runner log</strong>
              <span className="ui-regression-runner-toggle-meta">
                {summary.runner.active
                  ? `Running${runnerDots}`
                  : summary.runner.exitCode !== null
                    ? `Last exit ${summary.runner.exitCode}`
                    : summary.runner.log.length > 0
                      ? `${summary.runner.log.length} lines`
                      : 'Idle'}
                {summary.runner.command ? (
                  <>
                    {' '}
                    · <code className="ui-regression-inline-cmd">{summary.runner.command}</code>
                  </>
                ) : null}
              </span>
            </span>
            <span
              className={`material-symbols-outlined ui-regression-runner-chevron ${
                runnerLogExpanded ? 'is-open' : ''
              }`}
              aria-hidden
            >
              expand_more
            </span>
          </button>
          {runnerLogExpanded ? (
            <div className="ui-regression-runner-body">
              {summary.runner.log.length > 0 ? (
                <div
                  ref={runnerLogScrollRef}
                  className="ui-regression-runner-log-scroll"
                  tabIndex={0}
                  aria-label="Regression runner output"
                >
                  <pre className="ui-regression-log ui-regression-log--runner">
                    {summary.runner.log.join('\n')}
                  </pre>
                </div>
              ) : (
                <p className="ui-regression-note">No runner output yet. Start a run from the buttons above.</p>
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      {loading ? <p className="ui-regression-note">Loading regression data...</p> : null}
      {error ? <p className="ui-regression-error">{error}</p> : null}
      {runError ? <p className="ui-regression-error">{runError}</p> : null}
      {summary &&
      !summary.runner.active &&
      summary.runner.exitCode !== null &&
      summary.runner.exitCode !== 0 ? (
        <p className="ui-regression-error" role="alert">
          Last regression run exited with code {summary.runner.exitCode}. Expand <strong>Runner log</strong> above for
          details — baselines are only updated when Playwright finishes successfully.
        </p>
      ) : null}

      {summary ? (
        <>
          <section className="ui-regression-compact-status">
            <button
              type="button"
              className={`ui-status-chip ${visualChipTone}`}
              onClick={() => setActiveSection('screenshots')}
            >
              <span>
                Visuals:{' '}
                {visualRunKnown && visualPassedCount !== null
                  ? `${visualPassedCount}/${visualTotalCount} ${visualPassed ? 'PASSED' : 'FAILED'}`
                  : `${visualTotalCount} screenshots (no visual run recorded)`}
              </span>
              <span className="ui-status-hover">
                Scoped to e2e/visual/apps.visual.spec.ts
                <br />
                Last visual run: {visualLastRun?.status ?? 'none'}
                <br />
                Failed tests: {failedVisualTests}
                {visualLastRun?.finishedAt ? (
                  <>
                    <br />
                    Finished: {isoToLocal(visualLastRun.finishedAt)}
                  </>
                ) : null}
                <br />
                Baselines: {summary.visual.snapshotDir}
                <br />
                <em>Open Screenshots gallery</em>
              </span>
            </button>
            <button
              type="button"
              className={`ui-status-chip ${audioPassedCount === audioTotalCount ? 'passed' : 'failed'}`}
              onClick={() => void loadSummary()}
            >
              <span>Audio: {audioPassedCount}/{audioTotalCount} {audioPassedCount === audioTotalCount ? 'PASSED' : 'FAILED'}</span>
              <span className="ui-status-hover">
                Drift count: {summary.audio.driftCount}<br />
                Report: {summary.audio.reportPath}
                <br />
                Reloads summary from disk
              </span>
            </button>
            <button
              type="button"
              className={`ui-status-chip ${
                summary.runner.active
                  ? 'neutral'
                  : summary.runner.exitCode !== null && summary.runner.exitCode !== 0
                    ? 'failed'
                    : 'passed'
              }`}
              onClick={() => setRunnerLogExpanded(true)}
            >
              <span>
                Runner: {summary.runner.active ? `RUNNING${runnerDots}` : 'IDLE'}
                {!summary.runner.active && summary.runner.exitCode !== null
                  ? ` (exit ${summary.runner.exitCode})`
                  : ''}
              </span>
              <span className="ui-status-hover">
                Command: {summary.runner.command ?? 'none'}<br />
                Start: {summary.runner.startedAt ? isoToLocal(summary.runner.startedAt) : 'n/a'}
                <br />
                End: {summary.runner.finishedAt ? isoToLocal(summary.runner.finishedAt) : 'n/a'}
                <br />
                Click to expand runner log
              </span>
            </button>
            <button
              type="button"
              className={`ui-status-chip ${summary.failures.length === 0 ? 'passed' : 'failed'}`}
              onClick={() => setActiveSection('screenshots')}
            >
              <span>
                Screenshot diffs: {summary.failures.length}
              </span>
              <span className="ui-status-hover">
                Open Screenshots gallery
              </span>
            </button>
          </section>

          <div className="ui-regression-section-tabs" role="tablist" aria-label="Regression sections">
            <button
              type="button"
              role="tab"
              aria-selected={activeSection === 'screenshots'}
              className={`ui-tab-btn ${activeSection === 'screenshots' ? 'active' : ''}`}
              onClick={() => setActiveSection('screenshots')}
            >
              Screenshots
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeSection === 'report'}
              className={`ui-tab-btn ${activeSection === 'report' ? 'active' : ''}`}
              onClick={() => setActiveSection('report')}
            >
              Report
            </button>
          </div>

          {activeSection === 'screenshots' ? (
            <section className="ui-regression-card">
              <h3>Screenshots</h3>
              <p className="ui-regression-note">
                {summary.visual.count} routes · Summary {isoToLocal(summary.generatedAt)}
                {summary.visual.snapshotDirAbsolute ? (
                  <>
                    <br />
                    <small>Baseline folder: {summary.visual.snapshotDirAbsolute}</small>
                  </>
                ) : null}
              </p>
              <p className="ui-regression-note">
                When a route matches the baseline, only the baseline image is shown. When Playwright reports a
                difference, baseline, latest, and diff appear with actions. Dev-only: <code>__regression/*</code> middleware
                (not <code>vite preview</code>).
              </p>

              <div className="ui-regression-chip-groups" aria-label="Filter screenshots">
                <div className="ui-regression-chip-group">
                  <span className="ui-regression-chip-label">App</span>
                  <button
                    type="button"
                    className={`ui-regression-chip ${selectedApps.length === 0 ? 'is-selected' : ''}`}
                    onClick={() => toggleChip('app', '__all__')}
                  >
                    All
                  </button>
                  {appOptions.map((app) => (
                    <button
                      key={`app-${app}`}
                      type="button"
                      className={`ui-regression-chip ${selectedApps.includes(app) ? 'is-selected' : ''}`}
                      onClick={() => toggleChip('app', app)}
                    >
                      {app}
                    </button>
                  ))}
                </div>
                <div className="ui-regression-chip-group">
                  <span className="ui-regression-chip-label">Form</span>
                  <button
                    type="button"
                    className={`ui-regression-chip ${selectedForms.length === 0 ? 'is-selected' : ''}`}
                    onClick={() => toggleChip('form', '__all__')}
                  >
                    All
                  </button>
                  {formOptions.map((form) => (
                    <button
                      key={`form-${form}`}
                      type="button"
                      className={`ui-regression-chip ${selectedForms.includes(form) ? 'is-selected' : ''}`}
                      onClick={() => toggleChip('form', form)}
                    >
                      {form}
                    </button>
                  ))}
                </div>
                <div className="ui-regression-chip-group">
                  <span className="ui-regression-chip-label">Platform</span>
                  <button
                    type="button"
                    className={`ui-regression-chip ${selectedPlatforms.length === 0 ? 'is-selected' : ''}`}
                    onClick={() => toggleChip('platform', '__all__')}
                  >
                    All
                  </button>
                  {platformOptions.map((p) => (
                    <button
                      key={`platform-${p}`}
                      type="button"
                      className={`ui-regression-chip ${selectedPlatforms.includes(p) ? 'is-selected' : ''}`}
                      onClick={() => toggleChip('platform', p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ui-regression-screenshot-grid ui-regression-screenshot-grid--merged">
                {filteredSnapshots.map((snapshot, index) => {
                  const failure = failureBySnapshotName.get(snapshot.name);
                  const baselineSrc = withBaselineImageCacheBust(snapshot.url, summary.generatedAt, {
                    updatedAt: snapshot.updatedAt,
                    sizeBytes: snapshot.sizeBytes,
                  });

                  if (!failure) {
                    return (
                      <figure key={snapshot.name} className="ui-regression-shot ui-regression-shot--match">
                        <button
                          type="button"
                          className="ui-image-open-btn ui-regression-thumb"
                          onClick={() =>
                            openLightbox(
                              filteredSnapshots.map((item) => ({
                                label: item.name.replace('.png', ''),
                                src: withBaselineImageCacheBust(item.url, summary.generatedAt, {
                                  updatedAt: item.updatedAt,
                                  sizeBytes: item.sizeBytes,
                                }),
                              })),
                              index
                            )
                          }
                        >
                          <img
                            key={baselineSrc}
                            src={baselineSrc}
                            alt={snapshot.name}
                            loading="eager"
                            decoding="sync"
                          />
                        </button>
                        <figcaption>
                          <strong>{snapshot.name.replace('.png', '')}</strong>
                          <span>
                            Baseline · {bytesToLabel(snapshot.sizeBytes)} · {isoToLocal(snapshot.updatedAt)}
                          </span>
                          {visualPassed && visualLastRun?.finishedAt ? (
                            <small className="ui-regression-last-verify">
                              Last visual run: {isoToLocal(visualLastRun.finishedAt)}
                            </small>
                          ) : null}
                          <small>
                            {snapshot.appId} · {snapshot.formFactor} · {snapshot.platform}
                          </small>
                        </figcaption>
                      </figure>
                    );
                  }

                  const rowItems = [
                    { label: 'Baseline', src: failure.baselineAttachmentUrl ?? failure.baselineUrl },
                    { label: 'Latest', src: failure.actualUrl },
                    { label: 'Diff', src: failure.diffUrl },
                  ];
                  const rowBusted = rowItems.map((item) => ({
                    ...item,
                    src: withFailureImageCacheBust(item.src, summary.generatedAt, failure.id),
                  }));

                  return (
                    <article key={failure.id} className="ui-regression-shot ui-regression-shot--diff">
                      <header className="ui-regression-shot-diff-header">
                        <h4>{failure.snapshotName}</h4>
                        <small>
                          {failure.appId} · {failure.formFactor} · {failure.platform}
                        </small>
                      </header>
                      <div className="ui-regression-failure-grid">
                        {rowBusted.map((item, imgIndex) => (
                          <figure key={`${failure.id}-${item.label}`}>
                            <figcaption>
                              {item.label}
                              {item.label === 'Baseline' ? (
                                <span className="ui-regression-ts-caption">
                                  {isoToLocal(snapshot.updatedAt)}
                                </span>
                              ) : null}
                              {item.label === 'Latest' && failure.actualGeneratedAt ? (
                                <span className="ui-regression-ts-caption">
                                  {isoToLocal(failure.actualGeneratedAt)}
                                </span>
                              ) : null}
                              {item.label === 'Diff' && failure.diffGeneratedAt ? (
                                <span className="ui-regression-ts-caption">
                                  {isoToLocal(failure.diffGeneratedAt)}
                                </span>
                              ) : null}
                            </figcaption>
                            <button
                              type="button"
                              className="ui-image-open-btn ui-regression-thumb"
                              onClick={() => openLightbox(rowBusted, imgIndex)}
                            >
                              <img
                                key={item.src}
                                src={item.src}
                                alt={`${failure.snapshotName} ${item.label}`}
                                loading="eager"
                                decoding="sync"
                              />
                            </button>
                          </figure>
                        ))}
                      </div>
                      <div className="ui-regression-actions">
                        <button
                          type="button"
                          className="ui-demo-button ui-action-btn"
                          disabled={pendingAction !== null}
                          onClick={() => void acceptFailure(failure.id)}
                        >
                          {icon('done')}
                          <span>
                            {pendingAction === `accept:${failure.id}` ? 'Working...' : 'Accept current as baseline'}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="ui-demo-button ui-action-btn ui-regression-btn-primary"
                          disabled={pendingAction !== null}
                          onClick={() => void copyLlmPrompt(failure)}
                        >
                          {icon('content_copy')}
                          <span>
                            {copyPromptId === failure.id
                              ? 'Copied prompt'
                              : 'Report UI regression (copy LLM prompt)'}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="ui-demo-button ui-action-btn ui-regression-btn-ghost"
                          disabled={pendingAction !== null}
                          onClick={() => void rejectFailure(failure.id)}
                        >
                          {icon('save')}
                          <span>
                            {pendingAction === `reject:${failure.id}` ? 'Working...' : 'Save rejection report to disk'}
                          </span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              {summary.failures.length > 0 ? (
                <p className="ui-regression-note ui-regression-batch-report">
                  <button
                    type="button"
                    className="ui-demo-button ui-action-btn"
                    disabled={pendingAction !== null}
                    onClick={() => void generateFailureReport()}
                  >
                    {icon('description')}
                    <span>
                      {pendingAction === 'failure-report' ? 'Generating...' : 'Export batch summary for agents'}
                    </span>
                  </button>
                </p>
              ) : null}
            </section>
          ) : null}

          {activeSection === 'report' ? (
            <section className="ui-regression-card">
              <h3>Playwright HTML Report</h3>
              {summary.report.available ? (
                <iframe
                  className="ui-regression-report-frame"
                  src={summary.report.url}
                  title="Playwright Regression Report"
                />
              ) : (
                <p className="ui-regression-note">
                  No local report found yet. Run screenshot tests once, then reload this page (summary updates when the
                  runner finishes).
                </p>
              )}
            </section>
          ) : null}
        </>
      ) : null}

      {lightboxItems ? (
        <div className="ui-lightbox-backdrop" onClick={() => setLightboxItems(null)}>
          <div className="ui-lightbox-shell" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="ui-lightbox-close"
              onClick={() => setLightboxItems(null)}
            >
              {icon('close')}
            </button>
            <button
              type="button"
              className="ui-lightbox-nav left"
              onClick={() => setLightboxIndex((prev) => (prev - 1 + lightboxItems.length) % lightboxItems.length)}
            >
              {icon('chevron_left')}
            </button>
            <img
              key={lightboxItems[lightboxIndex].src}
              src={lightboxItems[lightboxIndex].src}
              alt={lightboxItems[lightboxIndex].label}
              decoding="sync"
            />
            <button
              type="button"
              className="ui-lightbox-nav right"
              onClick={() => setLightboxIndex((prev) => (prev + 1) % lightboxItems.length)}
            >
              {icon('chevron_right')}
            </button>
            <p className="ui-lightbox-label">
              {lightboxItems[lightboxIndex].label} ({lightboxIndex + 1}/{lightboxItems.length})
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
