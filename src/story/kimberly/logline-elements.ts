/**
 * The Kimberly System - Logline Elements
 * 
 * These are the specific elements that appear in loglines and should be
 * consistently used throughout the story generation.
 * 
 * Each genre's logline has specific elements that need to be generated
 * and then reused in the story DNA and genre elements.
 */

import { pick } from './core';
import { incompletenessAndCompletion } from './genre-specific-elements';

export type { IncompletenessAndCompletion } from './genre-specific-elements';

// ============================================================================
// BUDDY LOVE LOGLINE ELEMENTS
// ============================================================================

export interface BuddyLoveElements {
  incompleteness: string; // The hero's flaw/incompleteness (e.g., "cowardice")
  completion: string; // How the counterpart completes them
  situation: string; // The difficult situation (e.g., "a corporate rivalry")
  complication: string; // What keeps them apart (e.g., "bound by a terrible secret")
}

/**
 * Generate just the incompleteness/completion pair
 */
export function generateIncompletenessCompletion(): { incompleteness: string; completion: string } {
  const pair = incompletenessAndCompletion();
  return {
    incompleteness: pair.incompleteness,
    completion: pair.completion
  };
}

/**
 * Generate just the situation
 */
export function generateSituation(): string {
  const situations = [
    // Conflict & danger
    'a deadly mission', 'a war', 'a dangerous conspiracy', 'a criminal empire',
    'a supernatural threat', 'a terrorist plot', 'a deadly competition',
    'a hostage situation', 'a military operation', 'a covert mission',
    // Rivalry & opposition
    'a family feud', 'a corporate rivalry', 'a political conflict', 'a bitter rivalry',
    'a class divide', 'a cultural clash', 'a professional competition',
    // Time & stakes
    'a race against time', 'a ticking clock', 'a countdown to disaster',
    'a terminal diagnosis', 'an impending catastrophe',
    // Journey & transformation
    'a life-changing journey', 'a dangerous expedition', 'a quest for redemption',
    'a cross-country escape', 'a perilous voyage'
  ];
  return pick(situations);
}

/**
 * Generate just the complication
 */
export function generateComplication(): string {
  const complications = [
    'from opposite worlds', 'sworn enemies', 'forbidden by society',
    'separated by impossible circumstances', 'destined to be apart',
    'on opposite sides of a conflict', 'from different times',
    'bound by a terrible secret', 'facing an impossible choice',
    'divided by loyalty', 'trapped by duty'
  ];
  return pick(complications);
}

export function generateBuddyLoveElements(): BuddyLoveElements {
  const pair = generateIncompletenessCompletion();
  
  return {
    incompleteness: pair.incompleteness,
    completion: pair.completion,
    situation: generateSituation(),
    complication: generateComplication()
  };
}

// ============================================================================
// MONSTER IN THE HOUSE LOGLINE ELEMENTS
// ============================================================================

export interface MonsterInTheHouseElements {
  sin: string; // What unleashed the monster
  house: string; // The trapped location
  monster: string; // The threat (from genreSpecificNemesis)
  stakes: string; // What must be saved/accomplished
}

