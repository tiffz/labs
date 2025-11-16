/**
 * The Kimberly System - Location Generators
 * 
 * Functions for generating location names and descriptions.
 * Uses composable adjectives + nouns for maximum variety.
 */

import { pick, pickGenerator } from './core';

// Location adjectives (atmosphere/quality)
// Universal adjectives - work with any location
const universalAdjectives = [
  // Atmospheric
  'misty', 'foggy', 'sunlit', 'moonlit', 'shadowy', 'dimly-lit',
  'rain-soaked', 'snow-covered', 'windswept', 'storm-battered',
  // Age/condition
  'ancient', 'crumbling', 'abandoned', 'forgotten', 'ruined', 'pristine',
  'weathered', 'decaying', 'overgrown', 'restored', 'renovated',
  // Size/scale
  'vast', 'cramped', 'sprawling', 'tiny', 'massive', 'cozy', 'cavernous',
  // Emotional/aesthetic
  'serene', 'chaotic', 'peaceful', 'desolate', 'vibrant',
  'gloomy', 'cheerful', 'ominous', 'welcoming', 'hostile', 'sterile',
  // Sensory
  'dusty', 'musty', 'fragrant', 'smoky', 'damp', 'arid', 'humid',
  // Temporal
  'timeless', 'modern', 'futuristic', 'retro', 'medieval', 'Victorian',
  // Mystery/magic
  'enchanted', 'cursed', 'haunted', 'sacred', 'forbidden', 'hidden',
  'secret', 'mystical', 'ethereal', 'otherworldly'
];

// Urban-specific adjectives (only make sense with urban locations)
const urbanAdjectives = [
  'bustling', 'neon-lit', 'crowded', 'empty', 'upscale', 'rundown',
  'gentrified', 'industrial', 'residential', 'commercial'
];

// Outdoor location nouns
const outdoorLocationNouns = [
  'mountain peak', 'valley', 'forest', 'lake', 'cliff', 'meadow', 'beach',
  'desert', 'waterfall', 'garden', 'grove', 'reef', 'crater', 'fjord',
  'clearing', 'canyon', 'plateau', 'tundra', 'savanna', 'marsh', 'swamp',
  'island', 'peninsula', 'coastline', 'hillside', 'ridge', 'ravine'
];

// Urban location nouns
const urbanLocationNouns = [
  'alley', 'rooftop', 'subway station', 'penthouse', 'warehouse', 'park',
  'coffee shop', 'gallery', 'mall', 'office', 'parking garage', 'nightclub',
  'hotel lobby', 'restaurant', 'marketplace', 'plaza', 'street corner',
  'skyscraper', 'apartment', 'loft', 'bodega', 'diner', 'bar'
];

// Domestic location nouns
const domesticLocationNouns = [
  'kitchen', 'bedroom', 'attic', 'basement', 'living room', 'office',
  'bathroom', 'closet', 'dining room', 'library', 'game room', 'workshop',
  'greenhouse', 'cellar', 'gym', 'garage', 'porch', 'balcony', 'backyard'
];

// Mystical/magical location nouns
const mysticalLocationNouns = [
  'temple', 'tomb', 'chamber', 'cave', 'island', 'garden', 'ruins',
  'shrine', 'rift', 'castle', 'mansion', 'spring', 'battlefield', 'library',
  'tower', 'crypt', 'sanctuary', 'altar', 'portal', 'nexus'
];

// Workplace location nouns
const workplaceLocationNouns = [
  'laboratory', 'boardroom', 'emergency room', 'classroom', 'factory',
  'police station', 'courthouse', 'newsroom', 'stage', 'studio',
  'construction site', 'farm', 'military base', 'space station', 'warehouse',
  'shop floor', 'cubicle farm', 'break room', 'conference room'
];

// Transit location nouns
const transitLocationNouns = [
  'airport terminal', 'train platform', 'bus depot', 'ship deck', 'airplane cabin',
  'taxi', 'rest stop', 'border crossing', 'ferry', 'helicopter',
  'limousine', 'bicycle path', 'trail', 'marina', 'gondola', 'station'
];

