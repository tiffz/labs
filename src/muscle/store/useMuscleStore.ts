import { create } from 'zustand';
import { getAnatomyTermById, getTermsGateIds, ANATOMY_TERM_LESSONS } from '../curriculum/anatomyTerms';
import { getNodeById, getNodesForRegion } from '../curriculum';
import { collectStudyGroupIdsForNode } from '../curriculum/resolveStudyGroupForNode';
import { getModuleById, MUSCLE_MODULES } from '../curriculum/modules';
import { getNodesForView } from '../layerDepthView';
import {
  loadAllProgress,
  loadModuleGuideProgress,
  loadQuizModePreference,
  saveModuleGuideProgress,
  saveProgress,
  saveQuizModePreference,
} from '../db/muscleDb';
import { buildDeckPlan, computeModuleMastery, pickQuizChoices } from '../srs/deckPlanner';
import { getModuleLockReason, isModuleUnlocked } from '../srs/gatekeeper';
import {
  applySm2Grade,
  createInitialProgress,
  qualityFromCorrect,
} from '../srs/sm2';
import type { LayerPeelDepth } from '../layerDepthView';
import { defaultLayerPeelForModule, isNodeVisibleAtPeelDepth } from '../layerDepthView';
import { autoFocusExploreSelection } from '../exploreSelection';
import { anatomySceneKey } from '../anatomy/anatomySceneKey';
import type { AnatomyStageFrame } from '../types/anatomyStageFrame';
import { DEFAULT_ANATOMY_STAGE_FRAME } from '../types/anatomyStageFrame';
import type {
  BodyView,
  CameraPreset,
  ModuleGuidePhase,
  ModuleGuideProgress,
  MuscleRegion,
  QuizMode,
  QuizState,
  WorkoutMode,
  WorkoutProgress,
} from '../types/node';

export interface MuscleStoreState {
  hydrated: boolean;
  saveError: string | null;
  mode: WorkoutMode;
  bodyView: BodyView;
  activeModuleId: MuscleRegion;
  selectedNodeId: string | null;
  focusedNodeId: string | null;
  focusedGroupNodeIds: string[] | null;
  showDetailStructures: boolean;
  showLandmarks: boolean;
  showAttachments: boolean;
  hoveredNodeId: string | null;
  /** Shown when the user hovers or taps the read-only reference half. */
  referenceHalfHint: 'idle' | 'hover' | 'pinned';
  layerPeelDepth: LayerPeelDepth;
  anatomyStageCenter: [number, number, number];
  anatomyStageFrame: AnatomyStageFrame;
  cameraResetNonce: number;
  cameraFocusPreset: CameraPreset | null;
  focusCameraNonce: number;
  /** User selected the Full body atlas tab (not a curriculum module). */
  atlasTabActive: boolean;
  /** Set when the active 3D scene finishes its first layout — hides load flash. */
  anatomySceneReady: boolean;
  progressByNode: Map<string, WorkoutProgress>;
  moduleGuideByModule: Map<string, ModuleGuideProgress>;
  activeTermId: string | null;
  quizMode: QuizMode;
  deckQueue: string[];
  deckIndex: number;
  quiz: QuizState;
  init: () => Promise<void>;
  setMode: (mode: WorkoutMode) => void;
  setBodyView: (view: BodyView) => void;
  setActiveModule: (moduleId: MuscleRegion) => void;
  selectNode: (nodeId: string | null) => void;
  focusStructure: (nodeId: string | null) => void;
  focusStudyGroup: (nodeIds: string[]) => void;
  clearFocus: () => void;
  setShowDetailStructures: (show: boolean) => void;
  setShowLandmarks: (show: boolean) => void;
  setShowAttachments: (show: boolean) => void;
  resetCameraView: () => void;
  setHoveredNodeId: (nodeId: string | null) => void;
  setReferenceHalfHint: (hint: 'idle' | 'hover' | 'pinned') => void;
  setLayerPeelDepth: (depth: LayerPeelDepth) => void;
  setAnatomyStageFrame: (frame: AnatomyStageFrame) => void;
  setCameraFocusPreset: (preset: CameraPreset | null) => void;
  setActiveTermId: (termId: string | null) => void;
  setQuizMode: (mode: QuizMode) => void;
  advanceModuleGuide: () => void;
  setModuleGuideStepIndex: (stepIndex: number) => void;
  setModuleGuidePhase: (phase: ModuleGuidePhase) => void;
  startActiveSession: () => void;
  submitAnswer: (nodeId: string) => Promise<void>;
  submitMultipleChoice: (nodeId: string) => Promise<void>;
  submitTermAnswer: (termId: string) => Promise<void>;
  advanceAfterFeedback: () => void;
  getModuleMastery: () => { mastered: number; total: number };
  isActiveRepsAllowed: () => boolean;
  getLockReason: () => string | null;
}