export function generateMonsterInTheHouseElements(monster: string): MonsterInTheHouseElements {
  const sins = [
    'reckless ambition', 'greed', 'curiosity',
    'arrogance', 'negligence', 'hubris',
    'desire for power', 'forbidden experiments',
    'playing god', 'breaking sacred rules'
  ];
  
  const houses = [
    // Isolated structures
    'an isolated mansion', 'a remote research facility', 'an underground bunker',
    'a lighthouse', 'a mountain cabin', 'an abandoned hospital',
    'a derelict asylum', 'a forgotten monastery', 'a desert outpost',
    // Vehicles & vessels
    'a cruise ship', 'a space station', 'a submarine', 'an airplane',
    'a train', 'a cargo ship', 'an orbital platform',
    // Communities
    'a small town', 'a college campus', 'a military base', 'a family home',
    'a gated community', 'a summer camp', 'a resort hotel', 'a prison',
    // Remote locations
    'a remote island', 'an arctic station', 'a jungle research camp',
    'a mining colony', 'a deep-sea facility'
  ];
  
  const stakes = [
    'save their family from certain death',
    'rescue a group of strangers before it\'s too late',
    'protect innocent children from being killed',
    'save their colleagues from a gruesome fate',
    'escape with the survivors before dawn',
    'find a cure before everyone dies',
    'stop the spread before it reaches the mainland',
    'destroy the threat before it multiplies',
    'seal the evil away before it consumes them all',
    'get everyone out alive before the place is destroyed'
  ];
  
  return {
    sin: pick(sins),
    house: pick(houses),
    monster,
    stakes: pick(stakes)
  };
}

// ============================================================================
// GOLDEN FLEECE LOGLINE ELEMENTS
// ============================================================================

export interface GoldenFleeceElements {
  prize: string; // What they're seeking
  journey: string; // The perilous path
  team: string; // The group they lead
  challenge: string; // The specific obstacle/test they face
}

export function generateGoldenFleeceElements(): GoldenFleeceElements {
  const prizes = [
    'a legendary artifact', 'a stolen fortune', 'a cure for a deadly disease',
    'a missing person', 'proof of innocence', 'a sacred relic',
    'a powerful weapon', 'the truth about their past', 'a priceless treasure',
    'a way home', 'redemption', 'a second chance'
  ];
  
  const journeys = [
    // Terrestrial journeys
    'across a war-torn country', 'through hostile territory', 'across the country',
    'through a dangerous wilderness', 'into enemy territory', 'across a frozen wasteland',
    'through the desert', 'over treacherous mountains', 'through a haunted forest',
    'across a lawless frontier', 'through underground tunnels',
    // Water journeys
    'across the ocean', 'down a raging river', 'through stormy seas',
    'beneath the waves', 'across uncharted waters',
    // Otherworldly journeys
    'into the depths of space', 'through time itself', 'into another dimension',
    'through a post-apocalyptic wasteland', 'into the underworld', 'across parallel worlds',
    // Urban/social journeys
    'into the criminal underworld', 'through the corridors of power',
    'into the heart of darkness', 'through layers of deception'
  ];
  
  const teams = [
    // Mismatched groups
    'a ragtag team', 'a group of misfits', 'a motley crew', 'a band of outcasts',
    'unlikely allies', 'a desperate crew', 'a group of strangers', 'former enemies',
    'an odd couple', 'a dysfunctional family', 'rival factions',
    // Skilled groups
    'a team of specialists', 'a group of experts', 'elite operatives',
    'seasoned veterans', 'trained professionals',
    // Reluctant groups
    'unwilling companions', 'conscripted soldiers', 'reluctant heroes',
    'prisoners on a mission', 'volunteers with nothing to lose'
  ];
  
  const challenges = [
    'battling enemies who want it for themselves',
    'facing betrayal from within their own ranks',
    'racing against a rival team',
    'overcoming impossible odds that test their loyalty',
    'surviving deadly traps set by ancient guardians',
    'confronting the truth about why they really want it',
    'sacrificing what they hold most dear',
    'proving they\'re worthy of the prize',
    'discovering the journey matters more than the destination',
    'learning the prize comes at a terrible cost'
  ];
  
  return {
    prize: pick(prizes),
    journey: pick(journeys),
    team: pick(teams),
    challenge: pick(challenges)
  };
}

// ============================================================================
// OUT OF THE BOTTLE LOGLINE ELEMENTS
// ============================================================================

export interface OutOfTheBottleElements {
  wish: string; // What they wished for
  consequence: string; // The dark side of the wish
  lesson: string; // What they must learn
  undoMethod: string; // How they must undo it (adds variety and tension)
}

