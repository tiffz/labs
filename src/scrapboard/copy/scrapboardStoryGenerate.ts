import {
  adaptBlocksToPanelBudget,
  arrangementsForSpeakerCount,
  defaultArrangementForCount,
  maxDialogueBlocksForPanel,
  panelPixelBounds,
  type CharacterArrangementId,
  type ComicCastMember,
  type GeneratedPanelLayout,
  type PanelCharacterId,
  type PanelTextBlock,
} from '../../shared/comic';
import {
  FULL_BLEED_LAYOUT_WEIGHT_SCALE,
  PAGE_BACKGROUND_CHANCE,
  PANEL_COUNT_WEIGHTS,
  SCRAPBOARD_CAST_POOL_TAGGED,
  STORY_THEMES,
  type ScrapboardCastArchetype,
  type ScrapboardCastPoolEntry,
  type StorySceneDef,
  type StoryThemeDef,
} from './scrapboardStoryThemes';

const BUDGET_PAGE_W = 520;
const BUDGET_PAGE_H = 720;

const SFX_WORDS = ['THONK', 'SKRR', 'WHOMP', 'PING', 'FWOOSH', 'CLACK', 'BZZT', 'SPLISH'] as const;

type BeatKind = 'establish' | 'turn' | 'reaction' | 'payoff' | 'bridge' | 'silent';

export type StoryPanelPlan = {
  panelIndex: number;
  sceneId: string;
  photoQuery: string;
  sceneChanged: boolean;
  speakerIds: string[];
  arrangement: CharacterArrangementId;
  blocks: PanelTextBlock[];
};

export type StoryPagePlan = {
  themeId: string;
  themeLabel: string;
  cast: ComicCastMember[];
  panels: StoryPanelPlan[];
  usePageBackground: boolean;
  pagePhotoQuery: string | null;
};

function seeded(seed: number): () => number {
  let state = Math.abs(seed) >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function pick<T>(rng: () => number, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)]!;
}

function weightedPick<T>(rng: () => number, items: readonly T[], weightOf: (item: T) => number): T {
  let total = 0;
  const weights = items.map((item) => {
    const w = Math.max(0, weightOf(item));
    total += w;
    return w;
  });
  if (total <= 0) return pick(rng, items);
  let roll = rng() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i]!;
    if (roll <= 0) return items[i]!;
  }
  return items[items.length - 1]!;
}

export function pickWeightedPanelCount(seed: number): number {
  const rng = seeded(seed ^ 0x9e3779b9);
  return weightedPick(rng, PANEL_COUNT_WEIGHTS, (row) => row.weight).count;
}

export function pickWeightedLayout(
  seed: number,
  layouts: GeneratedPanelLayout[],
  excludeId?: string,
): GeneratedPanelLayout {
  const rng = seeded(seed ^ 0x85ebca6b);
  const pool =
    excludeId && layouts.some((row) => row.id !== excludeId)
      ? layouts.filter((row) => row.id !== excludeId)
      : layouts;
  return weightedPick(rng, pool, (layout) => {
    const base = Math.max(0.02, layout.conventionality) ** 2.2;
    const bleedish =
      layout.conventionality < 0.2 ||
      /full-bleed|open-bleed|bleed/i.test(layout.id) ||
      /full-bleed|open-bleed|bleed/i.test(layout.label ?? '');
    return bleedish ? base * FULL_BLEED_LAYOUT_WEIGHT_SCALE : base;
  });
}

function themeCastScore(entry: ScrapboardCastPoolEntry, bias: readonly ScrapboardCastArchetype[]): number {
  let score = 0.15;
  for (const tag of entry.tags) {
    if (bias.includes(tag)) score += 1;
  }
  return score;
}

export function pickStoryCast(seed: number, theme: StoryThemeDef, count: number): ComicCastMember[] {
  const rng = seeded(seed ^ 0xc2b2ae35);
  const n = Math.max(2, Math.min(5, count));
  const available = [...SCRAPBOARD_CAST_POOL_TAGGED];
  const picked: ScrapboardCastPoolEntry[] = [];
  for (let i = 0; i < n && available.length > 0; i++) {
    const choice = weightedPick(rng, available, (entry) => themeCastScore(entry, theme.castBias));
    picked.push(choice);
    const idx = available.indexOf(choice);
    if (idx >= 0) available.splice(idx, 1);
  }
  return picked.map((entry, index) => ({
    id: `cast-${index}`,
    emoji: entry.emoji,
    label: entry.label,
  }));
}

function pickTheme(rng: () => number): StoryThemeDef {
  return pick(rng, STORY_THEMES);
}