function emptyQuiz(quizMode: QuizMode = 'identify_highlight'): QuizState {
  return {
    targetNodeId: null,
    choices: [],
    feedback: 'idle',
    mistakeNodeId: null,
    quizMode,
    promptName: null,
  };
}

function defaultModuleGuide(moduleId: MuscleRegion): ModuleGuideProgress {
  return { moduleId, phase: 'intro', lessonStepIndex: 0 };
}

function prepareNextQuiz(
  moduleId: MuscleRegion,
  progressByNode: Map<string, WorkoutProgress>,
  deckQueue: string[],
  deckIndex: number,
  quizMode: QuizMode,
  options?: { bodyView?: BodyView; atlasTabActive?: boolean },
): { quiz: QuizState; deckIndex: number } {
  const termsLessonTab =
    moduleId === 'anatomy_terms' && options?.atlasTabActive === false;

  if (termsLessonTab) {
    const termIds = deckQueue.filter((id) => id.startsWith('term_'));
    const targetId = termIds[deckIndex];
    if (!targetId) return { quiz: emptyQuiz('term_direction'), deckIndex };
    const term = getAnatomyTermById(targetId);
    const others = termIds.filter((id) => id !== targetId).slice(0, 3);
    return {
      deckIndex,
      quiz: {
        targetNodeId: targetId,
        choices: [targetId, ...others].sort(() => Math.random() - 0.5),
        feedback: 'idle',
        mistakeNodeId: null,
        quizMode: 'term_direction',
        promptName: term?.label ?? null,
      },
    };
  }

  const nodes =
    options?.bodyView === 'full_body' && options?.atlasTabActive
      ? getNodesForView('full_body', moduleId).filter((n) => n.isSurfaceForm && !n.atlasOnly)
      : getNodesForRegion(moduleId).filter((n) => n.isSurfaceForm && !n.atlasOnly);
  if (deckQueue.length === 0) {
    const plan = buildDeckPlan(nodes, progressByNode);
    deckQueue = plan.queue;
    deckIndex = 0;
  }

  const targetId = deckQueue[deckIndex];
  if (!targetId) {
    return { quiz: emptyQuiz(quizMode), deckIndex };
  }

  const targetNode = getNodeById(targetId);
  if (quizMode === 'locate_name') {
    return {
      deckIndex,
      quiz: {
        targetNodeId: targetId,
        choices: [],
        feedback: 'idle',
        mistakeNodeId: null,
        quizMode,
        promptName: targetNode?.name ?? null,
      },
    };
  }

  return {
    deckIndex,
    quiz: {
      targetNodeId: targetId,
      choices: pickQuizChoices(targetId, nodes, 4),
      feedback: 'idle',
      mistakeNodeId: null,
      quizMode: 'identify_highlight',
      promptName: null,
    },
  };
}

let pendingHoverId: string | null | undefined;
let hoverRafId = 0;
let anatomySceneReadyTimer: ReturnType<typeof setTimeout> | undefined;

function clearAnatomySceneReadyTimer(): void {
  if (anatomySceneReadyTimer !== undefined) {
    clearTimeout(anatomySceneReadyTimer);
    anatomySceneReadyTimer = undefined;
  }
}

function scheduleAnatomySceneReady(set: (partial: Pick<MuscleStoreState, 'anatomySceneReady'>) => void): void {
  clearAnatomySceneReadyTimer();
  anatomySceneReadyTimer = setTimeout(() => {
    set({ anatomySceneReady: true });
    anatomySceneReadyTimer = undefined;
  }, 200);
}