export function generateOutOfTheBottleElements(): OutOfTheBottleElements {
  const wishes = [
    // Power & control
    'unlimited power', 'the ability to control time', 'to control minds',
    'to see the future', 'to change fate', 'immortality', 'invincibility',
    // Identity & transformation
    'to be someone else', 'to be beautiful', 'to be famous', 'to be the best at everything',
    'to be loved by everyone', 'to be feared', 'to be invisible',
    // Past & time
    'a second chance at life', 'to change the past', 'to undo their mistakes',
    'to relive their glory days', 'to go back in time',
    // Escape & avoidance
    'to never feel pain again', 'to forget everything', 'to escape their life',
    'to have no responsibilities', 'to never age',
    // Desire & greed
    'to have everything they desire', 'unlimited wealth', 'eternal youth',
    'perfect happiness', 'to have it all'
  ];
  
  const consequences = [
    'losing {possessive} humanity', 'destroying everything {subject} loves', 'becoming the villain',
    'losing {possessive} identity', 'trapping {reflexive} forever', 'hurting innocent people',
    'creating a worse reality', 'becoming what {subject} feared most',
    'losing what matters most', 'corrupting {possessive} soul', 'erasing {possessive} memories',
    'turning everyone against {object}', 'destroying the world', 'becoming a monster',
    'losing {possessive} free will', 'repeating the same day forever'
  ];
  
  const lessons = [
    // Classic wisdom
    'be careful what you wish for', 'you can\'t escape yourself',
    'the grass isn\'t always greener', 'power corrupts',
    'there are no shortcuts', 'you must earn what you want',
    'the price is too high', 'some things can\'t be undone',
    // Deeper truths
    'you can\'t change who you are', 'happiness comes from within',
    'the past should stay in the past', 'perfection is a prison',
    'you need struggle to grow', 'easy answers lead to hard consequences',
    'wanting everything means losing everything', 'control is an illusion',
    'running from problems makes them worse', 'shortcuts always cost more'
  ];
  
  const undoMethods = [
    // Direct action
    'undo the spell', 'break the curse', 'reverse the magic',
    'destroy the source', 'speak the counter-spell', 'return the power',
    // Sacrifice
    'sacrifice what they gained', 'give up everything', 'pay the ultimate price',
    'trade their life', 'surrender their dreams',
    // Truth & acceptance
    'learn the truth', 'face the consequences', 'accept reality',
    'admit they were wrong', 'embrace who they really are',
    // Journey
    'find a way back', 'make things right', 'earn redemption',
    'prove they\'ve changed', 'complete an impossible task'
  ];
  
  return {
    wish: pick(wishes),
    consequence: pick(consequences),
    lesson: pick(lessons),
    undoMethod: pick(undoMethods)
  };
}

// ============================================================================
// DUDE WITH A PROBLEM LOGLINE ELEMENTS
// ============================================================================

export interface DudeWithAProblemElements {
  suddenEvent: string; // The catastrophic event
  stakes: string; // What they must save
  action: string; // What they must do (adds variety)
  escalation: string; // How the threat escalates (adds tension)
}

export function generateDudeWithAProblemElements(nemesis: string): DudeWithAProblemElements {
  const stakes = [
    '{possessive} family', 'innocent lives', '{possessive} city', '{possessive} country',
    'the world', '{possessive} loved ones', 'everything {subject} hold dear',
    '{possessive} own life', '{possessive} home', '{possessive} future'
  ];
  
  const actions = [
    // Aggressive action
    'fight to save', 'battle to defend', 'fight back to protect',
    'stand against impossible odds to save', 'wage war to protect',
    // Desperate action
    'race to protect', 'struggle to rescue', 'scramble to save',
    'claw their way to save', 'push beyond their limits to save',
    // Sacrificial action
    'risk everything to save', 'sacrifice to protect', 'give everything to save',
    'lay down their life to protect', 'abandon all hope to save',
    // Determined action
    'do whatever it takes to save', 'stop at nothing to protect',
    'overcome impossible odds to save', 'defy fate to save',
    'refuse to give up on', 'move heaven and earth to save'
  ];
  
  const escalations = [
    'before time runs out', 'as the threat grows worse',
    'while the danger escalates', 'before it\'s too late',
    'as the situation spirals out of control', 'before all is lost',
    'while fighting an enemy they can\'t see', 'with no way out',
    'against overwhelming odds', 'in a nightmare they never saw coming'
  ];
  
  return {
    suddenEvent: nemesis,
    stakes: pick(stakes),
    action: pick(actions),
    escalation: pick(escalations)
  };
}