// Social gathering location nouns
const socialLocationNouns = [
  'ballroom', 'chapel', 'funeral parlor', 'concert hall', 'arena',
  'community center', 'church', 'temple', 'mosque', 'synagogue',
  'museum', 'zoo', 'aquarium', 'amusement park', 'festival grounds',
  'theater', 'auditorium', 'banquet hall', 'reception hall'
];

// Dangerous location nouns
const dangerousLocationNouns = [
  'alley', 'hospital', 'bridge', 'building', 'crime scene', 'war zone',
  'minefield', 'prison cell', 'chamber', 'ward', 'zone', 'volcano',
  'ship', 'plane', 'battlefield', 'bunker', 'compound'
];

/**
 * Helper: Combines adjective + noun for location
 * 80% chance of adjective, 20% chance of just noun
 */
function composeLocation(nouns: string[], allowUrban: boolean = false): string {
  const noun = pick(nouns);
  // 80% chance to add an adjective
  if (Math.random() < 0.8) {
    // Choose from appropriate adjectives
    const adjectives = allowUrban 
      ? [...universalAdjectives, ...urbanAdjectives]
      : universalAdjectives;
    const adjective = pick(adjectives);
    return `${adjective} ${noun}`;
  }
  return noun;
}

/**
 * Generates a scenic outdoor location
 * Example: "misty valley", "ancient forest", "sunlit beach"
 * Variety: 50 adjectives × 27 nouns = 1,350+ combinations
 */
export function scenicLocation(): string {
  return composeLocation(outdoorLocationNouns);
}

/**
 * Generates an urban/city location
 * Example: "neon-lit alley", "abandoned warehouse", "bustling marketplace"
 * Variety: 50 adjectives × 23 nouns = 1,150+ combinations
 */
export function urbanSpot(): string {
  return composeLocation(urbanLocationNouns, true); // Allow urban-specific adjectives
}

/**
 * Generates a domestic/home location
 * Example: "cozy kitchen", "dusty attic", "sunlit living room"
 * Variety: 50 adjectives × 19 nouns = 950+ combinations
 */
export function home(): string {
  return composeLocation(domesticLocationNouns);
}

/**
 * Generates a mysterious or magical location
 * Example: "hidden temple", "cursed ruins", "ethereal garden"
 * Variety: 50 adjectives × 20 nouns = 1,000+ combinations
 */
export function mysticalPlace(): string {
  return composeLocation(mysticalLocationNouns);
}

/**
 * Generates a workplace location
 * Example: "sterile laboratory", "chaotic newsroom", "modern office"
 * Variety: 50 adjectives × 19 nouns = 950+ combinations
 */
export function workplace(): string {
  return composeLocation(workplaceLocationNouns);
}

/**
 * Generates a transit/travel location
 * Example: "crowded airport terminal", "abandoned train platform"
 * Variety: 50 adjectives × 16 nouns = 800+ combinations
 */
export function transitHub(): string {
  return composeLocation(transitLocationNouns);
}

/**
 * Generates a social gathering location
 * Example: "elegant ballroom", "crumbling theater", "sacred temple"
 * Variety: 50 adjectives × 18 nouns = 900+ combinations
 */
export function gatheringPlace(): string {
  return composeLocation(socialLocationNouns);
}

/**
 * Generates a dangerous or tense location
 * Example: "burning building", "collapsing bridge", "abandoned hospital"
 * Variety: 50 adjectives × 17 nouns = 850+ combinations
 */
export function dangerousPlace(): string {
  return composeLocation(dangerousLocationNouns);
}

/**
 * Generates any location from all categories
 * Uses weighted distribution
 * Total variety: 8,000+ unique combinations
 */
export function anyLocation(): string {
  return pickGenerator([
    scenicLocation,
    urbanSpot,
    home,
    mysticalPlace,
    workplace,
    transitHub,
    gatheringPlace,
    dangerousPlace
  ]);
}

