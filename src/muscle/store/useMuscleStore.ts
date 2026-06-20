import { create } from 'zustand';
import { getNodeById, getNodesForRegion } from '../curriculum';
import { MUSCLE_MODULES } from '../curriculum/modules';
import { loadAllProgress, saveProgress } from '../db/muscleDb';
import { buildDeckPlan, computeModuleMastery, pickQuizChoices } from '../srs/deckPlanner';
import { getModuleLockReason, isModuleUnlocked } from '../srs/gatekeeper';
import {
  applySm2Grade,
  createInitialProgress,
  qualityFromCorrect,
} from '../srs/sm2';
import type { LayerPeelDepth } from '../layerDepthView';
import { defaultLayerPeelForModule } from '../layerDepthView';
import type {
  BodyView,
  MuscleRegion,
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
  /** When set, non-focused structures fade for emphasis (warmup exploration). */
  focusedNodeId: string | null;
  hoveredNodeId: string | null;
  layerPeelDepth: LayerPeelDepth;
  /** OrbitControls target — updated when a region GLB loads. */
  anatomyStageCenter: [number, number, number];
  /** Increment to snap the camera back to the default study framing. */
  cameraResetNonce: number;
  /** Full-body Z-Anatomy skin envelope overlay. */
  showSkinLayer: boolean;
  progressByNode: Map<string, WorkoutProgress>;
  deckQueue: string[];
  deckIndex: number;
  quiz: QuizState;
  init: () => Promise<void>;
  setMode: (mode: WorkoutMode) => void;
  setBodyView: (view: BodyView) => void;
  setActiveModule: (moduleId: MuscleRegion) => void;
  selectNode: (nodeId: string | null) => void;
  focusStructure: (nodeId: string | null) => void;
  clearFocus: () => void;
  resetCameraView: () => void;
  setHoveredNodeId: (nodeId: string | null) => void;
  setLayerPeelDepth: (depth: LayerPeelDepth) => void;
  setAnatomyStageCenter: (center: [number, number, number]) => void;
  toggleSkinLayer: () => void;
  startActiveSession: () => void;
  submitAnswer: (nodeId: string) => Promise<void>;
  submitMultipleChoice: (nodeId: string) => Promise<void>;
  advanceAfterFeedback: () => void;
  getModuleMastery: () => { mastered: number; total: number };
  isActiveRepsAllowed: () => boolean;
  getLockReason: () => string | null;
}

function emptyQuiz(): QuizState {
  return {
    targetNodeId: null,
    choices: [],
    feedback: 'idle',
    mistakeNodeId: null,
  };
}

function prepareNextQuiz(
  moduleId: MuscleRegion,
  progressByNode: Map<string, WorkoutProgress>,
  deckQueue: string[],
  deckIndex: number,
): { quiz: QuizState; deckIndex: number } {
  const nodes = getNodesForRegion(moduleId).filter((n) => n.isSurfaceForm);
  if (deckQueue.length === 0) {
    const plan = buildDeckPlan(nodes, progressByNode);
    deckQueue = plan.queue;
    deckIndex = 0;
  }

  const targetId = deckQueue[deckIndex];
  if (!targetId) {
    return { quiz: emptyQuiz(), deckIndex };
  }

  return {
    deckIndex,
    quiz: {
      targetNodeId: targetId,
      choices: pickQuizChoices(targetId, nodes, 4),
      feedback: 'idle',
      mistakeNodeId: null,
    },
  };
}

let pendingHoverId: string | null | undefined;
let hoverRafId = 0;

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
  activeModuleId: 'torso',
  selectedNodeId: null,
  focusedNodeId: null,
  hoveredNodeId: null,
  layerPeelDepth: defaultLayerPeelForModule(),
  anatomyStageCenter: [0, 0.875, 0],
  cameraResetNonce: 0,
  showSkinLayer: true,
  progressByNode: new Map(),
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
    const progressByNode = await loadAllProgress();
    set({ progressByNode, hydrated: true });
  },

  setMode: (mode) => {
    if (mode === 'active' && !get().isActiveRepsAllowed()) return;
    set({ mode, quiz: emptyQuiz(), deckQueue: [], deckIndex: 0 });
    if (mode === 'active') get().startActiveSession();
  },

  setActiveModule: (moduleId) => {
    flushHoverImmediate(set, null);
    set({
      bodyView: 'region',
      activeModuleId: moduleId,
      layerPeelDepth: defaultLayerPeelForModule(),
      selectedNodeId: null,
      focusedNodeId: null,
      deckQueue: [],
      deckIndex: 0,
      quiz: emptyQuiz(),
    });
    if (get().mode === 'active') {
      get().startActiveSession();
    }
  },

  setBodyView: (view) => {
    flushHoverImmediate(set, null);
    set({
      bodyView: view,
      layerPeelDepth: defaultLayerPeelForModule(),
      selectedNodeId: null,
      focusedNodeId: null,
      deckQueue: [],
      deckIndex: 0,
      quiz: emptyQuiz(),
    });
  },

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  focusStructure: (nodeId) => set({ focusedNodeId: nodeId, selectedNodeId: nodeId }),

  clearFocus: () => set({ focusedNodeId: null }),

  resetCameraView: () => set((s) => ({ cameraResetNonce: s.cameraResetNonce + 1 })),

  setHoveredNodeId: (nodeId) => {
    pendingHoverId = nodeId;
    scheduleHoverFlush(set);
  },

  setLayerPeelDepth: (depth) => set({ layerPeelDepth: depth }),

  setAnatomyStageCenter: (center) => set({ anatomyStageCenter: center }),

  toggleSkinLayer: () => set((s) => ({ showSkinLayer: !s.showSkinLayer })),

  startActiveSession: () => {
    const { activeModuleId, progressByNode } = get();
    const nodes = getNodesForRegion(activeModuleId).filter((n) => n.isSurfaceForm);
    const plan = buildDeckPlan(nodes, progressByNode);
    const { quiz, deckIndex } = prepareNextQuiz(
      activeModuleId,
      progressByNode,
      plan.queue,
      0,
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

  advanceAfterFeedback: () => {
    const { deckQueue, deckIndex, activeModuleId, progressByNode, quiz } = get();
    if (quiz.feedback === 'idle') return;

    const nextIndex = deckIndex + 1;
    const { quiz: nextQuiz, deckIndex: idx } = prepareNextQuiz(
      activeModuleId,
      progressByNode,
      deckQueue,
      nextIndex,
    );

    set({
      deckIndex: idx,
      quiz: nextQuiz,
      selectedNodeId: nextQuiz.targetNodeId,
    });
  },

  getModuleMastery: () => {
    const { activeModuleId, progressByNode } = get();
    const nodes = getNodesForRegion(activeModuleId).filter((n) => n.isSurfaceForm);
    return computeModuleMastery(nodes, progressByNode, 3);
  },

  isActiveRepsAllowed: () => {
    const { activeModuleId, progressByNode } = get();
    return isModuleUnlocked(activeModuleId, progressByNode);
  },

  getLockReason: () => {
    const { activeModuleId, progressByNode } = get();
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
