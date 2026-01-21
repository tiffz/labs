import { forwardRef } from 'react';
import type { ParsedRhythm, TimeSignature } from '../types';
import VexFlowRenderer, { type NoteSelectionState } from './VexFlowRenderer';
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
  /** Current selection state */
  selection?: NoteSelectionState | null;
  /** Callback when selection changes */
  onSelectionChange?: (start: number | null, end: number | null, duration: number) => void;
  /** Callback when selection is dragged to a new position */
  onMoveSelection?: (fromStart: number, fromEnd: number, toPosition: number) => void;
  /** Callback when delete key is pressed on selection */
  onDeleteSelection?: () => void;
  /** Callback to request focus on the note palette */
  onRequestPaletteFocus?: () => void;
}

const RhythmDisplay = forwardRef<HTMLDivElement, RhythmDisplayProps>(({
  rhythm,
  currentNote,
  metronomeEnabled = false,
  currentMetronomeBeat = null,
  onDropPattern,
  dragDropMode = 'replace',
  notation = '',
  timeSignature,
  selection = null,
  onSelectionChange,
  onMoveSelection,
  onDeleteSelection,
  onRequestPaletteFocus,
}, ref) => {
  const { measures, isValid, error } = rhythm;

  if (measures.length === 0) {
    return (
      <div ref={ref} style={{ marginBottom: '1rem' }}>
        <CollapsibleSection title="Note Display" defaultExpanded={true}>
          <div className="empty-state">
            <div className="empty-state-icon">🥁</div>
            <div className="empty-state-text">
              Create a rhythm using the note palette or the rhythm notation input above.
            </div>
          </div>
        </CollapsibleSection>
      </div>
    );
  }

  return (
    <div ref={ref} style={{ marginBottom: '1rem' }}>
      <CollapsibleSection title="Note Display" defaultExpanded={true}>
        {!isValid && error && (
          <div className="error-message">
            <div className="error-message-title">Invalid Rhythm</div>
            <div>{error}</div>
          </div>
        )}

        <div className="staff-container" style={{ minHeight: '150px' }}>
          <VexFlowRenderer
            rhythm={rhythm}
            currentNote={currentNote}
            metronomeEnabled={metronomeEnabled}
            currentMetronomeBeat={currentMetronomeBeat}
            onDropPattern={onDropPattern}
            dragDropMode={dragDropMode}
            notation={notation}
            timeSignature={timeSignature}
            selection={selection}
            onSelectionChange={onSelectionChange}
            onMoveSelection={onMoveSelection}
            onDeleteSelection={onDeleteSelection}
            onRequestPaletteFocus={onRequestPaletteFocus}
          />
        </div>
      </CollapsibleSection>
    </div>
  );
});

RhythmDisplay.displayName = 'RhythmDisplay';

export default RhythmDisplay;

