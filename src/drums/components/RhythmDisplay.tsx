import React from 'react';
import type { ParsedRhythm } from '../types';
import VexFlowRenderer from './VexFlowRenderer';

interface RhythmDisplayProps {
  rhythm: ParsedRhythm;
}

const RhythmDisplay: React.FC<RhythmDisplayProps> = ({ rhythm }) => {
  const { measures, isValid, error } = rhythm;

  if (measures.length === 0) {
    return (
      <div className="rhythm-display">
        <div className="empty-state">
          <div className="empty-state-icon">🥁</div>
          <div className="empty-state-text">
            Enter a rhythm notation above to see it displayed here
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rhythm-display">
      <div className="rhythm-display-header">
        <h2 className="rhythm-display-title">Rhythm Notation</h2>
      </div>

      {!isValid && error && (
        <div className="error-message">
          <div className="error-message-title">Invalid Rhythm</div>
          <div>{error}</div>
        </div>
      )}

      <div className="staff-container">
        <VexFlowRenderer rhythm={rhythm} />
      </div>

      <div className="notation-legend">
        <h3 className="legend-title">Symbol Legend:</h3>
        <div className="legend-items">
          <div className="legend-item">
            <svg width="16" height="24" viewBox="0 0 16 24" className="legend-svg">
              <path 
                d="M 14 5 Q 6 5, 6 12 Q 6 19, 14 19 L 14 25" 
                stroke="black" 
                strokeWidth="2.5" 
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="legend-label">Dum (bass sound) - use D in notation</span>
          </div>
          <div className="legend-item">
            <svg width="16" height="16" viewBox="0 0 16 16" className="legend-svg">
              <path 
                d="M 2 14 L 8 2 L 14 14" 
                stroke="black" 
                strokeWidth="2.5" 
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="miter"
              />
            </svg>
            <span className="legend-label">Tak (high sound) - use T in notation</span>
          </div>
          <div className="legend-item">
            <svg width="16" height="16" viewBox="0 0 16 16" className="legend-svg">
              <path 
                d="M 2 2 L 8 14 L 14 2" 
                stroke="black" 
                strokeWidth="2.5" 
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="miter"
              />
            </svg>
            <span className="legend-label">Ka (high sound) - use K in notation</span>
          </div>
          <div className="legend-item">
            <span className="legend-symbol">𝄽</span>
            <span className="legend-label">Rest (silence) - use . in notation</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RhythmDisplay;

