/**
 * The Kimberly System - Location Generators
 * 
 * Functions for generating location names and descriptions.
 */

import { pick, pickGenerator } from './core';

// Scenic outdoor locations
const scenicOutdoorLocations = [
  'mountain peak', 'misty valley', 'ancient forest', 'crystal lake', 'rocky cliff',
  'rolling meadow', 'windswept beach', 'desert oasis', 'cascading waterfall', 'flower garden',
  'bamboo grove', 'coral reef', 'volcanic crater', 'glacial fjord', 'sunlit clearing'
];

// Urban locations
const urbanLocations = [
  'bustling marketplace', 'neon-lit alley', 'rooftop terrace', 'subway station', 'penthouse suite',
  'abandoned warehouse', 'city park', 'coffee shop', 'art gallery', 'shopping mall',
  'office building', 'parking garage', 'nightclub', 'hotel lobby', 'restaurant'
];

// Indoor domestic locations
const domesticLocations = [
  'cozy kitchen', 'cramped bedroom', 'dusty attic', 'finished basement', 'sunlit living room',
  'home office', 'bathroom', 'walk-in closet', 'dining room', 'library',
  'game room', 'workshop', 'greenhouse', 'wine cellar', 'home gym'
];

// Mysterious/magical locations
const mysticalLocations = [
  'hidden temple', 'enchanted grove', 'forgotten tomb', 'secret chamber', 'crystal cave',
  'floating island', 'ethereal garden', 'ancient ruins', 'mystical shrine', 'dimensional rift',
  'abandoned castle', 'haunted mansion', 'sacred spring', 'cursed battlefield', 'time-lost library'
];

// Workplace locations
const workplaceLocations = [
  'research laboratory', 'corporate boardroom', 'hospital emergency room', 'school classroom',
  'factory floor', 'police station', 'courthouse', 'newsroom', 'theater stage',
  'recording studio', 'construction site', 'farm', 'military base', 'space station'
];

// Travel/transit locations
const transitLocations = [
  'airport terminal', 'train platform', 'bus depot', 'ship deck', 'airplane cabin',
  'taxi', 'highway rest stop', 'border crossing', 'ferry', 'helicopter',
  'limousine', 'bicycle path', 'hiking trail', 'marina', 'gondola lift'
];

// Social gathering locations
const socialLocations = [
  'elegant ballroom', 'wedding chapel', 'funeral parlor', 'concert hall', 'sports arena',
  'community center', 'church', 'temple', 'mosque', 'synagogue',
  'museum', 'zoo', 'aquarium', 'amusement park', 'festival grounds'
];

// Dangerous/tense locations
const dangerousLocations = [
  'dark alley', 'abandoned hospital', 'collapsing bridge', 'burning building', 'crime scene',
  'war zone', 'minefield', 'prison cell', 'torture chamber', 'execution chamber',
  'plague ward', 'contaminated zone', 'active volcano', 'sinking ship', 'crashing plane'
];

/**
 * Generates a scenic outdoor location
 * Example: "scenic location" → "mountain peak", "crystal lake", "ancient forest"
 */
export function scenicLocation(): string {
  return pick(scenicOutdoorLocations);
}

/**
 * Generates an urban/city location
 * Example: "urban spot" → "neon-lit alley", "rooftop terrace", "subway station"
 */
export function urbanSpot(): string {
  return pick(urbanLocations);
}

/**
 * Generates a domestic/home location
 * Example: "home" → "cozy kitchen", "dusty attic", "sunlit living room"
 */
export function home(): string {
  return pick(domesticLocations);
}

/**
 * Generates a mysterious or magical location
 * Example: "mystical place" → "hidden temple", "crystal cave", "forgotten tomb"
 */
export function mysticalPlace(): string {
  return pick(mysticalLocations);
}

/**
 * Generates a workplace location
 * Example: "workplace" → "research laboratory", "corporate boardroom", "hospital"
 */
export function workplace(): string {
  return pick(workplaceLocations);
}

/**
 * Generates a transit/travel location
 * Example: "transit hub" → "airport terminal", "train platform", "ship deck"
 */
export function transitHub(): string {
  return pick(transitLocations);
}

/**
 * Generates a social gathering location
 * Example: "gathering place" → "elegant ballroom", "concert hall", "museum"
 */
export function gatheringPlace(): string {
  return pick(socialLocations);
}

/**
 * Generates a dangerous or tense location
 * Example: "dangerous place" → "dark alley", "burning building", "war zone"
 */
export function dangerousPlace(): string {
  return pick(dangerousLocations);
}

/**
 * Generates any location from all categories
 * Uses weighted distribution
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