function fillTokens(
  template: string,
  rng: () => number,
  scene: StorySceneDef,
  names: { a?: string; b?: string; c?: string },
): string {
  return template
    .replaceAll('{adjective}', pick(rng, scene.adjectives))
    .replaceAll('{noun}', pick(rng, scene.nouns))
    .replaceAll('{place}', pick(rng, scene.places))
    .replaceAll('{nameA}', names.a ?? 'Alex')
    .replaceAll('{nameB}', names.b ?? 'Riley')
    .replaceAll('{nameC}', names.c ?? 'Sam');
}

type LineTemplate = { speaker: PanelCharacterId; template: string };

const ESTABLISH_CAPTIONS = [
  'Meanwhile, near {place}…',
  'Cut to: {place}.',
  'In {place}, somehow.',
  'Not long after.',
];

const TURN_CAPTIONS = [
  'Then — the {noun}.',
  'Cut to: {adjective} {noun}.',
  'Across {place}.',
  'Seconds later.',
];

const PAYOFF_CAPTIONS = ['Behold: the {noun}.', 'Elsewhere.', 'Exactly {adjective} o’clock.'];

const EXCHANGES: Record<BeatKind, LineTemplate[][]> = {
  establish: [
    [
      { speaker: 'a', template: '{nameB}, why is there a {adjective} {noun} in {place}?' },
      { speaker: 'b', template: 'I told you not to bring the {noun}.' },
    ],
    [
      { speaker: 'a', template: 'Okay but {place} looks… {adjective}.' },
      { speaker: 'b', template: 'Keep the {noun} between us.' },
    ],
    [
      { speaker: 'a', template: 'Check {place} one more time.' },
      { speaker: 'b', template: 'Pass me the {noun} — carefully.' },
    ],
  ],
  turn: [
    [
      { speaker: 'a', template: 'Is that a {adjective} {noun}?' },
      { speaker: 'b', template: 'Worse. It is mine.' },
    ],
    [
      { speaker: 'b', template: 'We should leave {place}.' },
      { speaker: 'a', template: 'After I grab the {noun}.' },
      { speaker: 'c', template: 'Both of you, no.' },
    ],
    [
      { speaker: 'a', template: 'Who left {place} unlocked?' },
      { speaker: 'b', template: 'Ask {nameC} about the {noun}.' },
    ],
  ],
  reaction: [
    [
      { speaker: 'b', template: 'Nobody panic.' },
      { speaker: 'a', template: 'I am panicking about the {noun}, {nameB}.' },
    ],
    [
      { speaker: 'c', template: '{place} is compromised.' },
      { speaker: 'a', template: 'By what?' },
      { speaker: 'b', template: 'A very confident {noun}.' },
    ],
    [
      { speaker: 'a', template: 'If this is a prank, it is too {adjective}.' },
      { speaker: 'b', template: 'Trade you a {noun} for silence.' },
    ],
  ],
  payoff: [
    [
      { speaker: 'a', template: 'Plan B!' },
      { speaker: 'b', template: 'We never finished Plan A.' },
      { speaker: 'c', template: 'Good — skip to C.' },
    ],
    [
      { speaker: 'b', template: 'My plan did not include a {noun}.' },
      { speaker: 'a', template: 'Neither did {place}.' },
    ],
    [
      { speaker: 'c', template: 'We are absolutely not discussing the {noun} again.' },
      { speaker: 'a', template: 'Speak for yourself, {nameC}.' },
    ],
  ],
  bridge: [
    [
      { speaker: 'a', template: 'Quick, hide the {noun} behind {place}.' },
      { speaker: 'b', template: 'This is not how {place} works.' },
    ],
    [{ speaker: 'a', template: 'I can explain the {noun}.' }],
  ],
  silent: [],
};

function beatForIndex(panelIndex: number, panelCount: number, maxDialogue: number): BeatKind {
  if (maxDialogue <= 0) return 'silent';
  if (panelCount <= 1) return 'establish';
  if (panelIndex === 0) return 'establish';
  if (panelIndex === panelCount - 1) return 'payoff';
  const t = panelIndex / Math.max(1, panelCount - 1);
  if (t < 0.35) return 'turn';
  if (t < 0.65) return 'reaction';
  if (t < 0.85) return 'bridge';
  return 'payoff';
}

function shouldChangeScene(
  rng: () => number,
  panelIndex: number,
  panelsInScene: number,
  beat: BeatKind,
): boolean {
  if (panelIndex === 0) return false;
  /* Time-cut beats + long stays in one locale should move the camera. */
  if (beat === 'bridge' || beat === 'payoff') return panelsInScene >= 1 ? rng() < 0.75 : rng() < 0.4;
  if (beat === 'establish' || beat === 'turn') return panelsInScene >= 2 ? rng() < 0.55 : rng() < 0.2;
  if (panelsInScene >= 3) return rng() < 0.8;
  if (panelsInScene >= 2) return rng() < 0.45;
  return rng() < 0.18;
}