// ============================================================================
// RITES OF PASSAGE LOGLINE ELEMENTS
// ============================================================================

export interface RitesOfPassageElements {
  lifeCrisis: string; // The life problem
  wrongWay: string; // How they handle it wrong
}

export function generateRitesOfPassageElements(): RitesOfPassageElements {
  const lifeCrises = [
    'the death of a loved one', 'a devastating divorce', 'a career collapse',
    'a terminal diagnosis', 'the loss of everything', 'a midlife crisis',
    'coming of age', 'a betrayal', 'a personal failure', 'an identity crisis',
    'addiction', 'a crisis of faith'
  ];
  
  const wrongWays = [
    'self-destruction', 'denial', 'running away', 'lashing out at others',
    'numbing the pain', 'blaming everyone else', 'giving up',
    'refusing to change', 'clinging to the past', 'spiraling into darkness'
  ];
  
  return {
    lifeCrisis: pick(lifeCrises),
    wrongWay: pick(wrongWays)
  };
}

// ============================================================================
// WHYDUNIT LOGLINE ELEMENTS
// ============================================================================

export interface WhydunitElements {
  mystery: string; // The intriguing case
  darkTurn: string; // The personal connection
}

export function generateWhydunitElements(): WhydunitElements {
  const mysteries = [
    // Murder mysteries
    'a series of impossible murders', 'a pattern of deaths', 'a locked-room murder',
    'a string of ritualistic killings', 'a copycat killer case',
    // Missing & disappeared
    'a missing person case', 'a vanished witness', 'a disappeared detective',
    'a string of unexplained disappearances',
    // Conspiracy & corruption
    'a decades-old conspiracy', 'a web of lies and corruption',
    'a government cover-up', 'a corporate conspiracy', 'a buried scandal',
    // Complex cases
    'a string of connected crimes', 'a puzzle that defies logic',
    'a crime that shouldn\'t exist', 'a cold case', 'a buried secret',
    'an unsolvable riddle', 'a case with no suspects', 'a perfect crime',
    // Supernatural/unusual
    'a series of supernatural events', 'a crime from the future',
    'a murder with no body', 'a victim who doesn\'t exist'
  ];
  
  const darkTurns = [
    // Personal connection
    'it mirrors {possessive} own past', 'it involves someone {subject} love',
    'it reveals {subject} {is} connected to the crime', 'it implicates {possessive} family',
    'it ties back to {possessive} childhood', 'it involves {possessive} mentor',
    // Danger & threat
    'it puts {object} in the killer\'s crosshairs', 'it makes {object} the next target',
    'it threatens {possessive} loved ones', 'it puts everyone {subject} trust in danger',
    // Revelation & truth
    'it threatens to expose {possessive} secrets', 'it forces {object} to confront {possessive} demons',
    'it uncovers a conspiracy {subject} {is} part of', 'it shows {subject} {has} been wrong all along',
    'it reveals {subject} {is} the villain', 'it proves {possessive} innocence was a lie',
    // Moral complexity
    'it forces {object} to choose between justice and loyalty',
    'it makes {object} question everything {subject} believe',
    'it reveals the victim deserved it', 'it shows there {is} no good answer'
  ];
  
  return {
    mystery: pick(mysteries),
    darkTurn: pick(darkTurns)
  };
}

