/**
 * The Kimberly System - Genre-Specific Element Generators
 * 
 * Generators for genre-specific story elements
 */

import { pick } from './core';
import * as occupations from './occupations';
import * as adjectives from './adjectives';

// Whydunit elements
const detectives = [
  'jaded ex-cop', 'obsessed blogger', "victim's relative", '"nosy" neighbor',
  'PI on their first case', 'washed-up journalist', 'skeptical academic',
  'conspiracy theorist', 'corporate investigator', 'rogue data analyst',
  'honest cop', 'teen sleuth', 'amateur detective', 'retired investigator'
];

const secrets = [
  'hidden family tie', 'corporate cover-up', 'case of mistaken identity',
  'decades-old pact', 'hidden will', 'secret love affair', 'false alibi',
  'hidden identity', 'stolen invention', 'buried body', 'secret society',
  'forgotten crime', 'classified experiment', 'witness protection secret'
];

const darkTurns = [
  'main suspect is also a victim', 'mentor is the true villain', '"victim" isn\'t real',
  'detective is the killer', 'it was an accident', 'secret is protecting a bigger secret',
  'crime was a cover-up', 'supernatural element revealed', 'entire investigation is a setup',
  'secret is public knowledge', 'everyone was in on it', 'truth is worse than the lie'
];

// Rites of Passage elements
const lifeProblems = [
  'recent divorce', 'loss of a parent', 'starting at a new school', 'mid-life crisis',
  'serious illness', 'losing a job', 'crisis of faith', 'empty-nest syndrome',
  'first heartbreak', 'social anxiety', 'dealing with a bully', 'secret addiction',
  'coming out', 'retirement', 'becoming a parent', 'identity crisis'
];

const wrongWays = [
  'blaming everyone else', 'numbing pain with vice', 'trying to fix it with money',
  'denial', 'lashing out at loved ones', 'running away', 'obsessive behavior',
  'seeking revenge', 'becoming a hermit', "pretending it's fine", 'clinging to the past',
  'overcompensating', 'self-medicating', 'avoiding all reminders'
];

const acceptances = [
  '"it wasn\'t my fault"', '"it\'s okay to be sad"', '"I can\'t change them"',
  'symbolic funeral', 'letting go of a memento', 'final honest conversation',
  'embracing the new normal', 'quiet moment of peace', 'forgiving themselves',
  'moving to a new city', 'quitting the toxic job', 'writing a goodbye letter'
];

// Institutionalized elements
const groups = [
  'cutthroat law firm', 'remote scientific outpost', 'tight-knit family business',
  'high-school clique', 'military platoon', 'secret society', 'dysfunctional family',
  'band on tour', 'corporate office', 'religious cult', 'space-station crew',
  'sports team', 'underground resistance', 'hospital staff'
];

const choices = [
  'loyalty vs. morality', 'personal gain vs. group survival', 'conformity vs. truth',
  'love vs. duty', 'ambition vs. friendship', 'safety vs. freedom',
  'telling a hard truth', 'keeping a dangerous secret', 'sacrificing one for the many',
  'leaving the group', 'betraying the group', 'exposing corruption'
];

const sacrifices = [
  'giving up a promotion', 'losing a relationship', 'taking the fall for someone',
  'giving their own life', 'publicly humiliating themselves', "giving up life's work",
  'losing their home', 'betraying a principle', 'losing their status',
  'giving up their dream', 'accepting exile', 'destroying evidence'
];

// Superhero elements
const powers = [
  'mind-reading', 'super-strength', 'time manipulation', 'unbelievable luck',
  'invisibility', 'flying', 'teleportation', 'controlling fire', 'talking to animals',
  'seeing the future', 'healing factor', 'shapeshifting', 'super speed',
  'energy projection', 'telepathy', 'phasing through objects'
];

const curses = [
  'causes physical pain', 'alienates loved ones', 'shortens lifespan',
  'attracts monsters', "can't be controlled", 'requires a sacrifice',
  'hurts others by accident', 'constant unbearable noise', "can't touch another person",
  'loses memories', 'only works on Tuesdays', 'drains life force',
  'causes nightmares', 'ages user rapidly'
];

// Dude with a Problem elements
const innocentHeros = [
  'librarian', 'mail carrier', 'high-school kid', 'retired person', 'chef',
  'florist', 'mild-mannered teacher', 'struggling artist', 'barista',
  'dog walker', 'programmer', 'street musician', 'accountant', 'nurse'
];

