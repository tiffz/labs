/** Oklch color state used across Labs color tools. */
export interface ColorState {
  h: number;
  c: number;
  l: number;
}

export type HarmonySystem = 'complementary' | 'splitComplementary' | 'triadic' | 'tetradic' | 'analogous';

export type PaletteExtractionMethod =
  | 'centroid'
  | 'vivid'
  | 'accent'
  | 'extremes'
  | 'spread';

export interface PaletteProposal {
  id: string;
  label: string;
  rule: HarmonySystem | 'dominant' | 'muted';
  method?: HarmonySystem | 'dominant' | 'muted' | PaletteExtractionMethod | 'seed' | 'random';
  colors: ColorState[];
}
