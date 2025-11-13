/**
 * The Kimberly System
 * 
 * A composable random content generation system using semantically-named functions.
 * 
 * Usage:
 * ```typescript
 * import { k } from './kimberly';
 * 
 * // Simple generation
 * const villain = `${k.evil()} ${k.worker()}`;
 * 
 * // With character state
 * const hero = k.createHero('female');
 * const scene = `${hero.Kimberly()} stood in ${k.scenicLocation()} thinking about ${hero.her()} ${k.currentStruggle()}`;
 * 
 * // Using template tag
 * const text = k`${hero.Kimberly()} is ${k.evil()}`;
 * ```
 */

// Export core utilities
export { 
  pick, 
  pickGenerator, 
  pickWeightedGenerator, 
  capitalize, 
  article, 
  k as template,
  type Generator,
  type WeightedGenerator
} from './core';

// Import pick and other core utilities for use in the k namespace
import { pick, pickGenerator, capitalize, article, a } from './core';

// Export realistic name generators (primary system)
export * from './realistic-names';

// Export specific name generators from old system (excluding conflicts)
export { 
  Liam, Margaret, Arthur, Zara, Orion, Aria, Cassius, Alex,
  femaleName, maleName, anyName
} from './names';

// Export all adjective generators
export * from './adjectives';

// Export all occupation generators
export * from './occupations';

// Export all location generators
export * from './locations';

// Export all story element generators
export * from './story-elements';

// Export nemesis generators
export * from './nemesis';

// Export identity generators
export * from './identities';

// Export logline generators
export * from './loglines';

// Export logline elements
export * from './logline-elements';

// Export genre-specific elements
export * from './genre-specific-elements';

// Export theme-based flaw generators
export * from './themes';

// Export settings generators
export * from './settings';

// Export specific detail generators
export * from './specific-details';

// Export genre-specific element generators
export * from './genre-elements';

// Export beat-specific generators
export * from './beats';

// Export Character class and factory functions
export {
  Character,
  createHero,
  createVillain,
  createMentor,
  createSidekick,
  createLoveInterest,
  createRival,
  createSupportingCharacter,
  type Gender,
  type CharacterRole
} from './Character';

/**
 * Main namespace for the Kimberly System
 * Use this for clean, short imports: k.Kimberly(), k.evil(), k.worker(), etc.
 */
import * as names from './names';
import * as realisticNames from './realistic-names';
import * as adjectives from './adjectives';
import * as occupations from './occupations';
import * as locations from './locations';
import * as storyElements from './story-elements';
import * as themes from './themes';
import * as settings from './settings';
import * as specificDetails from './specific-details';
import * as genreElements from './genre-elements';
import * as beats from './beats';
import * as nemesisGenerators from './nemesis';
import * as identities from './identities';
import * as loglines from './loglines';
import * as genreSpecific from './genre-specific-elements';
import { k as templateTag } from './core';
import { 
  Character,
  createHero,
  createVillain,
  createMentor,
  createSidekick,
  createLoveInterest,
  createRival,
  createSupportingCharacter 
} from './Character';

export const k = {
  // Core utilities
  pick,
  pickGenerator,
  capitalize,
  article,
  a,
  
  // Template tag for composing generators
  template: templateTag,
  
  // Names
  ...names,
  ...realisticNames,
  
  // Adjectives
  ...adjectives,
  
  // Occupations
  ...occupations,
  
  // Locations
  ...locations,
  
  // Story elements
  ...storyElements,
  
  // Theme-based flaws
  ...themes,
  
  // Settings
  ...settings,
  
  // Specific details
  ...specificDetails,
  
  // Genre elements
  ...genreElements,
  
  // Beat elements
  ...beats,
  
  // Nemesis generators
  ...nemesisGenerators,
  
  // Identity generators
  ...identities,
  
  // Logline generators
  ...loglines,
  
  // Genre-specific elements
  ...genreSpecific,
  
  // Character creation
  Character,
  createHero,
  createVillain,
  createMentor,
  createSidekick,
  createLoveInterest,
  createRival,
  createSupportingCharacter,
};

// Default export
export default k;