function scheduleHoverFlush(
  set: (partial: Pick<MuscleStoreState, 'hoveredNodeId'>) => void,
): void {
  if (hoverRafId !== 0) return;
  hoverRafId = requestAnimationFrame(() => {
    hoverRafId = 0;
    if (pendingHoverId === undefined) return;
    const next = pendingHoverId;
    pendingHoverId = undefined;
    set({ hoveredNodeId: next });
  });
}

function flushHoverImmediate(
  set: (partial: Pick<MuscleStoreState, 'hoveredNodeId'>) => void,
  nodeId: string | null,
): void {
  if (hoverRafId !== 0) {
    cancelAnimationFrame(hoverRafId);
    hoverRafId = 0;
  }
  pendingHoverId = undefined;
  set({ hoveredNodeId: nodeId });
}

export const useMuscleStore = create<MuscleStoreState>((set, get) => ({
  hydrated: false,
  saveError: null,
  mode: 'warmup',
  bodyView: 'full_body',
  activeModuleId: 'anatomy_terms',
  selectedNodeId: null,
  focusedNodeId: null,
  focusedGroupNodeIds: null,
  showDetailStructures: true,
  showLandmarks: false,
  showAttachments: false,
  hoveredNodeId: null,
  referenceHalfHint: 'idle',
  layerPeelDepth: defaultLayerPeelForModule(),
  anatomyStageCenter: DEFAULT_ANATOMY_STAGE_FRAME.center,
  anatomyStageFrame: DEFAULT_ANATOMY_STAGE_FRAME,
  cameraResetNonce: 0,
  cameraFocusPreset: null,
  focusCameraNonce: 0,
  atlasTabActive: true,
  anatomySceneReady: false,
  progressByNode: new Map(),
  moduleGuideByModule: new Map(),
  activeTermId: null,
  quizMode: 'identify_highlight',
  deckQueue: [],
  deckIndex: 0,
  quiz: emptyQuiz(),

  init: async () => {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.has('e2eSeed')) {
        const { seedMuscleE2eGateUnlocked } = await import('../e2e/muscleE2eSeed');
        await seedMuscleE2eGateUnlocked();
      }
    }
    const [progressByNode, moduleGuideByModule] = await Promise.all([
      loadAllProgress(),
      loadModuleGuideProgress(),
    ]);
    set({ progressByNode, moduleGuideByModule, hydrated: true });
  },

  setMode: (mode) => {
    if (mode === 'active' && !get().isActiveRepsAllowed()) return;
    const quizMode = get().quizMode;
    set({ mode, quiz: emptyQuiz(quizMode), deckQueue: [], deckIndex: 0 });
    if (mode === 'active') {
      get().startActiveSession();
      return;
    }
    const { bodyView, activeModuleId, layerPeelDepth } = get();
    autoFocusExploreSelection(
      bodyView,
      activeModuleId,
      layerPeelDepth,
      get().focusStructure,
      get().focusStudyGroup,
    );
  },

  setActiveModule: (moduleId) => {
    flushHoverImmediate(set, null);
    const prev = get();
    const nextBodyView = moduleId === 'anatomy_terms' ? 'full_body' : 'region';
    const sceneChanges = anatomySceneKey(prev.bodyView, prev.activeModuleId) !== anatomySceneKey(nextBodyView, moduleId);
    if (sceneChanges) clearAnatomySceneReadyTimer();
    void loadQuizModePreference(moduleId).then((saved) => {
      if (saved === 'identify_highlight' || saved === 'locate_name' || saved === 'identify_region') {
        set({ quizMode: saved });
      }
    });
    set({
      bodyView: moduleId === 'anatomy_terms' ? 'full_body' : 'region',
      activeModuleId: moduleId,
      atlasTabActive: false,
      anatomySceneReady: sceneChanges ? false : prev.anatomySceneReady,
      layerPeelDepth: defaultLayerPeelForModule(),
      selectedNodeId: null,
      focusedNodeId: null,
      focusedGroupNodeIds: null,
      activeTermId: null,
      cameraFocusPreset: null,
      deckQueue: [],
      deckIndex: 0,
      quiz: emptyQuiz(get().quizMode),
    });
    if (get().mode === 'active') {
      get().startActiveSession();
      return;
    }
    autoFocusExploreSelection(
      'region',
      moduleId,
      defaultLayerPeelForModule(),
      get().focusStructure,
      get().focusStudyGroup,
    );
  },

  setBodyView: (view) => {
    flushHoverImmediate(set, null);
    const prev = get();
    const sceneChanges =
      anatomySceneKey(prev.bodyView, prev.activeModuleId) !== anatomySceneKey(view, prev.activeModuleId);
    if (sceneChanges) clearAnatomySceneReadyTimer();
    set({
      bodyView: view,
      atlasTabActive: view === 'full_body',
      anatomySceneReady: sceneChanges ? false : prev.anatomySceneReady,
      mode: view === 'full_body' && prev.mode === 'active' ? 'warmup' : prev.mode,
      layerPeelDepth: defaultLayerPeelForModule(),
      selectedNodeId: null,
      focusedNodeId: null,
      focusedGroupNodeIds: null,
      cameraFocusPreset: null,
      deckQueue: [],
      deckIndex: 0,
      quiz: emptyQuiz(get().quizMode),
    });
    if (get().mode === 'warmup' && view === 'region') {
      autoFocusExploreSelection(
        view,
        get().activeModuleId,
        defaultLayerPeelForModule(),
        get().focusStructure,
        get().focusStudyGroup,
      );
    }
  },

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  focusStructure: (nodeId) => {
    if (!nodeId) {
      set({
        focusedNodeId: null,
        focusedGroupNodeIds: null,
        selectedNodeId: null,
      });
      return;
    }
    const { bodyView, activeModuleId, focusedGroupNodeIds } = get();
    let groupIds = collectStudyGroupIdsForNode(nodeId, {
      moduleId: bodyView === 'region' ? activeModuleId : undefined,
    });
    if (!groupIds && focusedGroupNodeIds?.includes(nodeId)) {
      groupIds = focusedGroupNodeIds;
    }
    set((s) => ({
      focusedNodeId: nodeId,
      focusedGroupNodeIds: groupIds,
      selectedNodeId: nodeId,
      cameraFocusPreset: null,
      focusCameraNonce: s.focusCameraNonce + 1,
    }));
  },

  focusStudyGroup: (nodeIds) =>
    set((s) => ({
      focusedGroupNodeIds: nodeIds,
      focusedNodeId: null,
      selectedNodeId: nodeIds[0] ?? null,
      cameraFocusPreset: null,
      focusCameraNonce: s.focusCameraNonce + 1,
    })),

  clearFocus: () =>
    set((s) => ({
      focusedNodeId: null,
      focusedGroupNodeIds: null,
      cameraFocusPreset: null,
      cameraResetNonce: s.cameraResetNonce + 1,
      referenceHalfHint: 'idle',
    })),

  setShowDetailStructures: (show) => set({ showDetailStructures: show }),

  setShowLandmarks: (show) => set({ showLandmarks: show }),

  setShowAttachments: (show) => set({ showAttachments: show }),

  resetCameraView: () => set((s) => ({ cameraResetNonce: s.cameraResetNonce + 1 })),

  setHoveredNodeId: (nodeId) => {
    pendingHoverId = nodeId;
    scheduleHoverFlush(set);
  },

  setReferenceHalfHint: (hint) => set({ referenceHalfHint: hint }),

  setLayerPeelDepth: (depth) => {
    const state = get();
    const currentId = state.focusedNodeId ?? state.selectedNodeId;
    const current = currentId ? getNodeById(currentId) : undefined;
    set({ layerPeelDepth: depth });
    if (
      state.mode === 'warmup' &&
      current &&
      !isNodeVisibleAtPeelDepth(current, depth)
    ) {
      autoFocusExploreSelection(
        state.bodyView,
        state.activeModuleId,
        depth,
        get().focusStructure,
        get().focusStudyGroup,
      );
    }
  },

  setAnatomyStageFrame: (frame) => {
    set({ anatomyStageFrame: frame, anatomyStageCenter: frame.center, anatomySceneReady: false });
    scheduleAnatomySceneReady(set);
  },

  setCameraFocusPreset: (preset) => set({ cameraFocusPreset: preset }),

  setActiveTermId: (termId) => set({ activeTermId: termId }),

  setQuizMode: (quizMode) => {
    set({ quizMode });
    void saveQuizModePreference(get().activeModuleId, quizMode);
  },

  advanceModuleGuide: () => {
    const { activeModuleId, moduleGuideByModule } = get();
    const current = moduleGuideByModule.get(activeModuleId) ?? defaultModuleGuide(activeModuleId);
    const next = new Map(moduleGuideByModule);
    if (current.phase === 'intro') {
      const firstTermId =
        activeModuleId === 'anatomy_terms'
          ? ANATOMY_TERM_LESSONS.flatMap((lesson) => lesson.steps)[0]?.termId ?? null
          : null;
      next.set(activeModuleId, { ...current, phase: 'lesson', lessonStepIndex: 0 });
      set({ moduleGuideByModule: next, activeTermId: firstTermId });
      void saveModuleGuideProgress(next.get(activeModuleId)!);
      return;
    }
    if (current.phase === 'lesson') {
      next.set(activeModuleId, { ...current, phase: 'explore' });
    } else if (current.phase === 'explore') {
      next.set(activeModuleId, { ...current, phase: 'quiz' });
    } else if (current.phase === 'quiz') {
      next.set(activeModuleId, {
        ...current,
        phase: 'complete',
        completedAt: Date.now(),
      });
    }
    set({ moduleGuideByModule: next });
    void saveModuleGuideProgress(next.get(activeModuleId)!);
  },

  setModuleGuideStepIndex: (stepIndex) => {
    const { activeModuleId, moduleGuideByModule } = get();
    const flatSteps = ANATOMY_TERM_LESSONS.flatMap((lesson) => lesson.steps);
    const clamped = Math.max(0, Math.min(flatSteps.length - 1, stepIndex));
    const step = flatSteps[clamped];
    const current = moduleGuideByModule.get(activeModuleId) ?? defaultModuleGuide(activeModuleId);
    const updated = { ...current, phase: 'lesson' as const, lessonStepIndex: clamped };
    const next = new Map(moduleGuideByModule);
    next.set(activeModuleId, updated);
    set({ moduleGuideByModule: next, activeTermId: step?.termId ?? null });
    void saveModuleGuideProgress(updated);
  },

  setModuleGuidePhase: (phase) => {
    const { activeModuleId, moduleGuideByModule } = get();
    const current = moduleGuideByModule.get(activeModuleId) ?? defaultModuleGuide(activeModuleId);
    const updated = { ...current, phase };
    const next = new Map(moduleGuideByModule);
    next.set(activeModuleId, updated);
    set({ moduleGuideByModule: next });
    void saveModuleGuideProgress(updated);
  },

  startActiveSession: () => {
    const { activeModuleId, bodyView, atlasTabActive, progressByNode, quizMode } = get();
    if (activeModuleId === 'anatomy_terms' && !atlasTabActive) {
      const queue = getTermsGateIds();
      const { quiz, deckIndex } = prepareNextQuiz(
        activeModuleId,
        progressByNode,
        queue,
        0,
        'term_direction',
        { bodyView, atlasTabActive },
      );
      set({ deckQueue: queue, deckIndex, quiz, selectedNodeId: null });
      return;
    }
    const quizNodes =
      bodyView === 'full_body' && atlasTabActive
        ? getNodesForView('full_body', activeModuleId).filter((n) => n.isSurfaceForm && !n.atlasOnly)
        : getNodesForRegion(activeModuleId).filter((n) => n.isSurfaceForm && !n.atlasOnly);
    const plan = buildDeckPlan(quizNodes, progressByNode);
    const { quiz, deckIndex } = prepareNextQuiz(
      activeModuleId,
      progressByNode,
      plan.queue,
      0,
      quizMode,
      { bodyView, atlasTabActive },
    );
    set({
      deckQueue: plan.queue,
      deckIndex,
      quiz,
      selectedNodeId: quiz.targetNodeId,
    });
  },

  submitAnswer: async (nodeId) => {
    await get().submitMultipleChoice(nodeId);
  },

  submitMultipleChoice: async (nodeId) => {
    const state = get();
    const targetId = state.quiz.targetNodeId;
    if (!targetId || state.quiz.feedback !== 'idle') return;

    const correct = nodeId === targetId;
    const existing = state.progressByNode.get(targetId) ?? createInitialProgress(targetId);
    const updated = applySm2Grade(existing, qualityFromCorrect(correct));

    const nextMap = new Map(state.progressByNode);
    nextMap.set(targetId, updated);

    try {
      await saveProgress(updated);
      set({
        progressByNode: nextMap,
        saveError: null,
        quiz: {
          ...state.quiz,
          feedback: correct ? 'correct' : 'incorrect',
          mistakeNodeId: correct ? null : targetId,
        },
        selectedNodeId: targetId,
      });
    } catch {
      set({ saveError: 'Could not save progress. Check storage and try again.' });
    }
  },

  submitTermAnswer: async (termId) => {
    await get().submitMultipleChoice(termId);
  },

  advanceAfterFeedback: () => {
    const { deckQueue, deckIndex, activeModuleId, progressByNode, quiz, quizMode, bodyView, atlasTabActive } =
      get();
    if (quiz.feedback === 'idle') return;

    const nextIndex = deckIndex + 1;
    const { quiz: nextQuiz, deckIndex: idx } = prepareNextQuiz(
      activeModuleId,
      progressByNode,
      deckQueue,
      nextIndex,
      quizMode,
      { bodyView, atlasTabActive },
    );

    set({
      deckIndex: idx,
      quiz: nextQuiz,
      selectedNodeId: nextQuiz.quizMode === 'locate_name' ? null : nextQuiz.targetNodeId,
    });
  },

  getModuleMastery: () => {
    const { activeModuleId, progressByNode, bodyView, atlasTabActive } = get();
    if (activeModuleId === 'anatomy_terms' && !atlasTabActive) {
      const ids = getTermsGateIds();
      const mastered = ids.filter(
        (id) => (progressByNode.get(id)?.repetitionCount ?? 0) >= 3,
      ).length;
      return { mastered, total: ids.length };
    }
    const nodes =
      bodyView === 'full_body' && atlasTabActive
        ? getNodesForView('full_body', activeModuleId).filter((n) => n.isSurfaceForm && !n.atlasOnly)
        : getNodesForRegion(activeModuleId).filter((n) => n.isSurfaceForm && !n.atlasOnly);
    return computeModuleMastery(nodes, progressByNode, 3);
  },

  isActiveRepsAllowed: () => {
    const { activeModuleId, progressByNode, bodyView, atlasTabActive } = get();
    if (bodyView === 'full_body' && atlasTabActive) return false;
    return isModuleUnlocked(activeModuleId, progressByNode);
  },

  getLockReason: () => {
    const { activeModuleId, progressByNode, bodyView, atlasTabActive } = get();
    if (bodyView === 'full_body' && atlasTabActive) {
      return 'Switch to a regional module tab to run Active Reps on a focused deck.';
    }
    return getModuleLockReason(activeModuleId, progressByNode);
  },
}));