const suddenEvents = [
  'plane crash in the wilderness', 'sudden pandemic', 'alien invasion',
  'building collapse', 'city-wide blackout', 'car breaks down', 'rogue wave',
  'zombie outbreak', 'trapped in a blizzard', 'wrong turn', 'kidnapping',
  'mistaken identity', 'terrorist attack', 'natural disaster'
];

const lifeOrDeathBattles = [
  'primal fight with an animal', 'desperate race against time', 'outsmarting a superior foe',
  'chase through a collapsing building', 'tense negotiation', 'final stand',
  'battle of wits', 'hiding from a predator', 'surviving the elements',
  'defusing a bomb', 'escaping a sinking ship', 'navigating a minefield'
];

// Fool Triumphant elements
const fools = [
  'clumsy janitor', 'ditzy socialite', 'failed artist', 'low-level bureaucrat',
  'fast-food worker', 'perpetually lost tourist', 'slacker gamer',
  'hopelessly naive optimist', 'weird neighbor', 'bumbling intern',
  'musician who only knows one song', 'aspiring influencer', 'conspiracy theorist'
];

const establishments = [
  'smug CEO', 'corrupt politician', 'prestigious university', 'popular trendsetter',
  'haughty critic', 'cool kids table', 'dismissive boss', 'rigid town council',
  'gatekeeping academic', 'powerful corporation', 'perfect family',
  'elite country club', 'snobbish art community'
];

const transmutations = [
  'dumb luck reveals the truth', 'useless skill becomes vital', 'foolishness is a virtue',
  'they annoy villain into a mistake', 'innocence wins over key ally',
  'accidentally discover the solution', 'succeed because they don\'t know the rules',
  'kindness is a superpower', 'honesty disarms the villain', 'naivety exposes the truth'
];

// Buddy Love elements
const incompleteHeros = [
  "cynic who can't love", 'workaholic with no friends', 'coward seeking courage',
  'grump who needs joy', 'arrogant person needing humility', 'slob who needs discipline',
  'rebel who needs a cause', 'follower who needs to lead', 'drifter who needs a home',
  'perfectionist who needs to let go', 'loner who needs connection'
];

const counterparts = [
  'new partner', 'rescue animal', 'long-lost sibling', 'wise-cracking child',
  'ghost', 'AI companion', 'rival-turned-friend', 'inspiring mentor',
  'new-in-town stranger', 'one that got away', 'unlikely ally', 'opposite personality'
];

const complications = [
  'societal taboo', 'dangerous ex', 'terminal illness', 'rival for their affection',
  'family feud', 'ticking clock', 'geographic separation', 'misunderstanding',
  'one of them is lying', 'on opposite sides of conflict', 'class difference',
  'forbidden love', 'competing priorities'
];

// Out of the Bottle elements
const wishes = [
  'magical amulet', 'winning lottery ticket', 'sudden promotion', 'waking up famous',
  'wish-granting genie', 'time-travel device', 'finding a magic book', 'love potion',
  'body-swap', 'mysterious inheritance', 'waking up with superpowers',
  'fountain of youth', 'cursed object', 'reality-warping device'
];

const spells = [
  'loses power at midnight', 'costs one year of life per use', 'only works on Tuesdays',
  "reversed by true love's kiss", 'has an ironic side-effect', 'requires a bizarre ingredient',
  'makes you tell the truth', 'drains your energy', 'gets stronger over time',
  'is highly addictive', 'requires a sacrifice', 'has a monkey\'s paw twist'
];

const lessons = [
  "money can't buy happiness", 'simple life is better', 'be careful what you wish for',
  'power corrupts', 'true love is what matters', "it's better to be yourself",
  'fame is a trap', 'family is most important', 'with great power comes great responsibility',
  'appreciate what you have', 'you can\'t change the past'
];

// Golden Fleece elements
const roads = [
  'cross-country highway', 'treacherous mountain path', 'journey through cyberspace',
  'voyage across the ocean', 'trip down a river', 'pilgrimage route',
  '"road" through time', 'following an old map', 'getaway drive', 'delivery route',
  'space voyage', 'underground tunnel system', 'magical portal network'
];

