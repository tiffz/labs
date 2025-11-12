/**
 * The Kimberly System - Story Element Generators
 * 
 * Functions for generating common story elements like conflicts, goals, and emotions.
 */

import { pick } from './core';

// Current struggles/conflicts
const currentStruggles = [
  'their uncertain future', 'a recent betrayal', 'mounting debt', 'a failing relationship',
  'their dying parent', 'a terrible secret', 'their fading dreams', 'chronic illness',
  'unemployment', 'addiction', 'loneliness', 'guilt from the past', 'fear of failure',
  'lost identity', 'broken promises', 'unfulfilled potential', 'abandonment issues',
  'their crumbling empire', 'moral compromises', 'lost love'
];

// Character goals/desires
const characterGoals = [
  'finding redemption', 'seeking revenge', 'discovering the truth', 'saving their family',
  'achieving fame', 'gaining power', 'finding love', 'escaping their past',
  'proving themselves', 'protecting the innocent', 'uncovering a conspiracy', 'finding purpose',
  'restoring honor', 'breaking free', 'solving a mystery', 'preventing disaster',
  'winning respect', 'claiming their birthright', 'defeating evil', 'starting over'
];

// Internal flaws
const internalFlaws = [
  'pride', 'jealousy', 'cowardice', 'greed', 'anger', 'vanity', 'naivety',
  'stubbornness', 'distrust', 'self-doubt', 'perfectionism', 'cynicism',
  'recklessness', 'arrogance', 'insecurity', 'obsession', 'bitterness',
  'self-loathing', 'denial', 'inability to forgive'
];

// External obstacles
const externalObstacles = [
  'a powerful enemy', 'corrupt authorities', 'limited resources', 'ticking clock',
  'hostile environment', 'betrayal from within', 'impossible odds', 'ancient curse',
  'natural disaster', 'societal prejudice', 'legal constraints', 'family opposition',
  'technological failure', 'sabotage', 'political intrigue', 'competing factions',
  'scarce information', 'physical barriers', 'supernatural forces', 'public scrutiny'
];

// Emotional states
const emotionalStates = [
  'anxious', 'hopeful', 'desperate', 'determined', 'conflicted', 'angry',
  'grief-stricken', 'exhilarated', 'terrified', 'relieved', 'guilty', 'proud',
  'ashamed', 'confused', 'inspired', 'defeated', 'vengeful', 'compassionate',
  'numb', 'overwhelmed'
];

// Relationships
const relationships = [
  'estranged sibling', 'former mentor', 'childhood friend', 'bitter rival',
  'secret admirer', 'long-lost parent', 'trusted ally', 'reluctant partner',
  'toxic ex', 'protective guardian', 'jealous competitor', 'mysterious stranger',
  'devoted apprentice', 'treacherous colleague', 'innocent bystander', 'powerful patron',
  'vengeful enemy', 'star-crossed lover', 'loyal servant', 'corrupt superior'
];

// Plot twists
const plotTwists = [
  'they were being manipulated all along', 'the mentor is the true villain',
  'they discover they have hidden powers', 'their memories are false',
  'the mission was a test', 'they\'re actually related to the antagonist',
  'they\'ve been in a simulation', 'they\'re from the future', 'they\'re already dead',
  'the artifact is cursed', 'their ally is a spy', 'they\'re the chosen one',
  'time is looping', 'they\'re the clone', 'the cure is the poison',
  'everyone else is controlled', 'they\'re in the wrong timeline', 'it was all a dream (or was it?)',
  'they\'re the monster', 'the hero and villain must team up'
];

// MacGuffins/important objects
const macGuffins = [
  'ancient artifact', 'mysterious key', 'sacred relic', 'secret document',
  'powerful weapon', 'rare gemstone', 'encrypted data', 'magical book',
  'cursed item', 'lost heirloom', 'blueprint', 'serum', 'treasure map',
  'forbidden knowledge', 'prototype device', 'royal seal', 'DNA sample',
  'enchanted ring', 'golden idol', 'prophecy scroll'
];

// Turning points
const turningPoints = [
  'a shocking revelation', 'an unexpected death', 'a critical choice', 'a narrow escape',
  'a devastating loss', 'a miraculous discovery', 'a betrayal', 'a reunion',
  'a confession', 'a sacrifice', 'a transformation', 'a confrontation',
  'an awakening', 'a fall from grace', 'a moment of truth', 'a point of no return',
  'a desperate gamble', 'an impossible victory', 'a crushing defeat', 'a new alliance'
];

/**
 * Generates a current struggle or internal conflict
 * Example: "current struggle" → "mounting debt", "a recent betrayal", "their fading dreams"
 */
export function currentStruggle(): string {
  return pick(currentStruggles);
}

/**
 * Generates a character goal or desire
 * Example: "goal" → "finding redemption", "seeking revenge", "discovering the truth"
 */
export function goal(): string {
  return pick(characterGoals);
}

/**
 * Generates an internal character flaw
 * Example: "flaw" → "pride", "jealousy", "cowardice"
 */
export function flaw(): string {
  return pick(internalFlaws);
}

/**
 * Generates an external obstacle
 * Example: "obstacle" → "powerful enemy", "ticking clock", "corrupt authorities"
 */
export function obstacle(): string {
  return pick(externalObstacles);
}

/**
 * Generates an emotional state
 * Example: "emotion" → "anxious", "desperate", "determined"
 */
export function emotion(): string {
  return pick(emotionalStates);
}

/**
 * Generates a relationship type
 * Example: "relationship" → "estranged sibling", "former mentor", "bitter rival"
 */
export function relationship(): string {
  return pick(relationships);
}

/**
 * Generates a plot twist
 * Example: "twist" → "they were being manipulated", "the mentor is the villain"
 */
export function plotTwist(): string {
  return pick(plotTwists);
}

/**
 * Generates a MacGuffin or important object
 * Example: "MacGuffin" → "ancient artifact", "mysterious key", "secret document"
 */
export function MacGuffin(): string {
  return pick(macGuffins);
}

/**
 * Generates a story turning point
 * Example: "turning point" → "shocking revelation", "unexpected death", "critical choice"
 */
export function turningPoint(): string {
  return pick(turningPoints);
}

