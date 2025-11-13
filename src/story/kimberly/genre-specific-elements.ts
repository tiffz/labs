/**
 * The Kimberly System - Genre-Specific Elements
 * 
 * Based on Save the Cat! logline templates, these generators ensure that
 * story elements match the specific requirements of each genre.
 * 
 * Each genre has specific adjectives and elements that make the hero,
 * nemesis, and other story components work perfectly for that genre.
 */

import { pick } from './core';
import { him, his } from './realistic-names';
import { 
  deadlyCreature, 
  specificVillain, 
  wishConsequence,
  naturalDisaster,
  supernaturalThreat
} from './specific-details';

// ============================================================================
// MONSTER IN THE HOUSE
// ============================================================================

/**
 * "Culpable" hero - someone whose actions led to the problem
 */
export function culpableAdjective(): string {
  return pick([
    'reckless', 'arrogant', 'negligent', 'greedy', 'ambitious',
    'careless', 'overconfident', 'foolish', 'hubristic', 'irresponsible'
  ]);
}

/**
 * The "sin" that unleashed the monster
 */
export function monsterSin(): string {
  return pick([
    'forbidden experiments', 'tampering with nature', 'greed for power',
    'reckless ambition', 'breaking sacred rules', 'playing god',
    'hubris', 'negligence', 'curiosity gone too far', 'desire for control'
  ]);
}

// ============================================================================
// GOLDEN FLEECE
// ============================================================================

/**
 * "Driven" hero - someone with strong motivation
 */
export function drivenAdjective(): string {
  return pick([
    'determined', 'obsessed', 'relentless', 'driven', 'single-minded',
    'ambitious', 'desperate', 'focused', 'unwavering', 'compelled'
  ]);
}

/**
 * The "prize" they seek
 */
export function goldenFleecePrize(): string {
  return pick([
    'a legendary artifact', 'a stolen fortune', 'a cure for a deadly disease',
    'a missing loved one', 'proof of innocence', 'a sacred relic',
    'a powerful weapon', 'the truth about their past', 'a priceless treasure',
    'redemption', 'a second chance', 'their stolen identity'
  ]);
}

// ============================================================================
// OUT OF THE BOTTLE
// ============================================================================

/**
 * "Covetous" hero - someone who wants what they shouldn't have
 */
export function covetousAdjective(): string {
  return pick([
    'greedy', 'envious', 'desperate', 'dissatisfied', 'covetous',
    'ambitious', 'jealous', 'yearning', 'discontented', 'longing'
  ]);
}

/**
 * The "wish" or "spell" they invoke
 */
export function magicalWish(): string {
  return pick([
    'unlimited power', 'a second chance at life', 'the ability to control time',
    'to be someone else', 'to have everything they desire', 'to change the past',
    'to be loved by everyone', 'to never feel pain', 'eternal youth',
    'to be the best', 'to undo their mistakes', 'to be understood'
  ]);
}

// ============================================================================
// DUDE WITH A PROBLEM
// ============================================================================

/**
 * "Innocent" hero - someone who did nothing wrong
 */
export function innocentAdjective(): string {
  return pick([
    'ordinary', 'unsuspecting', 'innocent', 'unwitting', 'naive',
    'unprepared', 'peaceful', 'simple', 'unassuming', 'normal'
  ]);
}

/**
 * The "sudden event" that disrupts their life
 */
export function suddenEvent(): string {
  return pick([
    'a terrorist attack', 'a deadly conspiracy', 'a natural disaster',
    'a home invasion', 'a kidnapping', 'a plane crash', 'a zombie outbreak',
    'a corporate cover-up gone deadly', 'a wrongful accusation',
    'being in the wrong place at the wrong time', 'a case of mistaken identity'
  ]);
}

// ============================================================================
// RITES OF PASSAGE
// ============================================================================

/**
 * "Troubled" hero - someone facing internal struggles
 */
export function troubledAdjective(): string {
  return pick([
    'troubled', 'lost', 'broken', 'struggling', 'conflicted',
    'tormented', 'haunted', 'wounded', 'confused', 'spiraling'
  ]);
}

/**
 * The "life problem" they face
 */
export function lifeProblem(): string {
  return pick([
    'a devastating loss', 'a career collapse', 'a broken relationship',
    'a midlife crisis', 'coming of age', 'a family tragedy',
    'a personal failure', 'an identity crisis', 'addiction',
    'the death of a loved one', 'a crisis of faith', 'growing up'
  ]);
}

