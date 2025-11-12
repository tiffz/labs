export interface Beat {
  name: string;
  prompt: string;
  act: string | number;
  sub: string[];
}

export interface StoryDNA {
  genre: string;
  theme: string;
  hero: string;
  flaw: string;
  initialSetting: string;
  act2Setting: string;
  bStoryCharacter: string;
  nemesis: string;
}

export interface GenreElements {
  [key: string]: string[];
}

export interface GenreElementDescriptions {
  [key: string]: string;
}

export interface Genres {
  [key: string]: string;
}

export interface SuggestionEngine {
  heroAdjectives: string[];
  heroNouns: string[];
  nemesisAdjectives: string[];
  nemesisNouns: string[];
  themeFlaws: { [theme: string]: string[] };
  bStoryCharacters: string[];
  act1Settings: string[];
  act2Settings: string[];
  catalystEvents: string[];
  midpointEvents: string[];
  whiffsOfDeath: string[];
  finaleStakes: string[];
  epiphanies: string[];
  [key: string]: string[] | { [key: string]: string[] };
}

