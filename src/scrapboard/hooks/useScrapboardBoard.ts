import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  adaptBlocksToPanelBudget,
  createDefaultCast,
  defaultArrangementForCount,
  defaultFillForPanel,
  generateLayoutsForPanelCount,
  defaultGeneratedLayout,
  normalizeDialogueBlocks,
  panelPixelBounds,
  slotForSpeakerIndex,
  type CharacterArrangementId,
  type ComicCastMember,
  type GeneratedPanelLayout,
  type PanelBackgroundImage,
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

function fillsForLayout(
  layout: GeneratedPanelLayout,
  cast: ComicCastMember[],
  priorFills?: PanelFillSpec[],
): PanelFillSpec[] {
  const byIndex = new Map((priorFills ?? []).map((f) => [f.panelIndex, f]));
  let priorSpeakers: string[] | undefined;
  return layout.panels.map((panel, panelIndex) => {
    const existing = byIndex.get(panelIndex);
    const bounds = panelPixelBounds(panel, BUDGET_PAGE_W, BUDGET_PAGE_H);
    if (existing) {
      const speakerIds =
        existing.speakerIds && existing.speakerIds.length > 0
          ? existing.speakerIds
          : priorSpeakers ?? cast.slice(0, 2).map((c) => c.id);
      priorSpeakers = speakerIds;
      const blocks = normalizeDialogueBlocks(
        adaptBlocksToPanelBudget(existing.blocks ?? [], bounds),
        speakerIds,
        cast,
      );
      return {
        panelIndex,
        speakerIds,
        arrangement: existing.arrangement ?? defaultArrangementForCount(speakerIds.length || 1),
        blocks,
        text: { kind: 'none' as const },
        backgroundImage: existing.backgroundImage,
      };
    }
    const next = defaultFillForPanel(panelIndex, cast, priorSpeakers);
    priorSpeakers = next.speakerIds;
    return next;
  });
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
  cast: ComicCastMember[];
  setCast: (cast: ComicCastMember[]) => void;
  addCastMember: (member?: Partial<ComicCastMember>) => void;
  updateCastMember: (id: string, patch: Partial<ComicCastMember>) => void;
  removeCastMember: (id: string) => void;
  fills: PanelFillSpec[];
  selectedPanelIndex: number;
  setSelectedPanelIndex: (index: number) => void;
  setPanelBlocks: (panelIndex: number, blocks: PanelTextBlock[]) => void;
  setPanelSpeakers: (panelIndex: number, speakerIds: string[]) => void;
  setPanelArrangement: (panelIndex: number, arrangement: CharacterArrangementId) => void;
  setPanelBackgroundImage: (panelIndex: number, image: PanelBackgroundImage | null) => void;
  pageBackgroundImage: PanelBackgroundImage | null;
  setPageBackgroundImage: (image: PanelBackgroundImage | null) => void;
  randomizeText: () => void;
  randomizeAll: () => void;
};

