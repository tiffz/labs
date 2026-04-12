interface TimingGaugeProps {
  lastDelta: number | null;
  averageDelta: number | null;
  isListening: boolean;
  onToggleListening: () => void;
}

const RANGE_MS = 50;

function deltaToPercent(delta: number): number {
  const clamped = Math.max(-RANGE_MS, Math.min(RANGE_MS, delta));
  return 50 + (clamped / RANGE_MS) * 50;
}

function deltaColor(delta: number | null): string {
  if (delta === null) return '';
  const abs = Math.abs(delta);
  if (abs <= 15) return '';
  if (abs <= 30) return 'is-warn';
  return 'is-bad';
}

function formatDelta(delta: number | null): string {
  if (delta === null) return '-- ms';
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)} ms`;
}

export function TimingGauge({
  lastDelta,
  averageDelta,
  isListening,
  onToggleListening,
}: TimingGaugeProps) {
  return (
    <div className="pulse-timing">
      <div className="pulse-timing-header">
        <span className="pulse-timing-title">TIMING GAUGE</span>
        <button
          className={`pulse-listen-btn ${isListening ? 'is-active' : ''}`}
          onClick={onToggleListening}
          type="button"
        >
          {isListening ? 'LISTENING' : 'MIC / MIDI'}
        </button>
      </div>

      <div className="pulse-gauge-track">
        <div className="pulse-gauge-center" />
        {averageDelta !== null && (
          <div
            className="pulse-gauge-avg"
            style={{ left: `${deltaToPercent(averageDelta)}%` }}
          />
        )}
        {lastDelta !== null && (
          <div
            className={`pulse-gauge-needle ${deltaColor(lastDelta)}`}
            style={{ left: `${deltaToPercent(lastDelta)}%` }}
          />
        )}
      </div>

      <div className="pulse-gauge-labels">
        <span className="pulse-gauge-label">-{RANGE_MS}ms AHEAD</span>
        <span className="pulse-gauge-label">0</span>
        <span className="pulse-gauge-label">+{RANGE_MS}ms BEHIND</span>
      </div>

      <div
        className="pulse-gauge-delta"
        style={{
          color:
            lastDelta === null
              ? 'var(--pulse-text-dim)'
              : Math.abs(lastDelta) <= 15
                ? 'var(--pulse-accent)'
                : Math.abs(lastDelta) <= 30
                  ? 'var(--pulse-warn)'
                  : 'var(--pulse-danger)',
        }}
      >
        {formatDelta(lastDelta)}
      </div>
    </div>
  );
}
