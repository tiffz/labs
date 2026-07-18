/** Cast archetype tags — used to bias emoji picks toward the story theme. */
export type ScrapboardCastArchetype =
  | 'person'
  | 'kid'
  | 'elder'
  | 'dog'
  | 'cat'
  | 'critter'
  | 'fantasy';

export type ScrapboardCastPoolEntry = {
  emoji: string;
  label: string;
  tags: readonly ScrapboardCastArchetype[];
};

/** Tagged cast pool (replaces bare emoji list for story-aware randomization). */
export const SCRAPBOARD_CAST_POOL_TAGGED: readonly ScrapboardCastPoolEntry[] = [
  { emoji: '🧑', label: 'Alex', tags: ['person'] },
  { emoji: '👩', label: 'Riley', tags: ['person'] },
  { emoji: '🧒', label: 'Sam', tags: ['kid', 'person'] },
  { emoji: '🧔', label: 'Jordan', tags: ['person'] },
  { emoji: '👱', label: 'Casey', tags: ['person'] },
  { emoji: '👴', label: 'Morgan', tags: ['elder', 'person'] },
  { emoji: '👵', label: 'Quinn', tags: ['elder', 'person'] },
  { emoji: '🐱', label: 'Miso', tags: ['cat', 'critter'] },
  { emoji: '🐶', label: 'Bean', tags: ['dog', 'critter'] },
  { emoji: '🦊', label: 'Rusty', tags: ['critter'] },
  { emoji: '🐼', label: 'Pebble', tags: ['critter'] },
  { emoji: '🦉', label: 'Owl', tags: ['critter'] },
  { emoji: '🐸', label: 'Pip', tags: ['critter'] },
  { emoji: '🐧', label: 'Waddle', tags: ['critter'] },
  { emoji: '🦄', label: 'Nova', tags: ['fantasy'] },
];

export type StorySceneDef = {
  id: string;
  /** Wikimedia Commons search phrases biased to this locale. */
  photoQueries: readonly string[];
  places: readonly string[];
  nouns: readonly string[];
  adjectives: readonly string[];
};

export type StoryThemeDef = {
  id: string;
  label: string;
  castBias: readonly ScrapboardCastArchetype[];
  scenes: readonly StorySceneDef[];
};

/**
 * Story themes — each comic picks one theme, then walks scenes with continuity.
 * Photo queries are keyword approximations (not vision matching).
 */