export function useScrapboardBoard(initialPanelCount = 4): ScrapboardBoardState {
  const [cast, setCastState] = useState<ComicCastMember[]>(() => createDefaultCast());
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
    fillsForLayout(defaultGeneratedLayout(initialPanelCount, layoutOptions), createDefaultCast()),
  );
  const [pageBackgroundImage, setPageBackgroundImage] = useState<PanelBackgroundImage | null>(null);

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
    setFills(fillsForLayout(first, cast));
    setSelectedPanelIndex(0);
  }, [layoutCandidates, selectedLayoutId, cast]);

  const setCast = useCallback((next: ComicCastMember[]) => {
    setCastState(next.length > 0 ? next : createDefaultCast());
  }, []);

  const addCastMember = useCallback((member?: Partial<ComicCastMember>) => {
    setCastState((current) => {
      const id = member?.id ?? `cast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      return [
        ...current,
        {
          id,
          emoji: member?.emoji ?? '🙂',
          label: member?.label ?? String.fromCharCode(65 + current.length),
        },
      ];
    });
  }, []);

  const updateCastMember = useCallback((id: string, patch: Partial<ComicCastMember>) => {
    setCastState((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch, id: row.id } : row)),
    );
  }, []);

  const removeCastMember = useCallback((id: string) => {
    setCastState((current) => {
      if (current.length <= 1) return current;
      return current.filter((row) => row.id !== id);
    });
    setFills((current) =>
      current.map((fill) => {
        const speakerIds = (fill.speakerIds ?? []).filter((sid) => sid !== id);
        const nextSpeakers =
          speakerIds.length > 0 ? speakerIds : cast.filter((c) => c.id !== id).slice(0, 1).map((c) => c.id);
        return {
          ...fill,
          speakerIds: nextSpeakers,
          arrangement: defaultArrangementForCount(nextSpeakers.length || 1),
          blocks: normalizeDialogueBlocks(fill.blocks ?? [], nextSpeakers, cast.filter((c) => c.id !== id)),
        };
      }),
    );
  }, [cast]);

  const setPanelCount = useCallback(
    (count: number) => {
      const next = Math.max(1, Math.min(12, Math.round(count)));
      const layouts = generateLayoutsForPanelCount(next, layoutOptions);
      const first = layouts[0]!;
      setPanelCountState(next);
      setSelectedLayoutId(first.id);
      setFills(fillsForLayout(first, cast));
      setSelectedPanelIndex(0);
    },
    [layoutOptions, cast],
  );

  const selectLayout = useCallback(
    (id: string) => {
      const next = layoutCandidates.find((row) => row.id === id);
      if (!next) return;
      setSelectedLayoutId(id);
      setFills((current) => fillsForLayout(next, cast, current));
      setSelectedPanelIndex((current) => Math.min(current, next.panels.length - 1));
    },
    [layoutCandidates, cast],
  );

  const setPanelBlocks = useCallback(
    (panelIndex: number, blocks: PanelTextBlock[]) => {
      setFills((current) => {
        const next = [...current];
        const existingIndex = next.findIndex((f) => f.panelIndex === panelIndex);
        const existing = existingIndex >= 0 ? next[existingIndex]! : defaultFillForPanel(panelIndex, cast);
        let speakerIds = existing.speakerIds ?? cast.slice(0, 2).map((c) => c.id);
        for (const block of blocks) {
          if (block.kind !== 'dialogue' || !block.castMemberId) continue;
          if (!speakerIds.includes(block.castMemberId) && speakerIds.length < 3) {
            speakerIds = [...speakerIds, block.castMemberId];
          }
        }
        const normalized = normalizeDialogueBlocks(blocks, speakerIds, cast);
        const row: PanelFillSpec = {
          ...existing,
          panelIndex,
          speakerIds,
          arrangement: existing.arrangement ?? defaultArrangementForCount(speakerIds.length || 1),
          blocks: normalized,
          text: { kind: 'none' },
        };
        if (existingIndex >= 0) next[existingIndex] = row;
        else next.push(row);
        return next;
      });
    },
    [cast],
  );

  const setPanelSpeakers = useCallback(
    (panelIndex: number, speakerIds: string[]) => {
      const clamped = speakerIds.slice(0, 3);
      setFills((current) => {
        const next = [...current];
        const existingIndex = next.findIndex((f) => f.panelIndex === panelIndex);
        const existing = existingIndex >= 0 ? next[existingIndex]! : defaultFillForPanel(panelIndex, cast);
        const countChanged = clamped.length !== (existing.speakerIds?.length ?? 0);
        const arrangement =
          !countChanged && existing.arrangement
            ? existing.arrangement
            : defaultArrangementForCount(clamped.length || 1);
        const row: PanelFillSpec = {
          ...existing,
          panelIndex,
          speakerIds: clamped,
          arrangement,
          blocks: normalizeDialogueBlocks(existing.blocks ?? [], clamped, cast),
        };
        if (existingIndex >= 0) next[existingIndex] = row;
        else next.push(row);
        return next;
      });
    },
    [cast],
  );

  const setPanelArrangement = useCallback((panelIndex: number, arrangement: CharacterArrangementId) => {
    setFills((current) => {
      const next = [...current];
      const existingIndex = next.findIndex((f) => f.panelIndex === panelIndex);
      if (existingIndex >= 0) {
        next[existingIndex] = { ...next[existingIndex]!, arrangement };
      } else {
        next.push({ ...defaultFillForPanel(panelIndex, cast), arrangement });
      }
      return next;
    });
  }, [cast]);

  const setPanelBackgroundImage = useCallback((panelIndex: number, image: PanelBackgroundImage | null) => {
    setFills((current) => {
      const next = [...current];
      const existingIndex = next.findIndex((f) => f.panelIndex === panelIndex);
      if (existingIndex >= 0) {
        next[existingIndex] = { ...next[existingIndex]!, backgroundImage: image ?? undefined };
      } else {
        next.push({ ...defaultFillForPanel(panelIndex, cast), backgroundImage: image ?? undefined });
      }
      return next;
    });
  }, [cast]);

  const randomizeText = useCallback(() => {
    const seed = Date.now();
    const pageBlocks = generateMadLibsPage(seed, layout.panels.length);
    setFills((current) => {
      const byIndex = new Map(current.map((f) => [f.panelIndex, f]));
      return layout.panels.map((panel, panelIndex) => {
        const existing = byIndex.get(panelIndex);
        const speakerIds =
          existing?.speakerIds && existing.speakerIds.length > 0
            ? existing.speakerIds
            : cast.slice(0, 2).map((c) => c.id);
        const bounds = panelPixelBounds(panel, BUDGET_PAGE_W, BUDGET_PAGE_H);
        const madLibs = pageBlocks[panelIndex] ?? [];
        const mapped: PanelTextBlock[] = madLibs.map((block) => {
          if (block.kind !== 'dialogue') return block;
          const idx = Math.max(0, ['a', 'b', 'c'].indexOf(block.characterId));
          const castMemberId = speakerIds[idx] ?? speakerIds[0] ?? cast[0]?.id;
          return {
            ...block,
            castMemberId,
            characterId: slotForSpeakerIndex(Math.max(0, speakerIds.indexOf(castMemberId ?? ''))),
          };
        });
        return {
          panelIndex,
          speakerIds,
          arrangement: existing?.arrangement ?? defaultArrangementForCount(speakerIds.length || 1),
          blocks: normalizeDialogueBlocks(adaptBlocksToPanelBudget(mapped, bounds), speakerIds, cast),
          text: { kind: 'none' as const },
          backgroundImage: existing?.backgroundImage,
        };
      });
    });
  }, [layout.panels, cast]);

  const randomizeAll = useCallback(() => {
    const seed = Date.now();
    const count = 3 + (Math.abs(seed) % 8);
    const layouts = generateLayoutsForPanelCount(count, layoutOptions);
    const pick = layouts[Math.abs(seed >> 3) % layouts.length]!;
    setPanelCountState(count);
    setSelectedLayoutId(pick.id);
    setSelectedPanelIndex(0);
    const pageBlocks = generateMadLibsPage(seed, pick.panels.length);
    const nextCast = createDefaultCast();
    setCastState(nextCast);
    setFills(
      pick.panels.map((panel, panelIndex) => {
        const speakerCount = 1 + (Math.abs(seed + panelIndex * 17) % Math.min(3, nextCast.length));
        const speakerIds = nextCast.slice(0, speakerCount).map((c) => c.id);
        const bounds = panelPixelBounds(panel, BUDGET_PAGE_W, BUDGET_PAGE_H);
        const madLibs = pageBlocks[panelIndex] ?? [];
        const mapped: PanelTextBlock[] = madLibs.map((block) => {
          if (block.kind !== 'dialogue') return block;
          const idx = Math.max(0, ['a', 'b', 'c'].indexOf(block.characterId)) % speakerIds.length;
          const castMemberId = speakerIds[idx]!;
          return {
            ...block,
            castMemberId,
            characterId: slotForSpeakerIndex(idx),
          };
        });
        return {
          panelIndex,
          speakerIds,
          arrangement: defaultArrangementForCount(speakerIds.length),
          blocks: normalizeDialogueBlocks(adaptBlocksToPanelBudget(mapped, bounds), speakerIds, nextCast),
          text: { kind: 'none' as const },
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
    cast,
    setCast,
    addCastMember,
    updateCastMember,
    removeCastMember,
    fills,
    selectedPanelIndex,
    setSelectedPanelIndex,
    setPanelBlocks,
    setPanelSpeakers,
    setPanelArrangement,
    setPanelBackgroundImage,
    pageBackgroundImage,
    setPageBackgroundImage,
    randomizeText,
    randomizeAll,
  };
}
