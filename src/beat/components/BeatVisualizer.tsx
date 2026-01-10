import React from 'react';
import type { TimeSignature } from '../../shared/rhythm/types';

interface BeatVisualizerProps {
  timeSignature: TimeSignature;
  currentBeat: number; // 0-indexed beat within measure
  progress: number; // 0-1 progress within current beat
  compact?: boolean; // Smaller version for inline display
}

const BeatVisualizer: React.FC<BeatVisualizerProps> = ({
  timeSignature,
  currentBeat,
  progress,
  compact = false,
}) => {
  const numBeats = timeSignature.numerator;
  const beats = Array.from({ length: numBeats }, (_, i) => i);
  const measureProgress = (currentBeat + progress) / numBeats;

  if (compact) {
    return (
      <div className="beat-visualizer compact">
        <div className="beat-counts">
          {beats.map(beat => (
            <div
              key={beat}
              className={`beat-count ${currentBeat === beat ? 'active' : ''} ${beat === 0 ? 'downbeat' : ''}`}
            >
              {beat + 1}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="beat-visualizer">
      {/* Beat count numbers */}
      <div className="beat-counts">
        {beats.map(beat => (
          <div
            key={beat}
            className={`beat-count ${currentBeat === beat ? 'active' : ''} ${beat === 0 ? 'downbeat' : ''}`}
          >
            {beat + 1}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="beat-progress">
        <div
          className="beat-progress-fill"
          style={{ width: `${measureProgress * 100}%` }}
        />
      </div>
    </div>
  );
};

export default BeatVisualizer;
