/**
 * The Kimberly System - Story Beat Generators
 * 
 * Generators for specific story beat elements
 */

import { pick } from './core';

// Opening Image
const openingActions = [
  'staring out a window', 'arguing with a colleague', 'performing a mundane task',
  'waking up late', 'failing at their job', 'avoiding a phone call',
  'packing a suitcase', 'sitting in traffic', 'obsessively cleaning',
  'looking at an old photo', 'checking their phone repeatedly', 'ignoring responsibilities'
];

// Theme Stated
const minorCharacters = [
  'barista', 'janitor', 'cab driver', 'street vendor', 'old librarian',
  'cynical bartender', 'weary office admin', 'chatty rideshare driver',
  'grumpy security guard', 'wise-cracking kid', 'homeless philosopher', 'street artist'
];

// Setup
const stasisIsDeathOptions = [
  'stuck in a loop', 'refusing to change', 'dreaming of a past life',
  'stuck in a dead-end job', 'ignoring a serious problem', 'their world is shrinking',
  'repeating the same mistake', 'relationship is failing', 'numbing the pain',
  'living on autopilot', 'trapped by routine', 'slowly deteriorating'
];

const statedGoalOptions = [
  'pursuing a shallow goal', 'trying to win back an ex', 'obsessed with a promotion',
  'desperate for money', 'chasing fame', 'trying to "fix" their life',
  'just trying to get by', 'wanting to be left alone', 'seeking revenge',
  'proving themselves', 'escaping their past', 'finding validation'
];

// Catalyst
const catalystEvents = [
  'cryptic message arrives', 'city-wide blackout', 'mysterious stranger appears',
  'catastrophic lab accident', 'unexpected inheritance', 'waking with a new power',
  'public humiliation', 'declaration of war', 'sudden death', 'betrayal',
  'discovery of evidence', 'forced relocation', 'prophetic dream'
];

// Debate
const debateQuestions = [
  '"Should I risk it?"', '"Can I do this?"', '"This is insane. I should just go home."',
  'weighing the pros and cons', 'moment of pure panic and indecision', 'preparation montage',
  'looking for an easy way out', '"Why me?"', 'seeking advice from the wrong person',
  '"What do I have to lose?"', '"What if I fail?"'
];

// Fun and Games
const promiseOfPremiseOptions = [
  'scenes showing the core concept', 'montage of training/failure',
  'exploring the new world', 'first encounters with new allies/foes',
  'fish out of water sequence', 'new power is tested',
  'new relationship blossoms', 'quest begins', 'learning the ropes',
  'initial victories', 'comedic mishaps'
];

const successFailureOptions = [
  'hero thrives unexpectedly', 'hero flounders badly', 'newbie success montage',
  'series of comical failures', 'small victory followed by big setback',
  'they are in way over their head', 'they discover an unknown skill',
  'they make a powerful enemy', 'beginners luck runs out'
];

// Midpoint
const midpointEvents = [
  'false victory: a trap is sprung', 'false defeat: betrayal by an ally',
  'key item is destroyed', 'new power with a high cost', "villain's motive is revealed",
  'hero is captured', 'secret is revealed', 'hero and B-story character kiss',
  'point of no return is crossed', 'unexpected ally appears', 'true enemy revealed'
];

const stakesRaisedOptions = [
  'goal is now harder', 'consequences are dire', 'new personal threat is revealed',
  "villain reveals their true power", "hero's loved one is now in danger",
  'ticking clock is accelerated', 'key ally is captured', "hero's secret is exposed",
  'entire world is at stake', 'backup plan fails'
];

// All Is Lost
const whiffsOfDeath = [
  'mentor figure is killed', 'hero is left for dead', 'symbolic death (loss of job/home)',
  'ticking clock is revealed', "glimpse of villain's true power", 'beloved side-character is killed',
  'hero\'s "safe place" is destroyed', 'public execution is announced', 'hope is extinguished',
  'ultimate failure', 'point of no return'
];

