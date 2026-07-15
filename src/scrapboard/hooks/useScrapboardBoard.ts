import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  adaptBlocksToPanelBudget,
  defaultFillsForLayout,
  defaultGeneratedLayout,
  generateLayoutsForPanelCount,
  panelPixelBounds,
  type GeneratedPanelLayout,
  type PanelFillSpec,
  type PanelTextBlock,
} from '../../shared/comic';
import {
  DEFAULT_LABS_PRINT_SPEC,
  MIXAM_TRIM_PRESETS,
  type LabsPrintSpec,
} from '../../shared/zine';
import { generateMadLibsPage } from '../copy/scrapboardMadLibs';

/** Board preview size used for mad-libs dialogue budgeting (matches main canvas). */
const BUDGET_PAGE_W = 520;
const BUDGET_PAGE_H = 720;

function emptyFill(panelIndex: number): PanelFillSpec {
  return { panelIndex, composition: 'horizon-scene', blocks: [], text: { kind: 'none' } };
}

export type ScrapboardBoardState = {
  panelCount: number;
  setPanelCount: (count: number) => void;
  layoutCandidates: GeneratedPanelLayout[];
  layout: GeneratedPanelLayout;
  selectedLayoutId: string;
  selectLayout: (id: string) => void;
  printSpec: LabsPrintSpec;
  setPrintSpec: (next: LabsPrintSpec) => void;
  showBleedGuides: boolean;
  setShowBleedGuides: (show: boolean) => void;
  allowFullBleedLayouts: boolean;
  setAllowFullBleedLayouts: (allow: boolean) => void;
  allowBubbleEscape: boolean;
  setAllowBubbleEscape: (allow: boolean) => void;
  fills: PanelFillSpec[];
  selectedPanelIndex: number;
  setSelectedPanelIndex: (index: number) => void;
  setPanelBlocks: (panelIndex: number, blocks: PanelTextBlock[]) => void;
  randomizeText: () => void;
  randomizeAll: () => void;
};

export function useScrapboardBoard(initialPanelCount = 4): ScrapboardBoardState {
  const [panelCount, setPanelCountState] = useState(initialPanelCount);
  const [printSpec, setPrintSpec] = useState<LabsPrintSpec>({ ...DEFAULT_LABS_PRINT_SPEC });
  const [allowFullBleedLayouts, setAllowFullBleedLayouts] = useState(false);
  const [allowBubbleEscape, setAllowBubbleEscape] = useState(true);
  const layoutOptions = useMemo(
    () => ({ printSpec, allowFullBleed: allowFullBleedLayouts }),
    [printSpec, allowFullBleedLayouts],
  );
  const [selectedLayoutId, setSelectedLayoutId] = useState(
    () => defaultGeneratedLayout(initialPanelCount, layoutOptions).id,
  );
  const [showBleedGuides, setShowBleedGuides] = useState(true);
  const [selectedPanelIndex, setSelectedPanelIndex] = useState(0);
  const [fills, setFills] = useState<PanelFillSpec[]>(() =>
    defaultFillsForLayout(defaultGeneratedLayout(initialPanelCount, layoutOptions)),
  );

  const layoutCandidates = useMemo(
    () => generateLayoutsForPanelCount(panelCount, layoutOptions),
    [panelCount, layoutOptions],
  );

  const layout = useMemo(() => {
    return layoutCandidates.find((row) => row.id === selectedLayoutId) ?? layoutCandidates[0]!;
  }, [layoutCandidates, selectedLayoutId]);

  useEffect(() => {
    if (layoutCandidates.some((row) => row.id === selectedLayoutId)) return;
    const first = layoutCandidates[0];
    if (!first) return;
    setSelectedLayoutId(first.id);
    setFills(defaultFillsForLayout(first));
    setSelectedPanelIndex(0);
  }, [layoutCandidates, selectedLayoutId]);

  const setPanelCount = useCallback((count: number) => {
    const next = Math.max(1, Math.min(12, Math.round(count)));
    const layouts = generateLayoutsForPanelCount(next, layoutOptions);
    const first = layouts[0]!;
    setPanelCountState(next);
    setSelectedLayoutId(first.id);
    setFills(defaultFillsForLayout(first));
    setSelectedPanelIndex(0);
  }, [layoutOptions]);

  const selectLayout = useCallback(
    (id: string) => {
      const next = layoutCandidates.find((row) => row.id === id);
      if (!next) return;
      setSelectedLayoutId(id);
      setFills((current) => {
        const byIndex = new Map(current.map((f) => [f.panelIndex, f]));
        return next.panels.map((_, panelIndex) => {
          const existing = byIndex.get(panelIndex);
          return {
            panelIndex,
            composition: 'horizon-scene',
            blocks: existing?.blocks ?? [],
            text: { kind: 'none' as const },
          };
        });
      });
      setSelectedPanelIndex((current) => Math.min(current, next.panels.length - 1));
    },
    [layoutCandidates],
  );

  const setPanelBlocks = useCallback((panelIndex: number, blocks: PanelTextBlock[]) => {
    setFills((current) => {
      const next = [...current];
      const existing = next.find((f) => f.panelIndex === panelIndex);
      if (existing) {
        existing.blocks = blocks;
        existing.text = { kind: 'none' };
      } else {
        next.push({ ...emptyFill(panelIndex), blocks });
      }
      return next;
    });
  }, []);

  const randomizeText = useCallback(() => {
    const seed = Date.now();
    const pageBlocks = generateMadLibsPage(seed, layout.panels.length);
    setFills(
      layout.panels.map((panel, panelIndex) => {
        const bounds = panelPixelBounds(panel, BUDGET_PAGE_W, BUDGET_PAGE_H);
        return {
          ...emptyFill(panelIndex),
          blocks: adaptBlocksToPanelBudget(pageBlocks[panelIndex] ?? [], bounds),
        };
      }),
    );
  }, [layout.panels]);

  const randomizeAll = useCallback(() => {
    const seed = Date.now();
    const count = 3 + (Math.abs(seed) % 8);
    const layouts = generateLayoutsForPanelCount(count, layoutOptions);
    const pick = layouts[Math.abs(seed >> 3) % layouts.length]!;
    setPanelCountState(count);
    setSelectedLayoutId(pick.id);
    setSelectedPanelIndex(0);
    const pageBlocks = generateMadLibsPage(seed, pick.panels.length);
    setFills(
      pick.panels.map((panel, panelIndex) => {
        const bounds = panelPixelBounds(panel, BUDGET_PAGE_W, BUDGET_PAGE_H);
        return {
          ...emptyFill(panelIndex),
          blocks: adaptBlocksToPanelBudget(pageBlocks[panelIndex] ?? [], bounds),
        };
      }),
    );
    const preset = MIXAM_TRIM_PRESETS[Math.abs(seed >> 5) % MIXAM_TRIM_PRESETS.length]!;
    setPrintSpec((current) => ({
      ...current,
      presetId: preset.id,
      trimWidth: preset.width,
      trimHeight: preset.height,
    }));
  }, [layoutOptions]);

  return {
    panelCount,
    setPanelCount,
    layoutCandidates,
    layout,
    selectedLayoutId,
    selectLayout,
    printSpec,
    setPrintSpec,
    showBleedGuides,
    setShowBleedGuides,
    allowFullBleedLayouts,
    setAllowFullBleedLayouts,
    allowBubbleEscape,
    setAllowBubbleEscape,
    fills,
    selectedPanelIndex,
    setSelectedPanelIndex,
    setPanelBlocks,
    randomizeText,
    randomizeAll,
  };
}
