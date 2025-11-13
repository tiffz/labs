/**
 * The Kimberly System - Specific Details
 * 
 * This module contains highly specific generators to replace vague concepts
 * with evocative, concrete details.
 */

import { pick } from './core';

/**
 * Specific natural disasters (replaces generic "natural disaster")
 */
export function naturalDisaster(): string {
  return pick([
    // Earthquakes
    'magnitude 9.5 earthquake', 'devastating 8.2 earthquake', 'catastrophic earthquake',
    // Water disasters
    'devastating tsunami', 'hundred-foot tsunami', 'flash flood', 'category 5 hurricane',
    'superstorm', 'biblical flood',
    // Fire & heat
    'wildfire consuming everything', 'volcanic eruption', 'pyroclastic flow',
    // Cold & ice
    'sudden ice age', 'avalanche', 'blizzard that won\'t end',
    // Wind
    'EF5 tornado', 'tornado outbreak', 'derecho windstorm',
    // Magical/unusual
    'magical hurricane', 'reality-bending storm', 'dimensional rift',
    'meteor strike', 'solar flare', 'geomagnetic storm'
  ]);
}

/**
 * Specific things to abandon/sacrifice (replaces "abandon all hope")
 */
export function thingToAbandon(): string {
  return pick([
    // Family & relationships
    'abandon {possessive} family', 'leave {possessive} children behind',
    'say goodbye to {possessive} spouse forever', 'betray {possessive} best friend',
    // Dreams & identity
    'give up {possessive} dreams of being an artist', 'abandon {possessive} lifelong ambition',
    'sacrifice {possessive} reputation', 'destroy {possessive} life\'s work',
    // Pets & loved ones (specific)
    'say goodbye to {possessive} cat', 'leave {possessive} dog behind',
    'abandon {possessive} daughter', 'sacrifice {possessive} son',
    // Values & principles
    'compromise {possessive} principles', 'betray everything {subject} believe in',
    'sell {possessive} soul', 'become what {subject} hate',
    // Physical things
    'burn {possessive} home', 'destroy {possessive} research',
    'give up {possessive} freedom', 'sacrifice {possessive} memories'
  ]);
}

/**
 * Specific unexpected threats (replaces "nightmare they never saw coming")
 */
export function unexpectedThreat(): string {
  return pick([
    // Attacks
    'unexpected terrorist attack', 'coordinated strike', 'betrayal from within',
    'ambush by allies', 'coup d\'état',
    // Natural
    `${naturalDisaster()}`, 'pandemic outbreak', 'biological weapon release',
    // Personal
    'loved one\'s betrayal', 'discovery of a dark secret', 'revelation that shatters everything',
    // Supernatural
    'dimensional breach', 'alien invasion', 'zombie outbreak',
    'demonic possession', 'reality collapse',
    // Technology
    'AI uprising', 'nuclear meltdown', 'EMP attack', 'cyber warfare',
    // Time
    'time loop', 'temporal paradox', 'past catching up'
  ]);
}

/**
 * Specific supernatural threats (replaces generic "supernatural threat")
 */
export function supernaturalThreat(): string {
  return pick([
    // Demons & spirits
    'demonic possession', 'vengeful spirit', 'ancient demon', 'poltergeist',
    'shadow entity', 'soul-stealing wraith',
    // Curses & magic
    'family curse', 'blood curse', 'witch\'s hex', 'dark ritual gone wrong',
    'cursed artifact', 'forbidden spell',
    // Creatures
    'vampire coven', 'werewolf pack', 'eldritch horror', 'lovecraftian entity',
    'fae court', 'banshee', 'wendigo',
    // Reality bending
    'reality tear', 'dimensional rift', 'time anomaly', 'parallel universe collision',
    // Death & undead
    'zombie horde', 'necromancer\'s army', 'death itself', 'reaper',
    // Cosmic
    'cosmic horror', 'elder god', 'void entity', 'star-spawn'
  ]);
}

/**
 * Specific political conflicts (replaces generic "political conflict")
 */
export function politicalConflict(): string {
  return pick([
    // War & revolution
    'civil war', 'military coup', 'revolution', 'insurgency', 'rebellion',
    // Power struggles
    'succession crisis', 'power vacuum', 'political assassination plot',
    'impeachment scandal', 'constitutional crisis',
    // International
    'border dispute', 'trade war', 'cold war escalation', 'diplomatic breakdown',
    'international incident', 'treaty violation',
    // Corruption
    'corruption scandal', 'conspiracy at the highest levels', 'shadow government',
    'corporate takeover of government', 'blackmail ring',
    // Ideology
    'ideological purge', 'cultural revolution', 'religious conflict',
    'class warfare', 'generational conflict'
  ]);
}

/**
 * Specific quests for redemption (replaces vague "quest for redemption")
 * NO PLACEHOLDERS - used as nemesis
 */
