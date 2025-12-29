import React from 'react';
import type { ParsedRhythm, TimeSignature } from '../types';
import VexFlowRenderer from './VexFlowRenderer';
import CollapsibleSection from './CollapsibleSection';

interface RhythmDisplayProps {
  rhythm: ParsedRhythm;
  currentNote?: { measureIndex: number; noteIndex: number } | null;
  metronomeEnabled?: boolean;
  currentMetronomeBeat?: { measureIndex: number; positionInSixteenths: number; isDownbeat: boolean } | null;
  onDropPattern?: (pattern: string, charPosition: number) => void;
  dragDropMode?: 'replace' | 'insert';
  notation?: string;
  timeSignature?: TimeSignature;
}

const RhythmDisplay: React.FC<RhythmDisplayProps> = ({ 
  rhythm, 
  currentNote, 
  metronomeEnabled = false,
  currentMetronomeBeat = null,
  onDropPattern,
  dragDropMode = 'replace',
  notation = '',
  timeSignature,
}) => {
  const { measures, isValid, error } = rhythm;

  if (measures.length === 0) {
    return (
      <CollapsibleSection title="Note Display" defaultExpanded={true}>
        <div className="empty-state">
          <div className="empty-state-icon">🥁</div>
          <div className="empty-state-text">
            Create a rhythm using the note palette or the rhythm notation input above.
          </div>
        </div>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection title="Note Display" defaultExpanded={true}>
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
          onDropPattern={onDropPattern}
          dragDropMode={dragDropMode}
          notation={notation}
          timeSignature={timeSignature}
        />
      </div>
    </CollapsibleSection>
  );
};

export default RhythmDisplay;