const rockBottomOptions = [
  "hero's lowest point", 'plan has failed utterly', 'moment of total despair',
  'betrayed and alone', 'everything they worked for is destroyed',
  'their flaw has cost them everything', 'villain has won... for now',
  'whiff of death is real', 'lost everything that mattered', 'no way forward'
];

// Dark Night of the Soul
const reflectionOptions = [
  'alone, hero confronts their failure', 'quiet moment in the wreckage',
  '"ghost" from the past appears', 'hero finally breaks down',
  'B-Story character gives a pep talk', 'hero re-reads the "Theme Stated" note',
  'hero remembers "the old life"', 'moment of total silence', 'staring into the abyss',
  'questioning everything', 'epiphany in darkness'
];

const epiphanies = [
  '"the power was in me all along"', '"I\'ve been the real monster"',
  '"to win, I have to let go"', '"my flaw is their greatest weapon"',
  '"I don\'t need to do this alone"', '"I was wrong about them"',
  '"this was never about the prize"', '"the answer was obvious"',
  '"I have to accept who I am"', '"fear was the only enemy"'
];

// Break Into 3
const breakInto3Options = [
  'hero formulates new plan based on theme', 'last-ditch effort',
  'quiet, determined choice to act', 'gathers the team for one last try',
  '"Eureka!" moment', 'hero decides to sacrifice themselves',
  'plan is simple, and crazy', 'hero finally embraces their "need"',
  'accepts help from unlikely source', 'uses flaw as strength'
];

// Finale
const finaleStakes = [
  'stopping a world-ending event', 'rescuing a loved one from a collapsing structure',
  'heartbreaking choice between two lives', 'exposing a system-wide conspiracy',
  "hero's soul is on the line", 'fate of a nation', 'losing their identity forever',
  'preventing a personal tragedy', 'saving everyone or no one', 'ultimate sacrifice required'
];

// Final Image
const finalImageOptions = [
  'same location/situation as Opening Image', 'clear callback to the first scene',
  'receiving a phone call, but answering differently', 'looking at the same view, but with new eyes',
  'mirror of the opening, but transformed', 'hero is now in the "mentor" role',
  'final, quiet moment of peace', 'full circle moment', 'contrast with opening despair'
];

// B-Story Characters
const bStoryCharacters = [
  'sarcastic informant', 'charming rival', 'riddling mentor', 'childhood friend',
  'sentient AI', 'ghostly apparition', 'grumpy teenager', 'idealistic rookie',
  'ex-lover', 'estranged sibling', 'therapist', 'talking animal',
  'mysterious stranger', 'unlikely ally', 'wise elder'
];

// Exports

export function openingAction(): string { return pick(openingActions); }
export function minorCharacter(): string { return pick(minorCharacters); }
export function stasisIsDeath(): string { return pick(stasisIsDeathOptions); }
export function statedGoal(): string { return pick(statedGoalOptions); }
export function catalystEvent(): string { return pick(catalystEvents); }
export function debateQuestion(): string { return pick(debateQuestions); }
export function promiseOfPremise(): string { return pick(promiseOfPremiseOptions); }
export function successFailure(): string { return pick(successFailureOptions); }
export function midpointEvent(): string { return pick(midpointEvents); }
export function stakesRaised(): string { return pick(stakesRaisedOptions); }
export function whiffOfDeath(): string { return pick(whiffsOfDeath); }
export function rockBottom(): string { return pick(rockBottomOptions); }
export function reflection(): string { return pick(reflectionOptions); }
export function epiphany(): string { return pick(epiphanies); }
export function breakInto3(): string { return pick(breakInto3Options); }
export function finaleStake(): string { return pick(finaleStakes); }
export function finalImage(): string { return pick(finalImageOptions); }
export function bStoryCharacter(): string { return pick(bStoryCharacters); }

