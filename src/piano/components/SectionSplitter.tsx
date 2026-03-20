import { useCallback } from 'react';
import { usePiano, type ScoreSection } from '../store';

export default function SectionSplitter() {
  const { state, dispatch } = usePiano();
  const source = state.fullScore ?? state.score;
  if (!source) return null;
  if (state.sections.length === 0 && !state.selectedMeasureRange) return null;

  return <PracticeSectionsUI
    sections={state.sections}
    activeSectionIndex={state.activeSectionIndex}
    selectedMeasureRange={state.selectedMeasureRange}
    dispatch={dispatch}
  />;
}

interface UIProps {
  sections: ScoreSection[];
  activeSectionIndex: number | null;
  selectedMeasureRange: { start: number; end: number } | null;
  dispatch: ReturnType<typeof usePiano>['dispatch'];
}

function PracticeSectionsUI({ sections, activeSectionIndex, selectedMeasureRange, dispatch }: UIProps) {
  const loadSection = useCallback((idx: number) => {
    dispatch({ type: 'LOAD_SECTION', index: idx });
  }, [dispatch]);

  const removeSection = useCallback((idx: number) => {
    const next = sections.filter((_, i) => i !== idx);
    dispatch({ type: 'SET_SECTIONS', sections: next });
  }, [sections, dispatch]);

  const loadAll = useCallback(() => {
    dispatch({ type: 'CLEAR_SECTIONS' });
  }, [dispatch]);

  const saveSelection = useCallback(() => {
    if (!selectedMeasureRange) return;
    const name = `Measures ${selectedMeasureRange.start + 1}–${selectedMeasureRange.end + 1}`;
    const newSection: ScoreSection = {
      name,
      startMeasure: selectedMeasureRange.start,
      endMeasure: selectedMeasureRange.end,
    };
    const sorted = [...sections, newSection].sort((a, b) => a.startMeasure - b.startMeasure);
    dispatch({ type: 'SET_SECTIONS', sections: sorted });
    dispatch({ type: 'CLEAR_MEASURE_SELECTION' });
  }, [selectedMeasureRange, sections, dispatch]);

  const hasSections = sections.length > 0;

  return (
    <div className="practice-sections">
      {hasSections && (
        <>
          <div className="ps-header">
            <span className="ps-title">Practice sections</span>
            {activeSectionIndex !== null && (
              <button className="btn btn-small" onClick={loadAll} title="Load full score">
                Full Score
              </button>
            )}
          </div>
          <div className="ps-list">
            {sections.map((sec, i) => (
              <div
                key={i}
                className={`ps-item ${activeSectionIndex === i ? 'active' : ''}`}
                onClick={() => loadSection(i)}
              >
                <span className="ps-item-name">{sec.name}</span>
                <span className="ps-item-range">m. {sec.startMeasure + 1}–{sec.endMeasure + 1}</span>
                <button
                  className="ps-item-remove"
                  onClick={e => { e.stopPropagation(); removeSection(i); }}
                  title="Remove section"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {selectedMeasureRange && (
        <button className="btn btn-small ps-save-btn" onClick={saveSelection}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>bookmark_add</span>
          Save measures {selectedMeasureRange.start + 1}–{selectedMeasureRange.end + 1} as section
        </button>
      )}
    </div>
  );
}
