/**
 * The Kimberly System - Nemesis Generation
 * 
 * Generates antagonists - both people and entities
 */

import { pick, a } from './core';
import { fullName } from './realistic-names';

/**
 * Generates a person nemesis (with a name)
 * Example: "Marcus Chen, a ruthless CEO"
 */
export function personNemesis(): string {
  const name = fullName();
  const adjectives = [
    'megalomaniac', 'charismatic', 'deceitful', 'brilliant', 'obsessed',
    'ruthless', 'fanatical', 'corrupt', 'vain', 'petty', 'twisted',
    'calculating', 'vengeful', 'ambitious', 'manipulative'
  ];
  
  const roles = [
    'CEO', 'government agent', 'cult leader', 'rival scientist',
    'family matriarch', 'former mentor', 'political opponent',
    'crime boss', 'tech mogul', 'military commander', 'prosecutor',
    'media tycoon', 'religious leader', 'business partner'
  ];
  
  const adjective = pick(adjectives);
  const role = pick(roles);
  
  return `${name}, ${a(`${adjective} ${role}`)}`;
}

/**
 * Generates an entity nemesis (organization, force, or non-human)
 * Example: "a shadowy corporation"
 */
export function entityNemesis(): string {
  const adjectives = [
    'shadowy', 'unseen', 'ancient', 'mysterious', 'powerful',
    'corrupt', 'sprawling', 'secretive', 'faceless', 'omnipresent'
  ];
  
  const entities = [
    'corporation', 'government agency', 'conspiracy', 'AI system',
    'cosmic horror', 'psychological force', 'secret society',
    'criminal organization', 'supernatural entity', 'dystopian system',
    'alien intelligence', 'natural disaster', 'pandemic', 'social movement'
  ];
  
  const adjective = pick(adjectives);
  const entity = pick(entities);
  
  return a(`${adjective} ${entity}`);
}

/**
 * Generates either a person or entity nemesis (weighted toward people)
 */
export function nemesis(): string {
  // 70% chance of person, 30% chance of entity
  return Math.random() < 0.7 ? personNemesis() : entityNemesis();
}

