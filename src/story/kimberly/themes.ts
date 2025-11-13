/**
 * The Kimberly System - Theme-Based Flaw Generators
 * 
 * Functions for generating character flaws specific to story themes.
 */

import { pick } from './core';

// Flaws by theme - all nouns for consistency
const forgivenessFlaws = [
  'grudge-holding', 'self-loathing', 'inability to apologize', 'blame-shifting',
  'vengefulness', 'refusal to forget', 'victim mentality', 'punitiveness',
  'self-destruction', 'inability to accept help', 'rigid moralism', 'cynicism'
];

const loveFlaws = [
  'fear of intimacy', 'selfishness', 'possessiveness', 'jealousy', 'codependence',
  'workaholism', 'emotional walls', 'view of love as weakness', 'manipulation',
  'people-pleasing', 'constant need for validation', 'distrust', 'judgmentalism'
];

const acceptanceFlaws = [
  'stubborn denial', 'perfectionism', 'control issues', 'living in the past',
  'inability to handle failure', 'overcriticism', 'judgmentalism', 'refusal to compromise',
  'black-and-white thinking', 'avoidance', 'arrogance', 'pessimism'
];

const faithFlaws = [
  'cynicism', 'nihilism', 'over-pragmatism', 'need for proof', 'pessimism',
  'control-freakery', 'distrust', 'hopelessness', 'excessive self-reliance',
  'fear of the unknown', 'jadedness', 'paranoia'
];

const fearFlaws = [
  'cowardice', 'excessive caution', 'paranoia', 'control issues', 'fear of failure',
  'conflict avoidance', 'indecisiveness', 'self-sabotage', 'refusal to take a stand',
  'pessimism', 'susceptibility to manipulation', 'conformity'
];

const trustFlaws = [
  'distrust', 'paranoia', 'cynicism', 'excessive self-reliance', 'manipulation',
  'preemptive betrayal', 'secrecy', 'loyalty testing', 'fear of vulnerability',
  'micromanagement', 'assumption of the worst', 'naive trust'
];

const survivalFlaws = [
  'selfishness', 'cowardice', 'defeatism', 'hopelessness', 'recklessness',
  'over-civilization', 'apathy', 'refusal to adapt', 'panic under pressure',
  'deceitfulness', 'greed', 'over-dependence'
];

const selflessnessFlaws = [
  'selfishness', 'greed', 'apathy', 'cowardice', 'self-prioritization',
  'exploitation', 'manipulation', 'view of kindness as weakness', 'arrogance',
  'excessive ambition', 'vanity', 'hedonism'
];

const responsibilityFlaws = [
  'irresponsibility', 'avoidance', 'apathy', 'selfishness', 'blame-shifting',
  'immaturity', 'aimless rebellion', 'negligence', 'procrastination',
  'fear of commitment', 'refusal to lead', 'unreliability'
];

const redemptionFlaws = [
  'inability to admit fault', 'self-loathing', 'arrogance', 'belief in being beyond help',
  'blame-shifting', 'self-destruction', 'vengefulness', 'denial', 'cynicism',
  'refusal to change', 'manipulation', 'victim mentality'
];

/**
 * Gets flaws appropriate for the Forgiveness theme
 */
export function forgivenessFlaw(): string {
  return pick(forgivenessFlaws);
}

/**
 * Gets flaws appropriate for the Love theme
 */
export function loveFlaw(): string {
  return pick(loveFlaws);
}

/**
 * Gets flaws appropriate for the Acceptance theme
 */
export function acceptanceFlaw(): string {
  return pick(acceptanceFlaws);
}

/**
 * Gets flaws appropriate for the Faith theme
 */
export function faithFlaw(): string {
  return pick(faithFlaws);
}

/**
 * Gets flaws appropriate for the Fear theme
 */
export function fearFlaw(): string {
  return pick(fearFlaws);
}

/**
 * Gets flaws appropriate for the Trust theme
 */
export function trustFlaw(): string {
  return pick(trustFlaws);
}

/**
 * Gets flaws appropriate for the Survival theme
 */
export function survivalFlaw(): string {
  return pick(survivalFlaws);
}

/**
 * Gets flaws appropriate for the Selflessness theme
 */
export function selflessnessFlaw(): string {
  return pick(selflessnessFlaws);
}

/**
 * Gets flaws appropriate for the Responsibility theme
 */
export function responsibilityFlaw(): string {
  return pick(responsibilityFlaws);
}

/**
 * Gets flaws appropriate for the Redemption theme
 */
export function redemptionFlaw(): string {
  return pick(redemptionFlaws);
}

/**
 * Gets a flaw appropriate for the given theme
 */
/**
 * Opinion adjectives to describe flaws (quality/severity)
 * Following Cambridge adjective order: opinion comes first
 */
const flawOpinionAdjectives = [
  // Severity/intensity
  'deep-seated', 'crippling', 'extreme', 'pathological', 'chronic',
  'debilitating', 'overwhelming', 'consuming', 'paralyzing', 'severe',
  'profound', 'intense', 'destructive', 'dangerous',
  // Quality/nature
  'toxic', 'unhealthy', 'obsessive', 'compulsive', 'irrational',
  'uncontrollable', 'persistent', 'pervasive', 'ingrained', 'troubling',
  'problematic', 'damaging', 'harmful', 'corrosive', 'insidious'
];

export function themeBasedFlaw(theme: string): string {
  const themeMap: Record<string, () => string> = {
    'Forgiveness': forgivenessFlaw,
    'Love': loveFlaw,
    'Acceptance': acceptanceFlaw,
    'Faith': faithFlaw,
    'Fear': fearFlaw,
    'Trust': trustFlaw,
    'Survival': survivalFlaw,
    'Selflessness': selflessnessFlaw,
    'Responsibility': responsibilityFlaw,
    'Redemption': redemptionFlaw,
  };

  const generator = themeMap[theme];
  const baseFlaw = generator ? generator() : pick([...Object.values(themeMap)].map(fn => fn()));
  
  // 70% chance to add an opinion adjective for variety
  // Following Cambridge order: opinion adjective comes before the noun
  if (Math.random() < 0.7) {
    return `${pick(flawOpinionAdjectives)} ${baseFlaw}`;
  }
  
  return baseFlaw;
}

