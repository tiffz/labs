import React from 'react';
import type { ParsedRhythm } from '../types';
import VexFlowRenderer from './VexFlowRenderer';

interface RhythmDisplayProps {
  rhythm: ParsedRhythm;
  currentNote?: { measureIndex: number; noteIndex: number } | null;
  metronomeEnabled?: boolean;
  currentMetronomeBeat?: { measureIndex: number; positionInSixteenths: number; isDownbeat: boolean } | null;
}

const RhythmDisplay: React.FC<RhythmDisplayProps> = ({ 
  rhythm, 
  currentNote, 
  metronomeEnabled = false,
  currentMetronomeBeat = null 
}) => {
  const { measures, isValid, error } = rhythm;

  if (measures.length === 0) {
    return (
      <div className="rhythm-display">
        <div className="empty-state">
          <div className="empty-state-icon">🥁</div>
          <div className="empty-state-text">
            Create a rhythm using the note palette or the rhythm notation input above.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rhythm-display">
      {!isValid && error && (
        <div className="error-message">
          <div className="error-message-title">Invalid Rhythm</div>
          <div>{error}</div>
        </div>
      )}

      <div className="staff-container">
        <VexFlowRenderer 
          rhythm={rhythm} 
          currentNote={currentNote}
          metronomeEnabled={metronomeEnabled}
          currentMetronomeBeat={currentMetronomeBeat}
        />
      </div>
    </div>
  );
};

export default RhythmDisplay;

