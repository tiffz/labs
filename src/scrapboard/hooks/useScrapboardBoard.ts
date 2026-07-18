import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  adaptBlocksToPanelBudget,
  arrangementsForSpeakerCount,
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
import { fetchScenicWikimediaImageForQuery } from '../../shared/media';
import {
  generateStoryPage,
  groupPanelsByScene,
  photoQueryFromBlocks,
  pickWeightedLayout,
  pickWeightedPanelCount,
  type StoryPagePlan,
} from '../copy/scrapboardStoryGenerate';
import {
  DEFAULT_SCRAPBOARD_RANDOMIZE_LOCKS,
  SCRAPBOARD_CAST_POOL,
  type ScrapboardRandomizeLocks,
  type ScrapboardRandomizeScope,
} from './scrapboardRandomizeLocks';

function scenicResultToPanelBackground(
  result: Awaited<ReturnType<typeof fetchScenicWikimediaImageForQuery>>,
): PanelBackgroundImage | undefined {
  if (!result) return undefined;
  return {
    url: result.url,
    thumbUrl: result.thumbUrl,
    title: result.title,
    license: result.license,
  };
}

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
  randomizeLocks: ScrapboardRandomizeLocks;
  toggleRandomizeLock: (scope: ScrapboardRandomizeScope) => void;
  randomizeText: () => void;
  randomizePanelCopy: (panelIndex: number) => void;
  randomizeCast: () => void;
  randomizePanelStaging: (panelIndex: number) => void;
  randomizeLayout: () => void;
  randomizeTrim: () => void;
  /** Scenic Wikimedia backgrounds for each panel + page photo. */
  randomizePhotos: () => void;
  /** Randomize every unlocked scope. Optional palette callback (palette lives in App). */
  randomizeAll: (opts?: { randomizePalette?: () => void }) => void;
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
  const [randomizeLocks, setRandomizeLocks] = useState<ScrapboardRandomizeLocks>(
    () => ({ ...DEFAULT_SCRAPBOARD_RANDOMIZE_LOCKS }),
  );

  const toggleRandomizeLock = useCallback((scope: ScrapboardRandomizeScope) => {
    setRandomizeLocks((current) => ({ ...current, [scope]: !current[scope] }));
  }, []);

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

  const mapMadLibsToSpeakers = useCallback(
    (
      madLibs: PanelTextBlock[],
      speakerIds: string[],
      castRows: ComicCastMember[],
    ): PanelTextBlock[] =>
      madLibs.map((block) => {
        if (block.kind !== 'dialogue') return block;
        const idx = Math.max(0, ['a', 'b', 'c'].indexOf(block.characterId)) % Math.max(1, speakerIds.length);
        const castMemberId = speakerIds[idx] ?? speakerIds[0] ?? castRows[0]?.id;
        return {
          ...block,
          castMemberId,
          characterId: slotForSpeakerIndex(Math.max(0, speakerIds.indexOf(castMemberId ?? ''))),
        };
      }),
    [],
  );

  const randomizeText = useCallback(() => {
    if (randomizeLocks.copy) return;
    const seed = Date.now();
    const plan = generateStoryPage(seed, layout, { cast, randomizeCast: false });
    setFills((current) => {
      const byIndex = new Map(current.map((f) => [f.panelIndex, f]));
      return plan.panels.map((panelPlan) => {
        const existing = byIndex.get(panelPlan.panelIndex);
        const speakerIds =
          !randomizeLocks.staging && panelPlan.speakerIds.length > 0
            ? panelPlan.speakerIds
            : existing?.speakerIds && existing.speakerIds.length > 0
              ? existing.speakerIds
              : cast.slice(0, 2).map((c) => c.id);
        const mapped = mapMadLibsToSpeakers(panelPlan.blocks, speakerIds, cast);
        return {
          panelIndex: panelPlan.panelIndex,
          speakerIds,
          arrangement:
            !randomizeLocks.staging
              ? panelPlan.arrangement
              : existing?.arrangement ?? defaultArrangementForCount(speakerIds.length || 1),
          blocks: normalizeDialogueBlocks(mapped, speakerIds, cast),
          text: { kind: 'none' as const },
          backgroundImage: existing?.backgroundImage,
          sceneId: panelPlan.sceneId,
          photoQuery: panelPlan.photoQuery,
        };
      });
    });
  }, [layout, cast, randomizeLocks.copy, randomizeLocks.staging, mapMadLibsToSpeakers]);

  const randomizePanelCopy = useCallback(
    (panelIndex: number) => {
      if (randomizeLocks.copy) return;
      const seed = Date.now() + panelIndex * 97;
      const plan = generateStoryPage(seed, layout, { cast, randomizeCast: false });
      const panelPlan = plan.panels[panelIndex];
      if (!panelPlan) return;
      setFills((current) => {
        const next = [...current];
        const existingIndex = next.findIndex((f) => f.panelIndex === panelIndex);
        const existing =
          existingIndex >= 0 ? next[existingIndex]! : defaultFillForPanel(panelIndex, cast);
        const speakerIds =
          existing.speakerIds && existing.speakerIds.length > 0
            ? existing.speakerIds
            : cast.slice(0, 2).map((c) => c.id);
        const mapped = mapMadLibsToSpeakers(panelPlan.blocks, speakerIds, cast);
        const row: PanelFillSpec = {
          ...existing,
          panelIndex,
          speakerIds,
          arrangement: existing.arrangement ?? defaultArrangementForCount(speakerIds.length || 1),
          blocks: normalizeDialogueBlocks(mapped, speakerIds, cast),
          text: { kind: 'none' },
          sceneId: panelPlan.sceneId,
          photoQuery: panelPlan.photoQuery,
        };
        if (existingIndex >= 0) next[existingIndex] = row;
        else next.push(row);
        return next;
      });
    },
    [cast, layout, mapMadLibsToSpeakers, randomizeLocks.copy],
  );

  const randomizeCast = useCallback(() => {
    if (randomizeLocks.cast) return;
    const seed = Date.now();
    setCastState((current) => {
      const count = Math.max(1, current.length);
      const shuffled = [...SCRAPBOARD_CAST_POOL].sort(
        (a, b) => ((seed + a.label.charCodeAt(0)) % 97) - ((seed + b.label.charCodeAt(0)) % 97),
      );
      return Array.from({ length: count }, (_, index) => {
        const pick = shuffled[index % shuffled.length]!;
        const existing = current[index];
        return {
          id: existing?.id ?? `cast-${index}`,
          emoji: pick.emoji,
          label: pick.label,
        };
      });
    });
  }, [randomizeLocks.cast]);

  const randomizePanelStaging = useCallback(
    (panelIndex: number) => {
      if (randomizeLocks.staging) return;
      const seed = Date.now() + panelIndex * 31;
      setFills((current) => {
        const next = [...current];
        const existingIndex = next.findIndex((f) => f.panelIndex === panelIndex);
        const existing =
          existingIndex >= 0 ? next[existingIndex]! : defaultFillForPanel(panelIndex, cast);
        const speakerCount = 1 + (Math.abs(seed) % Math.min(3, cast.length));
        const offset = Math.abs(seed >> 2) % cast.length;
        const speakerIds = Array.from({ length: speakerCount }, (_, i) => cast[(offset + i) % cast.length]!.id);
        const options = arrangementsForSpeakerCount(speakerCount);
        const arrangement =
          options[Math.abs(seed >> 3) % Math.max(1, options.length)]?.id ??
          defaultArrangementForCount(speakerCount);
        const row: PanelFillSpec = {
          ...existing,
          panelIndex,
          speakerIds,
          arrangement,
          blocks: normalizeDialogueBlocks(existing.blocks ?? [], speakerIds, cast),
        };
        if (existingIndex >= 0) next[existingIndex] = row;
        else next.push(row);
        return next;
      });
    },
    [cast, randomizeLocks.staging],
  );

  const randomizeLayout = useCallback(() => {
    if (randomizeLocks.layout) return;
    if (layoutCandidates.length === 0) return;
    const seed = Date.now();
    const pick = pickWeightedLayout(seed, layoutCandidates, selectedLayoutId);
    setSelectedLayoutId(pick.id);
    setFills((current) => fillsForLayout(pick, cast, current));
    setSelectedPanelIndex((current) => Math.min(current, pick.panels.length - 1));
  }, [cast, layoutCandidates, randomizeLocks.layout, selectedLayoutId]);

  const randomizeTrim = useCallback(() => {
    if (randomizeLocks.trim) return;
    const seed = Date.now();
    const preset = MIXAM_TRIM_PRESETS[Math.abs(seed) % MIXAM_TRIM_PRESETS.length]!;
    setPrintSpec((current) => ({
      ...current,
      presetId: preset.id,
      trimWidth: preset.width,
      trimHeight: preset.height,
    }));
  }, [randomizeLocks.trim]);

  const applyStoryPhotos = useCallback(
    async (
      seed: number,
      panelPlans: Array<{
        panelIndex: number;
        sceneId?: string;
        photoQuery?: string;
        blocks?: PanelTextBlock[];
      }>,
      pageOpts?: { usePageBackground: boolean; pagePhotoQuery: string | null },
    ) => {
      try {
        const groups = groupPanelsByScene(panelPlans);
        const sceneImage = new Map<string, PanelBackgroundImage | undefined>();
        let sceneOrdinal = 0;
        for (const [sceneId, indices] of groups) {
          const sample = panelPlans.find((p) => p.panelIndex === indices[0]);
          const query =
            sample?.photoQuery ??
            photoQueryFromBlocks(sample?.blocks, seed + sceneOrdinal * 41);
          const result = await fetchScenicWikimediaImageForQuery(query, seed + sceneOrdinal * 97);
          sceneImage.set(sceneId, scenicResultToPanelBackground(result));
          sceneOrdinal += 1;
        }
        setFills((current) =>
          current.map((fill) => {
            const plan = panelPlans.find((p) => p.panelIndex === fill.panelIndex);
            const sceneId = plan?.sceneId ?? fill.sceneId;
            const groupsKey =
              [...groups.entries()].find(([, idxs]) => idxs.includes(fill.panelIndex))?.[0] ??
              sceneId;
            const image = groupsKey ? sceneImage.get(groupsKey) : undefined;
            return {
              ...fill,
              sceneId: plan?.sceneId ?? fill.sceneId,
              photoQuery: plan?.photoQuery ?? fill.photoQuery,
              backgroundImage: image ?? fill.backgroundImage,
            };
          }),
        );

        if (pageOpts?.usePageBackground && pageOpts.pagePhotoQuery) {
          const pagePick = await fetchScenicWikimediaImageForQuery(
            pageOpts.pagePhotoQuery,
            seed + 401,
          );
          setPageBackgroundImage(scenicResultToPanelBackground(pagePick) ?? null);
        } else if (pageOpts && !pageOpts.usePageBackground) {
          setPageBackgroundImage(null);
        }
      } catch {
        /* Scenic fetch is best-effort — leave prior photos if Commons is unreachable. */
      }
    },
    [],
  );

  const randomizePhotos = useCallback(() => {
    if (randomizeLocks.photos) return;
    const seed = Date.now();
    void applyStoryPhotos(
      seed,
      fills.map((fill) => ({
        panelIndex: fill.panelIndex,
        sceneId: fill.sceneId,
        photoQuery: fill.photoQuery ?? photoQueryFromBlocks(fill.blocks, seed + fill.panelIndex),
        blocks: fill.blocks,
      })),
      {
        /* Photos-only dice: uncommon page background (~12%). */
        usePageBackground: seed % 100 < 12,
        pagePhotoQuery: photoQueryFromBlocks(fills[0]?.blocks, seed + 401),
      },
    );
  }, [applyStoryPhotos, fills, randomizeLocks.photos]);

  const randomizeAll = useCallback(
    (opts?: { randomizePalette?: () => void }) => {
      const seed = Date.now();
      let nextLayout = layout;
      const workingLayoutOptions = layoutOptions;

      if (!randomizeLocks.layout) {
        const nextCount = pickWeightedPanelCount(seed);
        const layouts = generateLayoutsForPanelCount(nextCount, workingLayoutOptions);
        nextLayout = pickWeightedLayout(seed >> 3, layouts);
        setPanelCountState(nextCount);
        setSelectedLayoutId(nextLayout.id);
        setSelectedPanelIndex(0);
      }

      if (!randomizeLocks.trim) {
        const preset = MIXAM_TRIM_PRESETS[Math.abs(seed >> 5) % MIXAM_TRIM_PRESETS.length]!;
        setPrintSpec((current) => ({
          ...current,
          presetId: preset.id,
          trimWidth: preset.width,
          trimHeight: preset.height,
        }));
      }

      if (!randomizeLocks.palette) {
        opts?.randomizePalette?.();
      }

      const plan: StoryPagePlan = generateStoryPage(seed, nextLayout, {
        cast,
        randomizeCast: !randomizeLocks.cast,
      });
      const nextCast = !randomizeLocks.cast ? plan.cast : cast;
      if (!randomizeLocks.cast) {
        setCastState(nextCast);
      }

      const nextFills: PanelFillSpec[] = nextLayout.panels.map((panel, panelIndex) => {
        const prior = fills.find((f) => f.panelIndex === panelIndex);
        const panelPlan = plan.panels[panelIndex];
        let speakerIds =
          prior?.speakerIds && prior.speakerIds.length > 0
            ? prior.speakerIds.filter((id) => nextCast.some((c) => c.id === id))
            : nextCast.slice(0, 2).map((c) => c.id);
        let arrangement =
          prior?.arrangement ?? defaultArrangementForCount(speakerIds.length || 1);

        if (!randomizeLocks.staging && panelPlan) {
          speakerIds = panelPlan.speakerIds.filter((id) => nextCast.some((c) => c.id === id));
          arrangement = panelPlan.arrangement;
        }
        if (speakerIds.length === 0) {
          speakerIds = nextCast.slice(0, 1).map((c) => c.id);
        }

        const bounds = panelPixelBounds(panel, BUDGET_PAGE_W, BUDGET_PAGE_H);
        let blocks = prior?.blocks ?? [];
        if (!randomizeLocks.copy && panelPlan) {
          const mapped = mapMadLibsToSpeakers(panelPlan.blocks, speakerIds, nextCast);
          blocks = adaptBlocksToPanelBudget(mapped, bounds);
        } else {
          blocks = adaptBlocksToPanelBudget(blocks, bounds);
        }

        return {
          panelIndex,
          speakerIds,
          arrangement,
          blocks: normalizeDialogueBlocks(blocks, speakerIds, nextCast),
          text: { kind: 'none' as const },
          backgroundImage: prior?.backgroundImage,
          sceneId: panelPlan?.sceneId,
          photoQuery: panelPlan?.photoQuery,
        };
      });

      setFills(nextFills);

      if (!randomizeLocks.photos) {
        void applyStoryPhotos(
          seed,
          plan.panels.map((p) => ({
            panelIndex: p.panelIndex,
            sceneId: p.sceneId,
            photoQuery: p.photoQuery,
            blocks: p.blocks,
          })),
          {
            usePageBackground: plan.usePageBackground,
            pagePhotoQuery: plan.pagePhotoQuery,
          },
        );
      }
    },
    [
      cast,
      fills,
      layout,
      layoutOptions,
      mapMadLibsToSpeakers,
      randomizeLocks,
      applyStoryPhotos,
    ],
  );

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
    randomizeLocks,
    toggleRandomizeLock,
    randomizeText,
    randomizePanelCopy,
    randomizeCast,
    randomizePanelStaging,
    randomizeLayout,
    randomizeTrim,
    randomizePhotos,
    randomizeAll,
  };
}