const teams = [
  'the Muscle', 'the Brains', 'the Wildcard', 'the Skeptic', 'the Getaway Driver',
  'the Healer', 'the Moral Compass', 'the Traitor', 'the Rookie', 'the Inside Man',
  'the Con Artist', 'the Tech Expert', 'the Face', 'the Leader'
];

const prizes = [
  'hidden treasure map', 'stolen data file', 'cure for a disease', 'lost city',
  'person to rescue', 'magical artifact', 'secret formula', 'Holy Grail',
  'priceless jewel', 'evidence to clear their name', 'golden ticket',
  'lost love', 'forbidden knowledge', 'ancient weapon'
];

// Monster in the House elements
const monsters = [
  'literal vampire/zombie', 'parasitic alien', 'psychological inner demon', 'rogue AI',
  'serial killer', 'ghost/poltergeist', 'creature from folklore', 'mutated animal',
  'corporation', 'corrupt system', 'darkness inside', 'possessed person',
  'supernatural entity', 'vengeful spirit'
];

const houses = [
  'claustrophobic submarine', 'haunted Victorian mansion', 'high-tech bunker-turned-prison',
  'remote cabin in the woods', 'spaceship off-course', 'quarantined city',
  'boarded-up school', 'luxury high-rise', 'small town', 'desert island',
  'single locked room', 'underground facility', 'isolated research station'
];

const sins = [
  'past betrayal', 'greedy experiment', 'terrible accident that was covered up',
  'act of hubris', 'theft', 'murder', 'broken promise', 'act of cowardice',
  'bullying', 'forbidden ritual', 'stealing sacred land', 'desecration',
  'abandoned responsibility', 'selfish decision'
];

// Export all generators

// Whydunit
export function detective(): string { return pick(detectives); }
export function secret(): string { return pick(secrets); }
export function darkTurn(): string { return pick(darkTurns); }

// Rites of Passage
export function lifeProblem(): string { return pick(lifeProblems); }
export function wrongWay(): string { return pick(wrongWays); }
export function acceptance(): string { return pick(acceptances); }

// Institutionalized
export function group(): string { return pick(groups); }
export function choice(): string { return pick(choices); }
export function sacrifice(): string { return pick(sacrifices); }

// Superhero
export function power(): string { return pick(powers); }
export function curse(): string { return pick(curses); }

// Dude with a Problem
export function innocentHero(): string { return pick(innocentHeros); }
export function suddenEvent(): string { return pick(suddenEvents); }
export function lifeOrDeathBattle(): string { return pick(lifeOrDeathBattles); }

// Fool Triumphant
export function fool(): string { return pick(fools); }
export function establishment(): string { return pick(establishments); }
export function transmutation(): string { return pick(transmutations); }

// Buddy Love
export function incompleteHero(): string { return pick(incompleteHeros); }
export function counterpart(): string { return pick(counterparts); }
export function complication(): string { return pick(complications); }

// Out of the Bottle
export function wish(): string { return pick(wishes); }
export function spell(): string { return pick(spells); }
export function lesson(): string { return pick(lessons); }

// Golden Fleece
export function road(): string { return pick(roads); }
export function team(): string { return pick(teams); }
export function prize(): string { return pick(prizes); }

// Monster in the House
export function monster(): string { return pick(monsters); }
export function house(): string { return pick(houses); }
export function sin(): string { return pick(sins); }

/**
 * Map genre element names to their generator functions
 */
export const genreElementMap: Record<string, () => string> = {
  'The Detective': detective,
  'The Secret': secret,
  'The Dark Turn': darkTurn,
  'The Life Problem': lifeProblem,
  'The Wrong Way': wrongWay,
  'The Acceptance': acceptance,
  'The Group': group,
  'The Choice': choice,
  'The Sacrifice': sacrifice,
  'The Power': power,
  'The Nemesis': () => `${adjectives.evil()} ${occupations.worker()}`,
  'The Curse': curse,
  'The Innocent Hero': innocentHero,
  'The Sudden Event': suddenEvent,
  'The Life or Death Battle': lifeOrDeathBattle,
  'The Fool': fool,
  'The Establishment': establishment,
  'The Transmutation': transmutation,
  'The Incomplete Hero': incompleteHero,
  'The Counterpart': counterpart,
  'The Complication': complication,
  'The Wish': wish,
  'The Spell': spell,
  'The Lesson': lesson,
  'The Road': road,
  'The Team': team,
  'The Prize': prize,
  'The Monster': monster,
  'The House': house,
  'The Sin': sin,
};

