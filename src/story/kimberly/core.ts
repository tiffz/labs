/**
 * The Kimberly System - Core Utilities
 * 
 * A composable random content generation system using semantically-named functions.
 * Named after the principle that specific examples (like "Kimberly") make templates
 * easier to reason about than abstract placeholders.
 */

/**
 * Randomly selects one item from an array with optional weights.
 * If weights are provided, uses weighted random selection.
 * If no weights, uses uniform distribution.
 */
export function pick<T>(items: T[], weights?: number[]): T {
  if (items.length === 0) {
    throw new Error('Cannot pick from empty array');
  }

  if (!weights || weights.length === 0) {
    return items[Math.floor(Math.random() * items.length)];
  }

  if (weights.length !== items.length) {
    throw new Error('Weights array must match items array length');
  }

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }

  return items[items.length - 1];
}

/**
 * Type for generator functions - functions that return random strings
 */
export type Generator = () => string;

/**
 * Type for weighted generator functions with explicit weights
 */
export type WeightedGenerator = {
  fn: Generator;
  weight: number;
};

/**
 * Picks and executes one generator from a list of generators.
 * Useful for choosing between different generation strategies.
 */
export function pickGenerator(generators: Generator[], weights?: number[]): string {
  const chosen = pick(generators, weights);
  return chosen();
}

/**
 * Picks and executes one generator from a list of weighted generators.
 */
export function pickWeightedGenerator(generators: WeightedGenerator[]): string {
  const chosen = pick(
    generators.map(g => g.fn),
    generators.map(g => g.weight)
  );
  return chosen();
}

/**
 * Capitalizes the first letter of a string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Returns "a" or "an" based on the next word
 * Handles special cases like "hour", "honest", "university", etc.
 */
export function article(word: string): string {
  if (!word) return 'a';
  
  const lower = word.toLowerCase();
  
  // Special cases: words starting with silent 'h'
  const silentH = ['hour', 'honest', 'honor', 'heir'];
  if (silentH.some(h => lower.startsWith(h))) {
    return 'an';
  }
  
  // Special cases: words starting with vowel sound despite consonant
  // (like "university" which sounds like "you-niversity")
  const consonantSound = ['university', 'european', 'one', 'once', 'unique', 'uniform', 'union', 'united', 'usual'];
  if (consonantSound.some(c => lower.startsWith(c))) {
    return 'a';
  }
  
  // Standard vowel check
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  const firstLetter = lower.charAt(0);
  return vowels.includes(firstLetter) ? 'an' : 'a';
}

/**
 * Returns "a" or "an" followed by the word
 * Example: a("ambitious coder") => "an ambitious coder"
 * Example: a("ruthless CEO") => "a ruthless CEO"
 */
export function a(phrase: string): string {
  if (!phrase) return '';
  return `${article(phrase)} ${phrase}`;
}

/**
 * Template literal tag for the Kimberly system.
 * Allows using generators in template strings.
 * 
 * Example: k`${Kimberly()} is ${evil()}`
 */
export function k(strings: TemplateStringsArray, ...values: (string | Generator)[]): string {
  let result = '';
  for (let i = 0; i < strings.length; i++) {
    result += strings[i];
    if (i < values.length) {
      const value = values[i];
      result += typeof value === 'function' ? value() : value;
    }
  }
  return result;
}