export const STORY_THEMES: readonly StoryThemeDef[] = [
  {
    id: 'backstage-caper',
    label: 'Backstage caper',
    castBias: ['person', 'person', 'critter'],
    scenes: [
      {
        id: 'green-room',
        photoQueries: ['theater green room photograph', 'dressing room interior photograph'],
        places: ['the green room', 'backstage', 'the prop closet'],
        nouns: ['call sheet', 'fog machine', 'spare key', 'rubber chicken'],
        adjectives: ['dramatic', 'forbidden', 'sleepy', 'overconfident'],
      },
      {
        id: 'loading-dock',
        photoQueries: ['loading dock warehouse photograph', 'stage door alley photograph'],
        places: ['the loading dock', 'stage door', 'the freight elevator'],
        nouns: ['ladder', 'traffic cone', 'umbrella', 'lunchbox'],
        adjectives: ['damp', 'suspicious', 'budget', 'feral'],
      },
      {
        id: 'wings',
        photoQueries: ['theater stage wings photograph', 'curtain stage photograph'],
        places: ['the wings', 'row G', 'curtain left'],
        nouns: ['metronome', 'accordion', 'houseplant', 'library card'],
        adjectives: ['glowing', 'tiny', 'sparkly', 'slightly cursed'],
      },
    ],
  },
  {
    id: 'park-errand',
    label: 'Park errand',
    castBias: ['person', 'kid', 'dog'],
    scenes: [
      {
        id: 'park-path',
        photoQueries: ['park pathway photograph', 'city park path photograph'],
        places: ['the park path', 'the fountain', 'bench three'],
        nouns: ['sandwich', 'frisbee', 'treasure map', 'leash'],
        adjectives: ['tiny', 'sparkly', 'sleepy', 'suspicious'],
      },
      {
        id: 'pond',
        photoQueries: ['park pond landscape photograph', 'duck pond photograph'],
        places: ['the pond', 'low tide', 'the reed bank'],
        nouns: ['goose', 'umbrella', 'bread crust', 'boat'],
        adjectives: ['damp', 'dramatic', 'unlicensed', 'feral'],
      },
      {
        id: 'cafe',
        photoQueries: ['cafe interior photograph', 'coffee shop window photograph'],
        places: ['the cafe', 'the patio table', 'the tip jar'],
        nouns: ['lunchbox', 'library card', 'pastry', 'spare key'],
        adjectives: ['budget', 'overconfident', 'forbidden', 'glowing'],
      },
    ],
  },
  {
    id: 'library-mystery',
    label: 'Library mystery',
    castBias: ['person', 'elder', 'critter'],
    scenes: [
      {
        id: 'stacks',
        photoQueries: ['library interior photograph', 'library bookshelf photograph'],
        places: ['the stacks', 'aisle B', 'the quiet carrel'],
        nouns: ['library card', 'treasure map', 'houseplant', 'metronome'],
        adjectives: ['forbidden', 'haunted', 'sleepy', 'suspicious'],
      },
      {
        id: 'archives',
        photoQueries: ['archive room photograph', 'old library basement photograph'],
        places: ['the archives', 'the supply closet', 'the wrong timeline'],
        nouns: ['spare key', 'ladder', 'fog machine', 'accordion'],
        adjectives: ['slightly cursed', 'damp', 'unlicensed', 'dramatic'],
      },
      {
        id: 'street',
        photoQueries: ['rainy street photograph', 'city street photograph'],
        places: ['the parking lot', 'nowhere useful', 'the bus stop'],
        nouns: ['umbrella', 'traffic cone', 'sandwich', 'submarine'],
        adjectives: ['budget', 'overflowing', 'glowing', 'feral'],
      },
    ],
  },
  {
    id: 'coastal-detour',
    label: 'Coastal detour',
    castBias: ['person', 'person', 'fantasy'],
    scenes: [
      {
        id: 'beach',
        photoQueries: ['beach horizon photograph', 'coastal beach landscape photograph'],
        places: ['low tide', 'the dune path', 'the jetty'],
        nouns: ['treasure map', 'umbrella', 'submarine', 'rubber chicken'],
        adjectives: ['sparkly', 'damp', 'dramatic', 'tiny'],
      },
      {
        id: 'boardwalk',
        photoQueries: ['boardwalk pier photograph', 'seaside promenade photograph'],
        places: ['the boardwalk', 'the snack shack', 'pier end'],
        nouns: ['sandwich', 'fog machine', 'accordion', 'traffic cone'],
        adjectives: ['overconfident', 'budget', 'glowing', 'suspicious'],
      },
      {
        id: 'cliff',
        photoQueries: ['coastal cliff landscape photograph', 'ocean overlook photograph'],
        places: ['the overlook', 'a hedge maze', 'the wrong timeline'],
        nouns: ['ladder', 'houseplant', 'metronome', 'spare key'],
        adjectives: ['haunted', 'forbidden', 'slightly cursed', 'feral'],
      },
    ],
  },
  {
    id: 'city-hustle',
    label: 'City hustle',
    castBias: ['person', 'person', 'cat'],
    scenes: [
      {
        id: 'street',
        photoQueries: ['city street photograph', 'busy sidewalk photograph'],
        places: ['the crosswalk', 'the parking lot', 'row G'],
        nouns: ['traffic cone', 'umbrella', 'lunchbox', 'spare key'],
        adjectives: ['overconfident', 'budget', 'suspicious', 'dramatic'],
      },
      {
        id: 'rooftop',
        photoQueries: ['city rooftop skyline photograph', 'skyline photograph'],
        places: ['the rooftop', 'the fire escape', 'nowhere useful'],
        nouns: ['ladder', 'sandwich', 'fog machine', 'treasure map'],
        adjectives: ['glowing', 'forbidden', 'tiny', 'sleepy'],
      },
      {
        id: 'subway',
        photoQueries: ['subway station photograph', 'metro platform photograph'],
        places: ['the platform', 'the freight elevator', 'car three'],
        nouns: ['metronome', 'library card', 'accordion', 'houseplant'],
        adjectives: ['damp', 'unlicensed', 'overflowing', 'feral'],
      },
    ],
  },
];

/** Panel-count weights — favor common comic page densities (4–6). */
export const PANEL_COUNT_WEIGHTS: ReadonlyArray<{ count: number; weight: number }> = [
  { count: 2, weight: 2 },
  { count: 3, weight: 10 },
  { count: 4, weight: 28 },
  { count: 5, weight: 22 },
  { count: 6, weight: 18 },
  { count: 7, weight: 8 },
  { count: 8, weight: 7 },
  { count: 9, weight: 3 },
  { count: 10, weight: 2 },
];

/** Chance Randomize all applies a whole-page background photo (uncommon). */
export const PAGE_BACKGROUND_CHANCE = 0.12;

/** Soft multiplier when sampling layouts that are full-bleed / low conventionality. */
export const FULL_BLEED_LAYOUT_WEIGHT_SCALE = 0.06;