function namesForSpeakers(
  cast: ComicCastMember[],
  speakerIds: string[],
): { a?: string; b?: string; c?: string } {
  const labels = speakerIds.map((id) => cast.find((c) => c.id === id)?.label).filter(Boolean) as string[];
  return { a: labels[0], b: labels[1] ?? labels[0], c: labels[2] ?? labels[1] ?? labels[0] };
}

function buildBlocksForBeat(
  rng: () => number,
  beat: BeatKind,
  scene: StorySceneDef,
  sceneChanged: boolean,
  maxDialogue: number,
  cast: ComicCastMember[],
  speakerIds: string[],
): PanelTextBlock[] {
  if (beat === 'silent' || maxDialogue <= 0) {
    if (rng() < 0.35) {
      return [{ kind: 'sfx', content: pick(rng, SFX_WORDS), loudness: pick(rng, ['quiet', 'normal'] as const) }];
    }
    return [];
  }

  const names = namesForSpeakers(cast, speakerIds);
  const blocks: PanelTextBlock[] = [];

  if (sceneChanged || beat === 'establish') {
    const captions = beat === 'payoff' ? PAYOFF_CAPTIONS : beat === 'establish' ? ESTABLISH_CAPTIONS : TURN_CAPTIONS;
    if (rng() < (sceneChanged ? 0.9 : 0.45)) {
      blocks.push({
        kind: 'caption',
        content: fillTokens(pick(rng, captions), rng, scene, names),
      });
    }
  }

  const exchangePool = EXCHANGES[beat];
  const exchange = pick(rng, exchangePool.length > 0 ? exchangePool : EXCHANGES.bridge);
  const speakerSlots = speakerIds.length;
  let dialogueAdded = 0;
  for (const line of exchange) {
    if (dialogueAdded >= maxDialogue) break;
    const slotIndex = Math.max(0, ['a', 'b', 'c'].indexOf(line.speaker)) % Math.max(1, speakerSlots);
    // Skip lines for missing speakers unless we can remap to an existing slot.
    if (line.speaker === 'c' && speakerSlots < 3 && rng() < 0.5) continue;
    let content = fillTokens(line.template, rng, scene, names);
    /* Tight panels: keep a short clause so balloons don’t hard-ellipsis mid-word. */
    if (maxDialogue <= 1 && content.length > 42) {
      content = `${content.slice(0, 39).trim()}…`;
    }
    blocks.push({
      kind: 'dialogue',
      characterId: (['a', 'b', 'c'] as PanelCharacterId[])[slotIndex]!,
      content,
    });
    dialogueAdded++;
  }

  if (dialogueAdded === 0 && maxDialogue > 0) {
    blocks.push({
      kind: 'dialogue',
      characterId: 'a',
      content: fillTokens(
        maxDialogue <= 1 ? 'Keep the {noun} quiet.' : '{nameA}: keep the {noun} quiet near {place}.',
        rng,
        scene,
        names,
      ),
    });
  }

  if (rng() < 0.14 && maxDialogue >= 1) {
    blocks.push({
      kind: 'sfx',
      content: pick(rng, SFX_WORDS),
      loudness: pick(rng, ['normal', 'loud', 'quiet'] as const),
    });
  }

  return blocks;
}

function pickSpeakers(
  rng: () => number,
  cast: ComicCastMember[],
  maxDialogue: number,
  beat: BeatKind,
): string[] {
  if (cast.length === 0) return [];
  const maxOnPanel = Math.min(3, cast.length, maxDialogue === 0 ? 1 : maxDialogue >= 3 ? 3 : maxDialogue >= 2 ? 3 : 2);
  let count = 1;
  if (maxOnPanel >= 2 && (beat === 'turn' || beat === 'reaction' || beat === 'payoff')) {
    count = 2 + (rng() < 0.35 && maxOnPanel >= 3 ? 1 : 0);
  } else if (maxOnPanel >= 2 && rng() < 0.55) {
    count = 2;
  }
  count = Math.min(count, maxOnPanel);
  const offset = Math.floor(rng() * cast.length);
  return Array.from({ length: count }, (_, i) => cast[(offset + i) % cast.length]!.id);
}

/**
 * Build a full-page story plan sized to the chosen layout panels.
 * Dialogue is budgeted per panel bounds before return.
 */