export function redemptionQuest(): string {
  return pick([
    // Making amends
    'quest to save the person they failed', 'mission to undo their greatest mistake',
    'journey to earn forgiveness', 'attempt to right their wrongs',
    'quest to make amends for the past', 'mission to save who they abandoned',
    // Proving worth
    'mission to prove they have changed', 'quest to reclaim their honor',
    'journey to restore their name', 'mission to earn back trust',
    'quest to prove their worth', 'journey to redeem themselves',
    // Sacrifice
    'quest to sacrifice themselves for others', 'mission to pay their debt',
    'journey to atone with their life', 'quest to save those they hurt',
    'mission to give everything for redemption',
    // Specific sins
    'quest to save the child they abandoned', 'mission to stop the monster they created',
    'journey to fix what they broke', 'quest to find the one they betrayed',
    'mission to undo the harm they caused', 'quest to save who they left behind'
  ]);
}

/**
 * Specific life-changing journeys (replaces vague "life-changing journey")
 * NO PLACEHOLDERS - used as nemesis
 */
export function lifechangingJourney(): string {
  return pick([
    // Pilgrimage & discovery
    'pilgrimage to find themselves', 'vision quest', 'spiritual awakening journey',
    'journey to discover their true identity', 'quest for enlightenment',
    // Escape & survival
    'cross-country escape', 'journey to freedom', 'exodus from tyranny',
    'desperate migration', 'flight from persecution', 'escape from their past',
    // Return & homecoming
    'journey home after years away', 'return to face their past',
    'homecoming after war', 'pilgrimage to their roots', 'return to where it all began',
    // Transformation
    'journey of self-discovery', 'quest to find purpose', 'search for meaning',
    'odyssey of transformation', 'walkabout', 'coming-of-age journey',
    'road trip to find themselves', 'soul-searching expedition'
  ]);
}

/**
 * Specific deadly creatures (replaces generic "deadly creature")
 */
export function deadlyCreature(): string {
  return pick([
    // Specific animals
    'genetically-modified apex predator', 'prehistoric beast', 'mutated shark',
    'giant spider', 'swarm of killer bees', 'pack of rabid wolves',
    // Experiments gone wrong
    'failed experiment', 'lab-created hybrid', 'bio-weapon prototype',
    'chimera', 'genetic abomination',
    // Alien
    'alien parasite', 'xenomorph', 'extraterrestrial hunter',
    'shapeshifting alien', 'hive mind organism',
    // Supernatural
    'demon in flesh', 'possessed animal', 'shadow beast',
    'nightmare made real', 'creature from another dimension',
    // Specific monsters
    'vampire', 'werewolf', 'wendigo', 'chupacabra', 'Jersey Devil',
    // Swarms
    'flesh-eating beetles', 'carnivorous plants', 'killer nanobots'
  ]);
}

/**
 * Specific villains (replaces generic "dangerous warlord", "corrupt official", etc.)
 */
export function specificVillain(): string {
  return pick([
    // Military & power
    'genocidal warlord', 'military dictator', 'rogue general',
    'war criminal', 'mercenary king',
    // Political
    'corrupt senator', 'fascist governor', 'tyrannical mayor',
    'puppet president', 'shadow chancellor',
    // Criminal
    'cartel boss', 'mafia don', 'crime lord', 'drug kingpin',
    'human trafficker', 'arms dealer',
    // Corporate
    'ruthless CEO', 'corporate tyrant', 'tech billionaire',
    'pharmaceutical exec', 'media mogul',
    // Personal
    'abusive parent', 'manipulative ex', 'jealous sibling',
    'former best friend', 'betrayed mentor',
    // Professional
    'corrupt cop', 'dirty judge', 'crooked lawyer',
    'unethical scientist', 'mad doctor'
  ]);
}

/**
 * Specific consequences of wishes WITH pronoun placeholders
 * (for use in logline elements where replacement happens)
 */
export function wishConsequenceWithPronouns(): string {
  return pick([
    // Greed
    '{possessive} insatiable greed', '{possessive} hunger for more',
    '{possessive} addiction to power', '{possessive} endless desire',
    // Creation
    'the nightmare {subject} created', 'the monster {subject} became',
    'the world {subject} destroyed', 'the people {subject} hurt',
    // Loss
    'the price of {possessive} ambition', 'the cost of {possessive} wish',
    'the sacrifice {subject} didn\'t understand', 'the debt {subject} can\'t repay',
    // Transformation
    'what {subject} {has} become', 'the person {subject} lost',
    '{possessive} stolen humanity', '{possessive} corrupted soul',
    // Specific
    'the deal with the devil', 'the curse {subject} accepted',
    'the Faustian bargain', 'the monkey\'s paw'
  ]);
}

/**
 * Specific consequences of wishes WITHOUT placeholders
 * (for use as nemeses where no replacement happens)
 */
export function wishConsequence(): string {
  return pick([
    // Greed
    'their insatiable greed', 'their hunger for more',
    'their addiction to power', 'their endless desire',
    // Creation
    'the nightmare they created', 'the monster they became',
    'the world they destroyed', 'the people they hurt',
    // Loss
    'the price of their ambition', 'the cost of their wish',
    'the sacrifice they didn\'t understand', 'the debt they can\'t repay',
    // Transformation
    'what they have become', 'the person they lost',
    'their stolen humanity', 'their corrupted soul',
    // Specific
    'the deal with the devil', 'the curse they accepted',
    'the Faustian bargain', 'the monkey\'s paw'
  ]);
}

