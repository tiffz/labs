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
        <VexFlowRenderer rhythm={rhythm} />
      </div>

      <div className="notation-legend">
        <div className="legend-item">
          <svg width="20" height="26" viewBox="-2 -10 16 30" className="legend-svg">
            <path 
              d="M 6 -7 Q -2 -7, -2 0 Q -2 7, 6 7 L 6 13" 
              stroke="black" 
              strokeWidth="2.5" 
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="legend-label">Dum (D)</span>
        </div>
        <div className="legend-item">
          <svg width="16" height="16" viewBox="-8 -8 16 16" className="legend-svg">
            <path 
              d="M -6 6 L 0 -6 L 6 6" 
              stroke="black" 
              strokeWidth="2.5" 
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="miter"
            />
          </svg>
          <span className="legend-label">Tak (T)</span>
        </div>
        <div className="legend-item">
          <svg width="16" height="16" viewBox="-8 -8 16 16" className="legend-svg">
            <path 
              d="M -6 -6 L 0 6 L 6 -6" 
              stroke="black" 
              strokeWidth="2.5" 
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="miter"
            />
          </svg>
          <span className="legend-label">Ka (K)</span>
        </div>
        <span className="legend-separator">•</span>
        <span className="legend-attribution">
          Notation from <a href="https://www.amirschoolofmusic.com/store/p/pdf-mastering-darbuka-1" target="_blank" rel="noopener noreferrer">Mastering Darbuka</a> and <a href="https://en.wikipedia.org/wiki/Dumbek_rhythms#Notation" target="_blank" rel="noopener noreferrer">Dumbek rhythms</a>
        </span>
      </div>
    </div>
  );
};

export default RhythmDisplay;