export function generateStoryPage(
  seed: number,
  layout: GeneratedPanelLayout,
  options?: {
    cast?: ComicCastMember[];
    /** When false, keep provided cast as-is (still theme-picks if cast omitted). */
    randomizeCast?: boolean;
  },
): StoryPagePlan {
  const rng = seeded(seed);
  const theme = pickTheme(rng);
  const castCount = 2 + Math.floor(rng() * 3);
  const cast =
    options?.randomizeCast === false && options.cast && options.cast.length > 0
      ? options.cast
      : pickStoryCast(seed + 17, theme, castCount);

  let sceneIndex = 0;
  let panelsInScene = 0;
  const panels: StoryPanelPlan[] = [];

  for (let panelIndex = 0; panelIndex < layout.panels.length; panelIndex++) {
    const panel = layout.panels[panelIndex]!;
    const bounds = panelPixelBounds(panel, BUDGET_PAGE_W, BUDGET_PAGE_H);
    const maxDialogue = maxDialogueBlocksForPanel(bounds);
    const beat = beatForIndex(panelIndex, layout.panels.length, maxDialogue);
    const change = shouldChangeScene(rng, panelIndex, panelsInScene, beat);
    if (change) {
      sceneIndex = (sceneIndex + 1) % theme.scenes.length;
      panelsInScene = 1;
    } else {
      panelsInScene += 1;
    }
    const scene = theme.scenes[sceneIndex]!;
    const sceneChanged = panelIndex === 0 || change;
    const speakerIds = pickSpeakers(rng, cast, maxDialogue, beat);
    const arrangementOptions = arrangementsForSpeakerCount(speakerIds.length || 1);
    const arrangement =
      arrangementOptions[Math.floor(rng() * arrangementOptions.length)]?.id ??
      defaultArrangementForCount(speakerIds.length || 1);
    const rawBlocks = buildBlocksForBeat(
      rng,
      beat,
      scene,
      sceneChanged,
      maxDialogue,
      cast,
      speakerIds,
    );
    const blocks = adaptBlocksToPanelBudget(rawBlocks, bounds);
    panels.push({
      panelIndex,
      sceneId: `${theme.id}:${scene.id}`,
      photoQuery: pick(rng, scene.photoQueries),
      sceneChanged,
      speakerIds,
      arrangement,
      blocks,
    });
  }

  const usePageBackground = rng() < PAGE_BACKGROUND_CHANCE;
  const pagePhotoQuery = usePageBackground
    ? pick(rng, theme.scenes[0]!.photoQueries).replace('photograph', 'wide landscape photograph')
    : null;

  return {
    themeId: theme.id,
    themeLabel: theme.label,
    cast,
    panels,
    usePageBackground,
    pagePhotoQuery,
  };
}

/** Derive a scenic query from existing panel dialogue when re-rolling photos alone. */
export function photoQueryFromBlocks(blocks: PanelTextBlock[] | undefined, fallbackSeed: number): string {
  const text = (blocks ?? [])
    .map((b) => b.content)
    .join(' ')
    .toLowerCase();
  for (const theme of STORY_THEMES) {
    for (const scene of theme.scenes) {
      if (scene.places.some((p) => text.includes(p.toLowerCase().replace(/^the /, '')))) {
        return scene.photoQueries[fallbackSeed % scene.photoQueries.length]!;
      }
      if (scene.nouns.some((n) => text.includes(n.toLowerCase()))) {
        return scene.photoQueries[(fallbackSeed >> 2) % scene.photoQueries.length]!;
      }
    }
  }
  const allQueries = STORY_THEMES.flatMap((t) => t.scenes.flatMap((s) => [...s.photoQueries]));
  return allQueries[Math.abs(fallbackSeed) % allQueries.length]!;
}

export function sceneKeyFromBlocks(blocks: PanelTextBlock[] | undefined, panelIndex: number): string {
  const caption = (blocks ?? []).find((b) => b.kind === 'caption')?.content ?? '';
  if (/cut to|meanwhile|elsewhere|across/i.test(caption)) {
    return `caption-shift-${panelIndex}`;
  }
  const placeMatch = caption.match(/\b(?:near|in|across)\s+([^.…]+)/i);
  if (placeMatch?.[1]) return `place:${placeMatch[1].trim().toLowerCase()}`;
  return `panel-local-${panelIndex}`;
}

/** Group panel indices that should share one background fetch. */
export function groupPanelsByScene(
  panels: Array<{ panelIndex: number; sceneId?: string; blocks?: PanelTextBlock[] }>,
): Map<string, number[]> {
  const groups = new Map<string, number[]>();
  let lastScene = '';
  for (const panel of panels) {
    const key =
      panel.sceneId ??
      (() => {
        const derived = sceneKeyFromBlocks(panel.blocks, panel.panelIndex);
        // Continuity: keep prior scene unless caption implies a cut.
        if (!panel.sceneId && /caption-shift|cut to|meanwhile|elsewhere/i.test(derived)) {
          return derived;
        }
        if (!panel.sceneId && lastScene && !derived.startsWith('caption-shift')) {
          return lastScene;
        }
        return derived;
      })();
    lastScene = key;
    const list = groups.get(key) ?? [];
    list.push(panel.panelIndex);
    groups.set(key, list);
  }
  return groups;
}
