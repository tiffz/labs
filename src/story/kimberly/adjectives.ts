/**
 * The Kimberly System - Adjective Generators
 * 
 * Functions for generating descriptive adjectives, organized by theme.
 */

import { pick } from './core';

// Evil/villainous adjectives
const evilAdjectives = [
  'sinister', 'malevolent', 'wicked', 'cruel', 'ruthless', 'tyrannical', 'corrupted',
  'vicious', 'merciless', 'treacherous', 'vengeful', 'sadistic', 'manipulative',
  'cold-blooded', 'heartless', 'nefarious', 'malicious', 'devious', 'calculating'
];

// Good/heroic adjectives
const heroicAdjectives = [
  'brave', 'courageous', 'noble', 'valiant', 'righteous', 'honorable', 'selfless',
  'compassionate', 'steadfast', 'determined', 'loyal', 'fearless', 'heroic',
  'virtuous', 'kind-hearted', 'principled', 'gallant', 'dauntless', 'unwavering'
];

// Mysterious adjectives
const mysteriousAdjectives = [
  'enigmatic', 'cryptic', 'shadowy', 'elusive', 'secretive', 'obscure', 'arcane',
  'puzzling', 'inscrutable', 'ambiguous', 'veiled', 'hidden', 'unknown',
  'clandestine', 'covert', 'mysterious', 'strange', 'peculiar', 'uncanny'
];

// Emotional/passionate adjectives
const emotionalAdjectives = [
  'passionate', 'intense', 'fervent', 'ardent', 'zealous', 'fiery', 'spirited',
  'volatile', 'tempestuous', 'impulsive', 'emotional', 'dramatic', 'sensitive',
  'expressive', 'exuberant', 'enthusiastic', 'animated', 'vivacious', 'lively'
];

// Intelligent adjectives
const intelligentAdjectives = [
  'brilliant', 'clever', 'ingenious', 'astute', 'shrewd', 'perceptive', 'insightful',
  'wise', 'knowledgeable', 'erudite', 'scholarly', 'analytical', 'intellectual',
  'sharp', 'quick-witted', 'savvy', 'cunning', 'strategic', 'thoughtful'
];

// Physical strength adjectives
const strongAdjectives = [
  'powerful', 'mighty', 'formidable', 'robust', 'sturdy', 'stalwart', 'strapping',
  'brawny', 'muscular', 'athletic', 'vigorous', 'hardy', 'rugged',
  'imposing', 'commanding', 'intimidating', 'towering', 'solid', 'strong'
];

// Weak/vulnerable adjectives
const vulnerableAdjectives = [
  'fragile', 'delicate', 'vulnerable', 'weak', 'frail', 'timid', 'meek',
  'insecure', 'uncertain', 'hesitant', 'anxious', 'fearful', 'tentative',
  'wavering', 'doubting', 'unsteady', 'shaky', 'nervous', 'apprehensive'
];

// Charismatic adjectives
const charismaticAdjectives = [
  'charismatic', 'charming', 'magnetic', 'captivating', 'alluring', 'enchanting',
  'mesmerizing', 'compelling', 'engaging', 'persuasive', 'influential', 'inspiring',
  'dynamic', 'radiant', 'dazzling', 'bewitching', 'enthralling', 'fascinating'
];

// Rebellious adjectives
const rebelliousAdjectives = [
  'rebellious', 'defiant', 'insubordinate', 'unruly', 'wild', 'untamed', 'reckless',
  'audacious', 'bold', 'daring', 'brazen', 'impudent', 'nonconformist',
  'maverick', 'radical', 'revolutionary', 'disruptive', 'unconventional', 'free-spirited'
];

// Professional/serious adjectives
const professionalAdjectives = [
  'professional', 'disciplined', 'methodical', 'systematic', 'organized', 'efficient',
  'competent', 'capable', 'reliable', 'responsible', 'meticulous', 'precise',
  'thorough', 'diligent', 'focused', 'dedicated', 'committed', 'dutiful', 'serious'
];

/**
 * Generates an evil/villainous adjective
 * Example: "evil" → "sinister", "malevolent", "wicked"
 */
export function evil(): string {
  return pick(evilAdjectives);
}

/**
 * Generates a heroic/good adjective
 * Example: "heroic" → "brave", "courageous", "noble"
 */
export function heroic(): string {
  return pick(heroicAdjectives);
}

/**
 * Generates a mysterious adjective
 * Example: "mysterious" → "enigmatic", "cryptic", "shadowy"
 */
export function mysterious(): string {
  return pick(mysteriousAdjectives);
}

/**
 * Generates an emotional/passionate adjective
 * Example: "passionate" → "intense", "fervent", "fiery"
 */
export function passionate(): string {
  return pick(emotionalAdjectives);
}

/**
 * Generates an intelligent adjective
 * Example: "smart" → "brilliant", "clever", "astute"
 */
export function smart(): string {
  return pick(intelligentAdjectives);
}

/**
 * Generates a strong/powerful adjective
 * Example: "strong" → "mighty", "formidable", "robust"
 */
export function strong(): string {
  return pick(strongAdjectives);
}

/**
 * Generates a vulnerable/weak adjective
 * Example: "vulnerable" → "fragile", "delicate", "timid"
 */
export function vulnerable(): string {
  return pick(vulnerableAdjectives);
}

/**
 * Generates a charismatic adjective
 * Example: "charismatic" → "charming", "magnetic", "captivating"
 */
export function charismatic(): string {
  return pick(charismaticAdjectives);
}

/**
 * Generates a rebellious adjective
 * Example: "rebellious" → "defiant", "wild", "audacious"
 */
export function rebellious(): string {
  return pick(rebelliousAdjectives);
}

/**
 * Generates a professional/serious adjective
 * Example: "professional" → "disciplined", "methodical", "organized"
 */
export function professional(): string {
  return pick(professionalAdjectives);
}

/**
 * Generates any adjective from all categories
 */
export function anyAdjective(): string {
  return pick([
    ...evilAdjectives,
    ...heroicAdjectives,
    ...mysteriousAdjectives,
    ...emotionalAdjectives,
    ...intelligentAdjectives,
    ...strongAdjectives,
    ...vulnerableAdjectives,
    ...charismaticAdjectives,
    ...rebelliousAdjectives,
    ...professionalAdjectives
  ]);
}

