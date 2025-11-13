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
  heroName: string; // Just the name part (e.g., "Kimberly Brown")
  flaw: string;
  initialSetting: string;
  act2Setting: string;
  bStoryCharacter: string;
  bStoryCharacterName: string; // Name for the B Story character
  nemesis: string;
  nemesisName: string; // Name for the nemesis
  minorCharacterName: string; // Name for the minor character in Theme Stated
  logline: string; // Generated logline based on genre template
  // Logline elements - the specific elements from the logline that should be reused
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loglineElements: any; // Genre-specific logline elements (BuddyLoveElements, MonsterInTheHouseElements, etc.)
  // Storage for all generated content to prevent unwanted regeneration
  generatedContent: { [key: string]: string };
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

