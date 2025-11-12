/**
 * The Kimberly System - Name Generators
 * 
 * Functions for generating character names, organized by style and gender.
 */

import { pick } from './core';

// Modern common names
const modernFemaleNames = [
  'Kimberly', 'Emma', 'Olivia', 'Sophia', 'Isabella', 'Mia', 'Charlotte', 'Amelia',
  'Harper', 'Evelyn', 'Abigail', 'Emily', 'Elizabeth', 'Sofia', 'Avery', 'Ella'
];

const modernMaleNames = [
  'Liam', 'Noah', 'Oliver', 'James', 'Elijah', 'William', 'Henry', 'Lucas',
  'Benjamin', 'Theodore', 'Jack', 'Alexander', 'Owen', 'Sebastian', 'Michael', 'Daniel'
];

// Classic/vintage names
const classicFemaleNames = [
  'Margaret', 'Dorothy', 'Helen', 'Ruth', 'Catherine', 'Alice', 'Clara', 'Eleanor',
  'Florence', 'Beatrice', 'Violet', 'Rose', 'Pearl', 'Hazel', 'Iris', 'Lillian'
];

const classicMaleNames = [
  'Arthur', 'Henry', 'Charles', 'Edward', 'George', 'Frederick', 'Walter', 'Albert',
  'Thomas', 'William', 'Robert', 'Harold', 'Ernest', 'Francis', 'Leonard', 'Raymond'
];

// Unique/uncommon names
const uniqueFemaleNames = [
  'Zara', 'Luna', 'Nova', 'Sage', 'River', 'Phoenix', 'Rowan', 'Quinn',
  'Marlowe', 'Indigo', 'Juniper', 'Wren', 'Saffron', 'Ember', 'Lyric', 'Atlas'
];

const uniqueMaleNames = [
  'Orion', 'Atlas', 'Phoenix', 'Kai', 'Sage', 'River', 'Rowan', 'Wilder',
  'Arrow', 'Canyon', 'Storm', 'Wolf', 'Fox', 'Hawk', 'Bear', 'Stone'
];

// Fantasy/literary names
const fantasyFemaleNames = [
  'Aria', 'Seraphina', 'Celestia', 'Aurora', 'Elara', 'Lyra', 'Thalia', 'Calliope',
  'Isolde', 'Morgana', 'Rowena', 'Guinevere', 'Ophelia', 'Cordelia', 'Rosalind', 'Portia'
];

const fantasyMaleNames = [
  'Orion', 'Cassius', 'Lysander', 'Evander', 'Thaddeus', 'Silas', 'Atticus', 'Magnus',
  'Lucian', 'Adrian', 'Jasper', 'Sebastian', 'Dorian', 'Tristan', 'Alaric', 'Caspian'
];

// Gender-neutral names
const neutralNames = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn',
  'Sage', 'River', 'Phoenix', 'Rowan', 'Charlie', 'Sam', 'Jamie', 'Drew'
];

/**
 * Generates a modern, common female name
 * Example: "Kimberly"
 */
export function Kimberly(): string {
  return pick(modernFemaleNames);
}

/**
 * Generates a modern, common male name
 * Example: "Liam"
 */
export function Liam(): string {
  return pick(modernMaleNames);
}

/**
 * Generates a classic/vintage female name
 * Example: "Margaret"
 */
export function Margaret(): string {
  return pick(classicFemaleNames);
}

/**
 * Generates a classic/vintage male name
 * Example: "Arthur"
 */
export function Arthur(): string {
  return pick(classicMaleNames);
}

/**
 * Generates a unique/uncommon female name
 * Example: "Zara"
 */
export function Zara(): string {
  return pick(uniqueFemaleNames);
}

/**
 * Generates a unique/uncommon male name
 * Example: "Orion"
 */
export function Orion(): string {
  return pick(uniqueMaleNames);
}

/**
 * Generates a fantasy/literary female name
 * Example: "Aria"
 */
export function Aria(): string {
  return pick(fantasyFemaleNames);
}

/**
 * Generates a fantasy/literary male name
 * Example: "Cassius"
 */
export function Cassius(): string {
  return pick(fantasyMaleNames);
}

/**
 * Generates a gender-neutral name
 * Example: "Alex"
 */
export function Alex(): string {
  return pick(neutralNames);
}

/**
 * Generates any female name (from all categories)
 */
export function femaleName(): string {
  return pick([
    ...modernFemaleNames,
    ...classicFemaleNames,
    ...uniqueFemaleNames,
    ...fantasyFemaleNames,
    ...neutralNames
  ]);
}

/**
 * Generates any male name (from all categories)
 */
export function maleName(): string {
  return pick([
    ...modernMaleNames,
    ...classicMaleNames,
    ...uniqueMaleNames,
    ...fantasyMaleNames,
    ...neutralNames
  ]);
}

/**
 * Generates any name (all genders, all categories)
 */
export function anyName(): string {
  return pick([
    ...modernFemaleNames,
    ...modernMaleNames,
    ...classicFemaleNames,
    ...classicMaleNames,
    ...uniqueFemaleNames,
    ...uniqueMaleNames,
    ...fantasyFemaleNames,
    ...fantasyMaleNames,
    ...neutralNames
  ]);
}

