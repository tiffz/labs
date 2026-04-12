interface QuietCountProps {
  enabled: boolean;
  playBars: number;
  silentBars: number;
  onToggle: (enabled: boolean) => void;
  onPlayBarsChange: (bars: number) => void;
  onSilentBarsChange: (bars: number) => void;
  reEntryScore: number | null;
}

export function QuietCount({
  enabled,
  playBars,
  silentBars,
  onToggle,
  onPlayBarsChange,
  onSilentBarsChange,
  reEntryScore,
}: QuietCountProps) {
  return (
    <div className="pulse-quiet">
      <div className="pulse-quiet-header">
        <span className="pulse-quiet-title">GAP CLICK (QUIET COUNT)</span>
        <button
          className={`pulse-quiet-toggle ${enabled ? 'is-active' : ''}`}
          onClick={() => onToggle(!enabled)}
          type="button"
        >
          {enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {enabled && (
        <>
          <div className="pulse-quiet-config">
            <div className="pulse-quiet-field">
              <span className="pulse-quiet-label">PLAY</span>
              <input
                className="pulse-quiet-input"
                type="number"
                min={1}
                max={32}
                value={playBars}
                onChange={(e) =>
                  onPlayBarsChange(Math.max(1, parseInt(e.target.value, 10) || 1))
                }
                aria-label="Play bars"
              />
              <span className="pulse-quiet-label">BARS</span>
            </div>
            <div className="pulse-quiet-field">
              <span className="pulse-quiet-label">SILENT</span>
              <input
                className="pulse-quiet-input"
                type="number"
                min={1}
                max={32}
                value={silentBars}
                onChange={(e) =>
                  onSilentBarsChange(Math.max(1, parseInt(e.target.value, 10) || 1))
                }
                aria-label="Silent bars"
              />
              <span className="pulse-quiet-label">BARS</span>
            </div>
          </div>
          {reEntryScore !== null && (
            <div className="pulse-quiet-score">
              RE-ENTRY SCORE: {reEntryScore >= 0 ? '+' : ''}
              {reEntryScore.toFixed(1)} ms
            </div>
          )}
        </>
      )}
    </div>
  );
}
