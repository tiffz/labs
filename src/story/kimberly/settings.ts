/**
 * The Kimberly System - Settings Generators
 * 
 * Specific setting generators for story acts
 */

import { pick } from './core';

// Act 1 settings - where the story begins
const act1Settings = [
  'rainy metropolis', 'arctic research station', 'decaying Gothic mansion',
  'slick startup office', 'sleepy seaside town', 'VR dreamscape',
  'post-apocalyptic wasteland', 'suburban cul-de-sac', 'bustling university',
  'sterile hospital', 'crowded space station', 'quiet mountain village',
  'abandoned factory', 'luxury penthouse', 'rural farm', 'underground bunker'
];

// Act 2 settings - the "new world"
const act2Settings = [
  'neon-lit city', 'desolate wasteland', 'high-tech lab', 'foreign country',
  'ancient ruin', 'deep ocean', 'virtual reality', 'secret underground bunker',
  'traveling circus', "villain's headquarters", 'parallel dimension',
  'mystical forest', 'orbital station', 'hidden island', 'alternate timeline'
];

/**
 * Generates an Act 1 setting (the ordinary world)
 * Example: "rainy metropolis", "arctic research station"
 */
export function act1Setting(): string {
  return pick(act1Settings);
}

/**
 * Generates an Act 2 setting (the new world)
 * Example: "neon-lit city", "ancient ruin"
 */
export function act2Setting(): string {
  return pick(act2Settings);
}

/**
 * Generates an Act 2 setting that's different from the provided Act 1 setting
 */
export function differentAct2Setting(act1: string): string {
  const otherSettings = act2Settings.filter(s => s !== act1);
  return pick(otherSettings.length > 0 ? otherSettings : act2Settings);
}

