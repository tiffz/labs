import React, { useState, useMemo } from 'react';
import {
  getAllRecords,
  getTotalPracticeTime,
  getPracticeStreak,
  getTimingAnalysis,
  getKeyProficiency,
  getRecommendations,
  type PracticeRecord,
} from '../utils/practiceHistory';

const ALL_KEYS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];

function formatMs(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(mins / 60);
  if (hours > 0) return `${hours}h ${mins % 60}m`;
  return `${mins}m`;
}

const TimingBar: React.FC<{ label: string; pct: number; color: string }> = ({ label, pct, color }) => (
  <div className="analytics-timing-row">
    <span className="analytics-timing-label">{label}</span>
    <div className="analytics-timing-bar">
      <div className="analytics-timing-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
    <span className="analytics-timing-pct">{pct}%</span>
  </div>
);

const Analytics: React.FC = () => {
  const [period, setPeriod] = useState<'all' | 'week' | 'month'>('week');

  const records = useMemo(() => getAllRecords(), []);
  const since = period === 'week' ? Date.now() - 7 * 86400000
    : period === 'month' ? Date.now() - 30 * 86400000
    : 0;
  const filteredRecords = useMemo(() => since ? records.filter(r => r.timestamp >= since) : records, [records, since]);

  const totalTime = useMemo(() => getTotalPracticeTime(since || undefined), [since]);
  const streak = useMemo(() => getPracticeStreak(), []);
  const timing = useMemo(() => getTimingAnalysis(), []);
  const keyProf = useMemo(() => getKeyProficiency(), []);
  const recs = useMemo(() => getRecommendations(records), [records]);

  const piecesCount = useMemo(() => new Set(filteredRecords.map(r => r.scoreId)).size, [filteredRecords]);
  const avgAccuracy = useMemo(() => {
    if (filteredRecords.length === 0) return 0;
    return Math.round(filteredRecords.reduce((s, r) => s + r.averageAccuracy, 0) / filteredRecords.length);
  }, [filteredRecords]);

  if (records.length === 0) {
    return (
      <div className="analytics-empty">
        <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#cbd5e1' }}>insights</span>
        <p>No practice data yet</p>
        <p className="analytics-empty-hint">Complete some practice sessions to see your analytics here.</p>
      </div>
    );
  }

  return (
    <div className="analytics">
      <div className="analytics-period-tabs">
        {(['week', 'month', 'all'] as const).map(p => (
          <button key={p} className={`analytics-period-btn ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>
            {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'All Time'}
          </button>
        ))}
      </div>

      <div className="analytics-stats-grid">
        <div className="analytics-stat">
          <div className="analytics-stat-value">{formatMs(totalTime)}</div>
          <div className="analytics-stat-label">Practice Time</div>
        </div>
        <div className="analytics-stat">
          <div className="analytics-stat-value">{streak}</div>
          <div className="analytics-stat-label">Day Streak</div>
        </div>
        <div className="analytics-stat">
          <div className="analytics-stat-value">{piecesCount}</div>
          <div className="analytics-stat-label">Pieces Practiced</div>
        </div>
        <div className="analytics-stat">
          <div className="analytics-stat-value">{avgAccuracy}%</div>
          <div className="analytics-stat-label">Avg Accuracy</div>
        </div>
      </div>

      <div className="analytics-section">
        <h3 className="analytics-section-title">Timing Breakdown</h3>
        <TimingBar label="Perfect" pct={timing.perfectPct} color="#22c55e" />
        <TimingBar label="Early" pct={timing.earlyPct} color="#3b82f6" />
        <TimingBar label="Late" pct={timing.latePct} color="#ef4444" />
        <TimingBar label="Wrong pitch" pct={timing.wrongPitchPct} color="#f59e0b" />
        <TimingBar label="Missed" pct={timing.missedPct} color="#94a3b8" />
      </div>

      <div className="analytics-section">
        <h3 className="analytics-section-title">Key Proficiency</h3>
        <div className="analytics-key-grid">
          {ALL_KEYS.filter(k => keyProf.has(k)).map(k => {
            const data = keyProf.get(k)!;
            const hue = data.avgAccuracy > 80 ? 120 : data.avgAccuracy > 60 ? 60 : 0;
            return (
              <div key={k} className="analytics-key-cell" style={{ background: `hsl(${hue}, 60%, 90%)` }}>
                <div className="analytics-key-name">{k}</div>
                <div className="analytics-key-acc">{data.avgAccuracy}%</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="analytics-section">
        <h3 className="analytics-section-title">Recommendations</h3>
        <div className="analytics-recs">
          {recs.map((rec, i) => (
            <div key={i} className="analytics-rec">
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#7c3aed' }}>lightbulb</span>
              {rec}
            </div>
          ))}
        </div>
      </div>

      <div className="analytics-section">
        <h3 className="analytics-section-title">Recent Sessions</h3>
        <div className="analytics-sessions">
          {filteredRecords.slice(0, 20).map((r: PracticeRecord) => (
            <div key={r.id} className="analytics-session-row">
              <div className="analytics-session-title">{r.scoreTitle}</div>
              <div className="analytics-session-meta">
                {new Date(r.timestamp).toLocaleDateString()} · {r.tempo} BPM · {r.runs.length} runs · {Math.round(r.averageAccuracy)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