// ============================================================================
// FOOL TRIUMPHANT LOGLINE ELEMENTS
// ============================================================================

export interface FoolTriumphantElements {
  establishment: string; // The elite they must overcome
  underestimation: string; // Why they're underestimated
}

export function generateFoolTriumphantElements(establishment: string): FoolTriumphantElements {
  const underestimations = [
    // Innocence & purity
    'naive innocence', 'pure heart', 'genuine kindness', 'childlike wonder',
    'trusting nature', 'simple faith', 'honest intentions',
    // Background & status
    'humble origins', 'outsider status', 'lack of pedigree', 'working-class roots',
    'immigrant background', 'rural upbringing', 'poverty',
    // Manner & style
    'lack of sophistication', 'unpolished manner', 'rough edges',
    'unsophisticated ways', 'simple speech', 'casual demeanor',
    // Approach & methods
    'unconventional methods', 'simple honesty', 'straightforward approach',
    'lack of formal training', 'unorthodox tactics', 'common sense wisdom'
  ];
  
  return {
    establishment,
    underestimation: pick(underestimations)
  };
}

// ============================================================================
// INSTITUTIONALIZED LOGLINE ELEMENTS
// ============================================================================

export interface InstitutionalizedElements {
  group: string; // The oppressive institution
  choice: string; // The impossible choice
}

export function generateInstitutionalizedElements(group: string): InstitutionalizedElements {
  const choices = [
    // Survival vs values
    'conform or be destroyed', 'survival or integrity', 'obedience or exile',
    'safety or truth', 'compliance or death', 'submission or punishment',
    // Identity vs belonging
    'acceptance or authenticity', 'belonging or independence',
    'fitting in or being themselves', 'approval or honesty',
    'conformity or individuality', 'the mask or the truth',
    // Loyalty vs morality
    'loyalty or freedom', 'duty or conscience', 'family or justice',
    'the group or what\'s right', 'tradition or change',
    // Power vs principles
    'power or principles', 'success or soul', 'ambition or integrity',
    'advancement or ethics', 'winning or staying true'
  ];
  
  return {
    group,
    choice: pick(choices)
  };
}

// ============================================================================
// SUPERHERO LOGLINE ELEMENTS
// ============================================================================

export interface SuperheroElements {
  power: string; // Their special ability
  curse: string; // The burden of their power
  villain: string; // The threat (from genreSpecificNemesis)
}

export function generateSuperheroElements(villain: string): SuperheroElements {
  const powers = [
    // Physical powers
    'superhuman strength', 'super speed', 'invulnerability',
    'enhanced agility', 'regeneration', 'super durability',
    // Movement powers
    'the ability to fly', 'teleportation', 'phasing through walls',
    'wall-crawling', 'super jumping',
    // Elemental powers
    'control over elements', 'fire manipulation', 'ice powers',
    'lightning control', 'water manipulation', 'earth control',
    // Mental powers
    'telepathy', 'telekinesis', 'mind control', 'precognition',
    'empathy', 'psychic abilities',
    // Energy & projection
    'energy projection', 'force fields', 'energy absorption',
    'plasma blasts', 'radiation control',
    // Transformation
    'shape-shifting', 'size manipulation', 'molecular control',
    'transformation abilities',
    // Time & reality
    'time manipulation', 'reality warping', 'dimensional travel',
    // Other
    'healing powers', 'technopathy', 'animal communication',
    'invisibility', 'density control'
  ];
  
  const curses = [
    'isolating {object} from humanity', 'making {object} feared by those {subject} protect',
    'destroying {possessive} normal life', 'turning {object} into a weapon',
    'costing {object} {possessive} relationships', 'making {object} a target',
    'forcing impossible choices', 'consuming {possessive} identity',
    'separating {object} from loved ones', 'burdening {object} with responsibility'
  ];
  
  return {
    power: pick(powers),
    curse: pick(curses),
    villain
  };
}

