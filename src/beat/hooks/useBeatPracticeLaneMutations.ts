import { useCallback } from 'react';
import { createUserLane } from '../utils/practiceSections';
import type { LaneSection } from '../utils/practiceSections';
import type { Section } from '../utils/sectionDetector';
import type { UserPracticeLane } from '../types/library';

export function useBeatPracticeLaneMutations(params: {
  practiceLanes: UserPracticeLane[];
  userSections: LaneSection[];
  activeLaneId: string | null;
  analysisSections: Section[];
  setPracticeLanes: React.Dispatch<React.SetStateAction<UserPracticeLane[]>>;
  setUserSections: React.Dispatch<React.SetStateAction<LaneSection[]>>;
  setActiveLaneId: React.Dispatch<React.SetStateAction<string | null>>;
  pushPracticeHistory: () => void;
}) {
  const {
    practiceLanes,
    userSections,
    activeLaneId,
    analysisSections,
    setPracticeLanes,
    setUserSections,
    setActiveLaneId,
    pushPracticeHistory,
  } = params;

  const createManualSection = useCallback(
    (startTime: number, endTime: number, laneId?: string) => {
      if (endTime <= startTime) return;
      const targetLaneId = laneId ?? activeLaneId ?? practiceLanes[0]?.id;
      if (!targetLaneId) return;
      pushPracticeHistory();
      setUserSections((prev) => [
        ...prev,
        {
          id: `user-${crypto.randomUUID()}`,
          startTime,
          endTime,
          label: `Section ${prev.length + 1}`,
          laneId: targetLaneId,
          color: '#7eb5c4',
          confidence: 1,
        },
      ]);
    },
    [activeLaneId, practiceLanes, pushPracticeHistory, setUserSections]
  );

  const createPracticeLane = useCallback(
    (name?: string) => {
      const laneName = name?.trim() ? name.trim() : `Lane ${practiceLanes.length + 1}`;
      const lane = createUserLane(laneName);
      pushPracticeHistory();
      setPracticeLanes((prev) => [...prev, lane]);
      setActiveLaneId(lane.id);
      return lane;
    },
    [practiceLanes.length, pushPracticeHistory, setActiveLaneId, setPracticeLanes]
  );

  const renamePracticeLane = useCallback(
    (laneId: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const existing = practiceLanes.find((lane) => lane.id === laneId);
      if (!existing || existing.name === trimmed) return;
      pushPracticeHistory();
      setPracticeLanes((prev) =>
        prev.map((lane) => (lane.id === laneId ? { ...lane, name: trimmed } : lane))
      );
    },
    [practiceLanes, pushPracticeHistory, setPracticeLanes]
  );

  const deletePracticeLane = useCallback(
    (laneId: string) => {
      pushPracticeHistory();
      setUserSections((prev) => prev.filter((section) => section.laneId !== laneId));
      setPracticeLanes((prev) => {
        const remaining = prev.filter((lane) => lane.id !== laneId);
        if (remaining.length === 0) {
          const fallback = createUserLane('Lane 1');
          setActiveLaneId(fallback.id);
          return [fallback];
        }
        if (activeLaneId === laneId) {
          setActiveLaneId(remaining[0].id);
        }
        return remaining;
      });
    },
    [
      activeLaneId,
      pushPracticeHistory,
      setActiveLaneId,
      setPracticeLanes,
      setUserSections,
    ]
  );

  const cloneGeneratedLane = useCallback(() => {
    if (analysisSections.length === 0) return;
    pushPracticeHistory();
    const lane = createPracticeLane(`Generated Copy ${practiceLanes.length + 1}`);
    setUserSections((prev) => [
      ...prev,
      ...analysisSections.map((section, index) => ({
        ...section,
        id: `user-${crypto.randomUUID()}`,
        label: `Section ${prev.length + index + 1}`,
        laneId: lane.id,
        color: '#7eb5c4',
      })),
    ]);
  }, [
    analysisSections,
    createPracticeLane,
    practiceLanes.length,
    pushPracticeHistory,
    setUserSections,
  ]);

  const clonePracticeLane = useCallback(
    (laneId: string) => {
      const sourceLane = practiceLanes.find((lane) => lane.id === laneId);
      if (!sourceLane) return;
      pushPracticeHistory();
      const sourceSections = userSections.filter((section) => section.laneId === laneId);
      const lane = createPracticeLane(`${sourceLane.name} Copy`);
      setUserSections((prev) => [
        ...prev,
        ...sourceSections.map((section, index) => ({
          ...section,
          id: `section-${crypto.randomUUID()}`,
          label: `Section ${index + 1}`,
          laneId: lane.id,
        })),
      ]);
      setActiveLaneId(lane.id);
    },
    [
      createPracticeLane,
      practiceLanes,
      pushPracticeHistory,
      setActiveLaneId,
      setUserSections,
      userSections,
    ]
  );

  const renamePracticeSection = useCallback(
    (sectionId: string, label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      const existing = userSections.find((section) => section.id === sectionId);
      if (!existing || existing.label === trimmed) return;
      pushPracticeHistory();
      setUserSections((prev) =>
        prev.map((section) => (section.id === sectionId ? { ...section, label: trimmed } : section))
      );
    },
    [pushPracticeHistory, setUserSections, userSections]
  );

  return {
    createManualSection,
    createPracticeLane,
    renamePracticeLane,
    deletePracticeLane,
    cloneGeneratedLane,
    clonePracticeLane,
    renamePracticeSection,
  };
}