// ============================================================================
// BUDDY LOVE
// ============================================================================

/**
 * "Inadequate" or "incomplete" hero - someone who needs another to be whole
 */
export function inadequateAdjective(): string {
  return pick([
    'incomplete', 'inadequate', 'lonely', 'isolated', 'broken',
    'damaged', 'lost', 'empty', 'unfulfilled', 'disconnected'
  ]);
}

/**
 * The "extremely difficult situation" keeping them apart
 */
export function extremelyDifficultSituation(): string {
  return pick([
    'a deadly war', 'a family feud', 'a corporate rivalry',
    'a supernatural threat', 'a race against time', 'a dangerous conspiracy',
    'opposing sides of a conflict', 'a life-changing mission',
    'insurmountable social barriers', 'a forbidden love', 'impossible circumstances'
  ]);
}

/**
 * "Uniquely unlikely" partner - the counterpart
 */
export function uniquelyUnlikelyPartner(): string {
  const uniqueness = pick([
    'completely opposite', 'from another world', 'sworn enemy',
    'forbidden', 'impossible', 'unexpected', 'surprising',
    'unconventional', 'unprecedented', 'extraordinary'
  ]);
  
  const partnerType = pick([
    'rival', 'enemy', 'stranger', 'outsider', 'opposite',
    'counterpart', 'complement', 'mirror image', 'foil'
  ]);
  
  return `${uniqueness} ${partnerType}`;
}

/**
 * How the hero is incomplete and how the partner completes them
 */
export interface IncompletenessAndCompletion {
  incompleteness: string;
  completion: string;
}

export function incompletenessAndCompletion(characterId: string = 'hero'): IncompletenessAndCompletion {
  // Get pronouns for this character
  const heroObject = him(characterId);
  const heroPossessive = his(characterId);
  
  const pairs: IncompletenessAndCompletion[] = [
    { incompleteness: 'emotional numbness', completion: `teaches ${heroObject} to feel again` },
    { incompleteness: 'rigid perfectionism', completion: `shows ${heroObject} joy and spontaneity` },
    { incompleteness: 'reckless impulsivity', completion: `grounds ${heroObject} with wisdom` },
    { incompleteness: 'blind ambition', completion: `reminds ${heroObject} what truly matters` },
    { incompleteness: 'haunted guilt', completion: `helps ${heroObject} embrace the future` },
    { incompleteness: 'deep mistrust', completion: 'proves trust is possible' },
    { incompleteness: 'bitter cynicism', completion: `restores ${heroPossessive} faith in humanity` },
    { incompleteness: 'prideful isolation', completion: `shows ${heroObject} the value of vulnerability` },
    { incompleteness: 'suffocating duty', completion: `teaches ${heroObject} to follow ${heroPossessive} heart` },
    { incompleteness: 'paralyzing fear', completion: `gives ${heroObject} courage to live` },
    { incompleteness: 'emotional detachment', completion: `makes ${heroObject} feel alive again` },
    { incompleteness: 'workaholic obsession', completion: `shows ${heroObject} life beyond achievement` },
    { incompleteness: 'self-destructive anger', completion: `teaches ${heroObject} peace and forgiveness` },
    { incompleteness: 'crippling insecurity', completion: `helps ${heroObject} see ${heroPossessive} own worth` },
    { incompleteness: 'lonely independence', completion: `shows ${heroObject} the strength in connection` }
  ];
  
  return pick(pairs);
}

// ============================================================================
// WHYDUNIT
// ============================================================================

/**
 * "Single-minded" detective hero
 */
export function singleMindedAdjective(): string {
  return pick([
    'obsessed', 'single-minded', 'relentless', 'driven', 'fixated',
    'consumed', 'haunted', 'determined', 'compulsive', 'dogged'
  ]);
}

/**
 * The "intriguing mystery"
 */
export function intriguingMystery(): string {
  return pick([
    'a series of impossible murders', 'a decades-old conspiracy',
    'a missing person case that haunts them', 'a string of connected crimes',
    'a buried secret', 'a pattern of deaths', 'a cold case',
    'a web of lies and corruption', 'a puzzle that defies logic',
    'a crime that mirrors their past', 'a mystery that consumes them'
  ]);
}

// ============================================================================
// FOOL TRIUMPHANT
// ============================================================================

/**
 * "Innocent" or "naive" fool hero
 */
export function foolishAdjective(): string {
  return pick([
    'naive', 'innocent', 'simple', 'genuine', 'honest',
    'unsophisticated', 'pure-hearted', 'guileless', 'sincere', 'authentic'
  ]);
}