export function useModuleOptions() {
  return MUSCLE_MODULES;
}

export function useSelectedNode() {
  const id = useMuscleStore((s) => s.selectedNodeId);
  return id ? getNodeById(id) : undefined;
}

export function usePreviewNode(): {
  node: ReturnType<typeof getNodeById>;
  isHoverPreview: boolean;
  focusedGroupNodeIds: string[] | null;
} {
  const mode = useMuscleStore((s) => s.mode);
  const focusedNodeId = useMuscleStore((s) => s.focusedNodeId);
  const focusedGroupNodeIds = useMuscleStore((s) => s.focusedGroupNodeIds);
  const selectedNodeId = useMuscleStore((s) => s.selectedNodeId);
  const hoveredNodeId = useMuscleStore((s) => s.hoveredNodeId);

  if (focusedGroupNodeIds && focusedGroupNodeIds.length > 0 && !focusedNodeId) {
    return { node: undefined, isHoverPreview: false, focusedGroupNodeIds };
  }

  const studyIndexActive = mode === 'warmup';

  const previewId =
    focusedNodeId ??
    selectedNodeId ??
    (studyIndexActive ? null : hoveredNodeId);
  const node = previewId ? getNodeById(previewId) : undefined;
  const isHoverPreview =
    !studyIndexActive &&
    !focusedNodeId &&
    !focusedGroupNodeIds &&
    !selectedNodeId &&
    Boolean(hoveredNodeId);
  return {
    node,
    isHoverPreview,
    focusedGroupNodeIds: focusedNodeId ? focusedGroupNodeIds : null,
  };
}

export function useActiveModule() {
  const id = useMuscleStore((s) => s.activeModuleId);
  return getModuleById(id);
}
