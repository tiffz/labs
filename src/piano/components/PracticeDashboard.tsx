import React from 'react';
import { usePiano } from '../store';
import type { PracticeNoteResult } from '../types';

function getTimingBreakdown(results: PracticeNoteResult[]) {
  let perfect = 0, early = 0, late = 0, wrongPitch = 0, missed = 0;
  for (const r of results) {
    switch (r.timing) {
      case 'perfect': perfect++; break;
      case 'early': early++; break;
      case 'late': late++; break;
      case 'wrong_pitch': wrongPitch++; break;
      case 'missed': missed++; break;
    }
  }
  return { perfect, early, late, wrongPitch, missed, total: results.length };
}

function TimingBar({ results }: { results: PracticeNoteResult[] }) {
  const b = getTimingBreakdown(results);
  if (b.total === 0) return null;
  const pctPerfect = (b.perfect / b.total) * 100;
  const pctEarly = (b.early / b.total) * 100;
  const pctLate = (b.late / b.total) * 100;
  const pctWrongPitch = (b.wrongPitch / b.total) * 100;
  const pctMissed = (b.missed / b.total) * 100;
  return (
    <div className="timing-bar" title={`${b.perfect} perfect, ${b.early} early, ${b.late} late, ${b.wrongPitch} wrong pitch, ${b.missed} missed`}>
      {pctPerfect > 0 && <div className="timing-seg perfect" style={{ width: `${pctPerfect}%` }} />}
      {pctEarly > 0 && <div className="timing-seg early" style={{ width: `${pctEarly}%` }} />}
      {pctLate > 0 && <div className="timing-seg late" style={{ width: `${pctLate}%` }} />}
      {pctWrongPitch > 0 && <div className="timing-seg wrong-pitch" style={{ width: `${pctWrongPitch}%` }} />}
      {pctMissed > 0 && <div className="timing-seg missed" style={{ width: `${pctMissed}%` }} />}
    </div>
  );
}

function TimingBreakdownDetail({ results, label }: { results: PracticeNoteResult[]; label: string }) {
  const b = getTimingBreakdown(results);
  if (b.total === 0) return <p className="no-results">{label}: No notes recorded</p>;
  return (
    <div className="timing-breakdown">
      <div className="breakdown-label">{label}</div>
      <div className="breakdown-grid">
        <span className="breakdown-item perfect">
          <span className="breakdown-dot" style={{ background: '#10b981' }} />
          {b.perfect} perfect
        </span>
        <span className="breakdown-item early">
          <span className="breakdown-dot" style={{ background: '#3b82f6' }} />
          {b.early} early
        </span>
        <span className="breakdown-item late">
          <span className="breakdown-dot" style={{ background: '#ef4444' }} />
          {b.late} late
        </span>
        <span className="breakdown-item wrong-pitch">
          <span className="breakdown-dot" style={{ background: '#f59e0b' }} />
          {b.wrongPitch} wrong pitch
        </span>
        <span className="breakdown-item missed">
          <span className="breakdown-dot" style={{ background: '#94a3b8' }} />
          {b.missed} missed
        </span>
      </div>
      <TimingBar results={results} />
    </div>
  );
}

const PracticeDashboard: React.FC = () => {
  const { state, dispatch } = usePiano();
  const session = state.practiceSession;

  if (!session || session.runs.length === 0) return null;

  const allResults = session.runs.flatMap(r => r.results);
  const recentRuns = session.runs.slice(-10);
  const avgAccuracy = Math.round(
    recentRuns.reduce((sum, r) => sum + r.accuracy, 0) / recentRuns.length
  );
  const bestRun = session.runs.reduce((best, r) => r.accuracy > best.accuracy ? r : best);

  return (
    <div className="practice-dashboard">
      <div className="dashboard-header">
        <span className="sb-section-title">Results</span>
        <button
          className="btn btn-small"
          onClick={() => dispatch({ type: 'CLEAR_SESSION' })}
          title="Clear results"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
        </button>
      </div>

      <div className="dashboard-stats">
        <div className="stat">
          <span className="stat-value">{session.runs.length}</span>
          <span className="stat-label">Runs</span>
        </div>
        <div className="stat">
          <span className="stat-value">{avgAccuracy}%</span>
          <span className="stat-label">Avg (10)</span>
        </div>
        <div className="stat">
          <span className="stat-value">{bestRun.accuracy}%</span>
          <span className="stat-label">Best</span>
        </div>
        <div className="stat">
          <span className="stat-value">{allResults.length}</span>
          <span className="stat-label">Notes</span>
        </div>
      </div>

      <TimingBreakdownDetail results={allResults} label="All runs" />

      <div className="dashboard-runs">
        {[...session.runs].reverse().map((run, ri) => {
          const i = session.runs.length - 1 - ri;
          const isViewing = state.viewingRunIndex === i;
          return (
            <div key={i} className={`run-accordion ${isViewing ? 'open' : ''}`}>
              <button
                className={`run-row ${isViewing ? 'viewing' : ''}`}
                onClick={() => dispatch({ type: 'SET_VIEWING_RUN', index: isViewing ? null : i })}
                title="Click to view this run's results in the score"
                type="button"
              >
                <span className="run-idx">#{i + 1}</span>
                <TimingBar results={run.results} />
                <span className="run-pct">{run.accuracy}%</span>
              </button>
              {isViewing && (
                <div className="run-detail">
                  <TimingBreakdownDetail results={run.results} label={`Run #${i + 1}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PracticeDashboard;