/**
 * The "establishment" they must overcome
 */
export function establishment(): string {
  return pick([
    'the elite upper class', 'a corrupt corporation', 'a rigid institution',
    'the popular crowd', 'a powerful family', 'the establishment',
    'a prestigious organization', 'a closed society', 'the aristocracy',
    'the old guard', 'the ruling elite', 'the privileged few'
  ]);
}

// ============================================================================
// INSTITUTIONALIZED
// ============================================================================

/**
 * "Outsider" hero who doesn't fit in
 */
export function outsiderAdjective(): string {
  return pick([
    'rebellious', 'independent', 'nonconformist', 'defiant', 'individualistic',
    'unconventional', 'maverick', 'rogue', 'free-spirited', 'unorthodox'
  ]);
}

/**
 * The "group" or institution
 */
export function oppressiveGroup(): string {
  return pick([
    'a powerful corporation', 'a military organization', 'a religious cult',
    'a family dynasty', 'a political machine', 'a criminal empire',
    'a totalitarian regime', 'a secret society', 'a strict hierarchy',
    'an authoritarian system', 'a conformist culture'
  ]);
}

// ============================================================================
// SUPERHERO
// ============================================================================

/**
 * "Uniquely special" hero with powers
 */
export function uniquelySpecialAdjective(): string {
  return pick([
    'gifted', 'extraordinary', 'superhuman', 'exceptional', 'unique',
    'powerful', 'enhanced', 'special', 'chosen', 'blessed'
  ]);
}

/**
 * The "curse" of their powers
 */
export function superheroCurse(): string {
  return pick([
    'isolates them from humanity', 'makes them feared by those they protect',
    'destroys their normal life', 'turns them into a weapon',
    'costs them their relationships', 'makes them a target',
    'forces impossible choices', 'consumes their identity',
    'separates them from loved ones', 'burdens them with responsibility',
    'makes them question their humanity'
  ]);
}

// ============================================================================
// GENRE-SPECIFIC HERO ADJECTIVE SELECTOR
// ============================================================================

/**
 * Returns the appropriate hero adjective based on genre
 */
export function genreSpecificHeroAdjective(genre: string): string {
  switch (genre) {
    case 'Monster in the House':
      return culpableAdjective();
    case 'Golden Fleece':
      return drivenAdjective();
    case 'Out of the Bottle':
      return covetousAdjective();
    case 'Dude with a Problem':
      return innocentAdjective();
    case 'Rites of Passage':
      return troubledAdjective();
    case 'Buddy Love':
      return inadequateAdjective();
    case 'Whydunit':
      return singleMindedAdjective();
    case 'Fool Triumphant':
      return foolishAdjective();
    case 'Institutionalized':
      return outsiderAdjective();
    case 'Superhero':
      return uniquelySpecialAdjective();
    default:
      // Fallback to general adjectives
      return pick([
        'determined', 'troubled', 'driven', 'conflicted', 'ambitious',
        'reluctant', 'desperate', 'haunted', 'resilient', 'complex'
      ]);
  }
}

// ============================================================================
// GENRE-SPECIFIC NEMESIS/ANTAGONIST SELECTOR
// ============================================================================

/**
 * Returns the appropriate nemesis/antagonist based on genre
 */
