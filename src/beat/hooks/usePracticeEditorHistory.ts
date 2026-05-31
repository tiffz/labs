import { useCallback, useRef } from 'react';
import type { PracticeEditorSnapshot, LaneSection } from '../utils/practiceSections';
import type { UserPracticeLane } from '../types/library';

const MAX_PRACTICE_HISTORY = 80;

export function usePracticeEditorHistory(params: {
  practiceLanes: UserPracticeLane[];
  userSections: LaneSection[];
  activeLaneId: string | null;
  setPracticeLanes: React.Dispatch<React.SetStateAction<UserPracticeLane[]>>;
  setUserSections: React.Dispatch<React.SetStateAction<LaneSection[]>>;
  setActiveLaneId: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const {
    practiceLanes,
    userSections,
    activeLaneId,
    setPracticeLanes,
    setUserSections,
    setActiveLaneId,
  } = params;

  const historyPastRef = useRef<PracticeEditorSnapshot[]>([]);
  const historyFutureRef = useRef<PracticeEditorSnapshot[]>([]);
  const isApplyingHistoryRef = useRef(false);

  const capturePracticeSnapshot = useCallback((): PracticeEditorSnapshot => ({
    lanes: practiceLanes.map((lane) => ({ ...lane })),
    sections: userSections.map((section) => ({ ...section })),
    activeLaneId,
  }), [activeLaneId, practiceLanes, userSections]);

  const pushPracticeHistory = useCallback(() => {
    if (isApplyingHistoryRef.current) return;
    const snapshot = capturePracticeSnapshot();
    historyPastRef.current = [...historyPastRef.current.slice(-(MAX_PRACTICE_HISTORY - 1)), snapshot];
    historyFutureRef.current = [];
  }, [capturePracticeSnapshot]);

  const applyPracticeSnapshot = useCallback((snapshot: PracticeEditorSnapshot) => {
    isApplyingHistoryRef.current = true;
    setPracticeLanes(snapshot.lanes.map((lane) => ({ ...lane })));
    setUserSections(snapshot.sections.map((section) => ({ ...section })));
    setActiveLaneId(snapshot.activeLaneId);
    window.setTimeout(() => {
      isApplyingHistoryRef.current = false;
    }, 0);
  }, [setActiveLaneId, setPracticeLanes, setUserSections]);

  const undoPracticeEdit = useCallback(() => {
    const previous = historyPastRef.current[historyPastRef.current.length - 1];
    if (!previous) return;
    const current = capturePracticeSnapshot();
    historyPastRef.current = historyPastRef.current.slice(0, -1);
    historyFutureRef.current = [...historyFutureRef.current, current];
    applyPracticeSnapshot(previous);
  }, [applyPracticeSnapshot, capturePracticeSnapshot]);

  const redoPracticeEdit = useCallback(() => {
    const next = historyFutureRef.current[historyFutureRef.current.length - 1];
    if (!next) return;
    const current = capturePracticeSnapshot();
    historyFutureRef.current = historyFutureRef.current.slice(0, -1);
    historyPastRef.current = [...historyPastRef.current.slice(-(MAX_PRACTICE_HISTORY - 1)), current];
    applyPracticeSnapshot(next);
  }, [applyPracticeSnapshot, capturePracticeSnapshot]);

  return {
    pushPracticeHistory,
    undoPracticeEdit,
    redoPracticeEdit,
    isApplyingHistoryRef,
  };
}