export function genreSpecificNemesis(genre: string): string {
  switch (genre) {
    case 'Monster in the House':
      // The monster itself - use deadlyCreature() 40% of the time
      if (Math.random() < 0.4) return deadlyCreature();
      return pick([
        'a virus outbreak spreading fast', 'a rogue killer AI', 'a parasitic organism',
        'a possessed object', 'a malevolent spirit haunting them', 'an alien predator',
        'a demonic force', 'a sentient disease', 'a reality-warping entity',
        'a time-displaced creature', 'a biological weapon', 'a nano-swarm'
      ]);
    
    case 'Golden Fleece':
      // The obstacles on the road - use specificVillain() 30% of the time
      if (Math.random() < 0.3) return specificVillain();
      if (Math.random() < 0.2) return naturalDisaster();
      return pick([
        'a ruthless rival hunting them', 'a treacherous landscape', 
        'a deadly mercenary organization', 'a vengeful enemy from their past',
        'a hostile territory with no allies', 'a competing team willing to kill',
        'a relentless bounty hunter', 'a ticking clock counting down',
        'a betrayer within their ranks', 'a cursed path', 'a guardian beast',
        'a rival expedition', 'a government black ops team'
      ]);
    
    case 'Out of the Bottle':
      // The consequences of the wish/spell - use wishConsequence() 30% of the time
      if (Math.random() < 0.3) return wishConsequence();
      return pick([
        'the unintended consequences spiraling out of control', 'the price of the wish',
        'the dark side of their desire', 'the curse of getting what they wanted',
        'the chaos they unleashed', 'their own greed consuming them', 
        'the magic gone wrong', 'the reality they created', 'the trap of their fantasy',
        'the cost of their ambition', 'the monster they became',
        'the devil\'s bargain', 'the monkey\'s paw', 'the Faustian deal'
      ]);
    
    case 'Dude with a Problem':
      // The sudden threat - use naturalDisaster() 20% of the time
      if (Math.random() < 0.2) return naturalDisaster();
      return pick([
        'a terrorist organization', 'a deadly conspiracy reaching the top',
        'a home invader', 'a kidnapper', 'a corrupt system hunting them', 
        'a zombie horde', 'a plane hijacker', 'a serial killer targeting them',
        'a corporate cover-up', 'a military coup', 'a pandemic outbreak',
        'a technological catastrophe', 'a nuclear meltdown', 'a biological weapon',
        'a cyber attack', 'an EMP strike', 'a rogue AI'
      ]);
    
    case 'Rites of Passage':
      // Internal struggle or life circumstance (more specific)
      return pick([
        'their own demons whispering lies', 'a devastating loss that broke them', 
        'a midlife crisis', 'their past mistakes haunting them', 
        'a broken relationship they can\'t fix', 'addiction destroying their life',
        'a family tragedy tearing them apart', 'their own fear paralyzing them', 
        'a career collapse', 'an identity crisis', 'their own weakness',
        'the passage of time they can\'t stop', 'grief consuming them',
        'shame from their past', 'regret eating them alive', 'self-hatred'
      ]);
    
    case 'Buddy Love':
      // Already handled separately with extremelyDifficultSituation()
      return extremelyDifficultSituation();
    
    case 'Whydunit':
      // The mystery/criminal - use specificVillain() 20% of the time
      if (Math.random() < 0.2) return specificVillain();
      return pick([
        'a brilliant serial killer', 'a master manipulator pulling strings', 
        'a hidden conspiracy', 'a ghost from their past', 'a cunning adversary',
        'a web of lies', 'a dangerous cult', 'a criminal mastermind',
        'a buried secret', 'a powerful organization', 'the truth itself',
        'a copycat killer', 'a vigilante', 'a corrupt detective',
        'a killer hiding in plain sight', 'someone they trust'
      ]);
    
    case 'Fool Triumphant':
      // The establishment/elite (more specific)
      return pick([
        'the elite upper class', 'a corrupt corporation', 'a rigid institution',
        'the popular crowd', 'a powerful dynasty', 'the establishment',
        'a prestigious university', 'a closed society', 'the aristocracy',
        'the old guard', 'the ruling elite', 'the privileged few',
        'high society', 'the country club set', 'the Ivy League',
        'the corporate ladder', 'the political machine'
      ]);
    
    case 'Institutionalized':
      // The oppressive group/system (more specific)
      return pick([
        'a powerful corporation', 'a military organization', 'a religious cult',
        'a family dynasty', 'a political machine', 'a criminal empire',
        'a totalitarian regime', 'a secret society', 'a strict hierarchy',
        'an authoritarian system', 'a conformist culture', 'the mob',
        'a fascist government', 'a fundamentalist group', 'the system itself',
        'a corrupt police force', 'an oppressive tradition'
      ]);
    
    case 'Superhero':
      // The supervillain or external threat - use specificVillain() 20% of the time
      if (Math.random() < 0.2) return specificVillain();
      if (Math.random() < 0.1) return supernaturalThreat();
      return pick([
        'a powerful supervillain', 'a dark mirror of themselves',
        'a government agency hunting them', 'a rival hero', 'a mad scientist',
        'an alien invasion', 'a corrupt organization', 'a nemesis from their past',
        'a world that fears them', 'a secret society', 'a rogue AI',
        'an ancient evil awakening', 'a terrorist organization', 
        'a criminal mastermind', 'a reality-warping villain',
        'a time-traveling threat', 'a cosmic entity'
      ]);
    
    default:
      // Fallback to general nemesis
      return pick([
        'a dangerous adversary', 'a powerful enemy', 'a deadly threat',
        'a ruthless opponent', 'a formidable challenge', 'a dark force'
      ]);
  }
}

