/**
 * The Kimberly System - Story Beat Generators
 * 
 * Generators for specific story beat elements
 */

import { pick } from './core';
import { he, him, his, himself } from './realistic-names';

/**
 * Helper: Replace generic pronouns with character-specific pronouns
 * Handles contractions and possessives
 */
function withPronouns(text: string, characterId: string = 'hero'): string {
  const subject = he(characterId);      // he/she/they
  const object = him(characterId);      // him/her/them
  const possessive = his(characterId);  // his/her/their
  const reflexive = himself(characterId); // himself/herself/themselves
  
  return text
    // Contractions with subject pronoun
    .replace(/\bthey're\b/gi, `${subject}'re`)
    .replace(/\bthey've\b/gi, `${subject}'ve`)
    .replace(/\bthey'll\b/gi, `${subject}'ll`)
    .replace(/\bthey'd\b/gi, `${subject}'d`)
    // Base pronouns
    .replace(/\bthey\b/gi, subject)
    .replace(/\bthem\b/gi, object)
    .replace(/\btheir\b/gi, possessive)
    .replace(/\bthemselves\b/gi, reflexive);
}

// Opening Image - Specific, visual "before" snapshots showing the hero's flawed world
const openingActions = [
  // Work/Career stasis
  'photocopying the same memo for the 500th time', 'arriving late to work for the third time this week',
  'deleting another rejection email without reading it', 'watching their boss take credit for their work again',
  'eating lunch alone at their desk for the 200th day in a row', 'rehearsing a confrontation they\'ll never have',
  // Relationship stasis
  'scrolling through their ex\'s social media at 2am', 'ignoring their mother\'s fifth call this week',
  'swiping left on every dating profile', 'sitting across from their spouse in complete silence',
  'writing a text message they\'ll never send', 'deleting a voicemail without listening',
  // Personal stasis
  'staring at an empty canvas they haven\'t touched in months', 'stepping over the same pile of unpaid bills',
  'pouring their third drink before noon', 'lying to their therapist about taking their medication',
  'weighing themselves for the fourth time today', 'checking their bank account and closing it immediately',
  // Routine/trapped
  'missing the bus by 3 seconds for the hundredth time', 'taking the long way home to avoid someone',
  'pretending to be asleep when their alarm goes off', 'watching the clock tick toward a deadline they\'ll miss',
  'organizing their desk instead of working on the big project', 'refreshing their email hoping for a miracle',
  // Avoidance
  'walking past the gym they pay for but never use', 'hiding a package from their spouse',
  'deleting a half-written apology email', 'turning off their phone to avoid confrontation',
  'taking a different route to avoid their old neighborhood'
];

// Theme Stated - Minor characters who hint at the lesson (with personality)
const minorCharacters = [
  // Service workers
  'barista who remembers everyone\'s order', 'janitor who\'s been there 30 years', 
  'cab driver who\'s seen it all', 'street vendor with a philosophy degree',
  // Wise figures
  'old librarian who quotes poetry', 'cynical bartender who gives unsolicited advice',
  'homeless philosopher with a mysterious past', 'street artist who speaks in riddles',
  // Everyday people
  'weary office admin who keeps everything running', 'chatty rideshare driver with life advice',
  'grumpy security guard with a soft side', 'wise-cracking kid who sees through BS',
  // Unexpected wisdom
  'fortune cookie writer', 'late-night radio DJ', 'yoga instructor who\'s too honest',
  'tattoo artist who asks deep questions', 'dog walker who understands people',
  'food truck owner who escaped corporate life', 'museum tour guide who loves their job',
  // Family/neighbors
  'elderly neighbor who bakes too much', 'precocious niece who asks hard questions',
  'mailman who knows everyone\'s business', 'building superintendent who fixes more than pipes',
  // Service industry
  'hair stylist who\'s also a therapist', 'mechanic who talks about life like cars',
  'pharmacist who notices patterns', 'grocery store clerk who remembers everything'
];

// Setup - Stasis = Death (the hero's world is dying/stagnant)
const stasisIsDeathOptions = [
  // Career death
  'watching younger colleagues get promoted past them', 'their skills becoming obsolete',
  'stuck in a job they hate but can\'t afford to leave', 'their passion project gathering dust',
  'taking orders from someone half their age', 'their dreams replaced by a paycheck',
  // Relationship death
  'their marriage has become a business arrangement', 'they haven\'t touched their spouse in months',
  'all their friends have moved on with their lives', 'they eat dinner alone every night',
  'their kids don\'t call anymore', 'they\'ve become invisible to everyone around them',
  // Personal death
  'medicating themselves into numbness', 'their reflection is a stranger',
  'they can\'t remember the last time they laughed', 'every day is exactly like the last',
  'their apartment is a museum of who they used to be', 'they\'re slowly disappearing',
  // Trapped/shrinking
  'their world has shrunk to a 5-block radius', 'they haven\'t left the house in weeks',
  'they\'re one mistake away from losing everything', 'the walls are closing in',
  'they\'re drowning in debt with no way out', 'their lies are catching up to them',
  // Avoidance/denial
  'pretending everything is fine while it crumbles', 'ignoring the diagnosis',
  'one drink away from rock bottom', 'their secret is about to be exposed',
  'living in the past because the present is unbearable', 'running from a truth they can\'t face'
];

const statedGoalOptions = [
  // Shallow external goals
  'get the promotion they don\'t deserve', 'win back an ex who\'s moved on',
  'prove their worth to someone who doesn\'t care', 'get rich quick',
  'become famous for 15 minutes', 'beat their rival at any cost',
  // Avoidance goals
  'keep their secret hidden', 'maintain the perfect facade',
  'avoid confrontation at all costs', 'stay in their comfort zone',
  'not rock the boat', 'keep everyone happy except themselves',
  // Misguided goals
  'fix everyone else\'s problems but their own', 'control what they can\'t control',
  'change someone who doesn\'t want to change', 'find happiness in a bottle',
  'escape to somewhere else', 'start over without dealing with the past',
  // Revenge/proving
  'make their ex regret leaving', 'prove their parents wrong',
  'show everyone they were right all along', 'get even',
  'be taken seriously', 'earn respect through fear',
  // Survival
  'just make it through another day', 'pay this month\'s rent',
  'not lose custody of their kids', 'keep their addiction hidden',
  'survive until retirement', 'not end up like their parents'
];

// Catalyst - The inciting incident that disrupts the hero's world
const catalystEvents = [
  // Death/loss
  'their mentor dies, leaving a cryptic final message', 'they receive a terminal diagnosis',
  'their spouse serves them divorce papers', 'they\'re fired without explanation',
  'their childhood home burns down', 'they lose custody of their children',
  // Discovery
  'they discover their spouse has a secret family', 'a DNA test reveals they were adopted',
  'they find evidence their company is committing fraud', 'they witness a crime they can\'t unsee',
  'they discover they have a twin they never knew existed', 'old photos reveal a family secret',
  // Threat/danger
  'they receive a blackmail letter', 'their apartment building is condemned',
  'they\'re diagnosed with a rare condition', 'a warrant is issued for their arrest',
  'they\'re being followed by someone', 'their identity is stolen',
  // Opportunity
  'they inherit a mysterious property from a stranger', 'they\'re offered their dream job in another country',
  'they win a contest they don\'t remember entering', 'a stranger offers them a fortune for a simple task',
  'they\'re recruited for a secret project', 'an old flame returns after 10 years',
  // Accident/mistake
  'they accidentally send a brutal email to the wrong person', 'they wake up in a stranger\'s bed with no memory',
  'they hit someone with their car', 'they\'re caught in a lie that spirals',
  'they find a briefcase full of cash', 'they witness their boss committing a crime',
  // Supernatural/unusual
  'they start having vivid prophetic dreams', 'they wake up with an unexplained ability',
  'they receive a message from their future self', 'time starts repeating',
  // Social/public
  'a video of them goes viral for the wrong reasons', 'they\'re publicly accused of something they didn\'t do',
  'their secret is exposed on social media', 'they\'re called to testify against someone powerful',
  // Family/relationship
  'their estranged parent shows up needing help', 'they discover they\'re pregnant',
  'their child goes missing', 'they learn their partner is terminally ill',
  'a sibling they thought was dead is alive', 'they\'re named guardian of a child they don\'t know'
];

// Debate - The hero questions whether to embark on the journey
const debateQuestions = [
  // Internal debate
  'paces their apartment all night, unable to decide', 'makes a pro/con list that doesn\'t help',
  'stares at the phone, unable to make the call', 'writes and deletes the same email 20 times',
  'stands outside the door for an hour before leaving', 'rehearses what they\'ll say in the mirror',
  // Seeking advice
  'asks everyone they know for advice they won\'t take', 'calls their ex at 3am for guidance',
  'googles "how to know if you should" obsessively', 'seeks wisdom from a fortune cookie',
  'asks a stranger on the street what they should do', 'prays for a sign',
  // Avoidance
  'cleans their entire apartment to avoid deciding', 'binge-watches TV to numb the anxiety',
  'goes for a run at midnight to clear their head.', 'drinks to build courage',
  'calls in sick to buy more time', 'pretends the problem will solve itself',
  // Fear responses
  'has a full panic attack in the bathroom', 'imagines every worst-case scenario',
  'convinces themselves they\'re not ready', 'lists all the reasons they\'ll fail',
  'remembers every past failure', 'feels physically sick with dread',
  // Preparation/research
  'stays up all night researching', 'practices in secret',
  'makes elaborate plans they\'ll never follow', 'buys supplies they don\'t need',
  'takes a class to prepare', 'reads every article they can find',
  // Testing the waters
  'takes one small step then immediately regrets it', 'asks "what\'s the worst that could happen?"',
  'decides to sleep on it (for the fifth night)', 'flips a coin to decide',
  'sets a deadline they keep pushing back', 'waits for permission that never comes'
];

// Fun and Games - The "promise of the premise" (what the audience came to see)
const promiseOfPremiseOptions = [
  // Fish out of water
  'they embarrass themselves at every turn', 'they accidentally insult the wrong person',
  'they can\'t understand the local customs', 'they\'re overdressed for everything',
  'they keep using the wrong terminology', 'everyone can tell they don\'t belong',
  // Learning/training
  'montage of spectacular failures', 'they discover a hidden talent',
  'they train with an eccentric mentor', 'they learn the rules by breaking them all',
  'they study obsessively', 'they fake it till they make it',
  // Relationship building
  'they bond with an unlikely ally', 'they fall for someone they shouldn\'t',
  'they gain the respect of a rival', 'they form a makeshift family',
  'they learn to trust again', 'they find their people',
  // Exploration/discovery
  'they explore a world they never knew existed', 'they uncover hidden secrets',
  'they see beauty they\'ve never noticed', 'they experience freedom for the first time',
  'they discover they\'re capable of more', 'they find purpose',
  // Action/adventure
  'they pull off an impossible heist', 'they win their first real victory',
  'they outsmart someone smarter', 'they survive by pure luck',
  'they improvise brilliantly', 'they surprise everyone including themselves',
  // Transformation beginning
  'they start to change without realizing it', 'they laugh for the first time in years',
  'they take risks they never would have before', 'they stand up for themselves',
  'they help someone else', 'they feel alive again'
];

const successFailureOptions = [
  // Unexpected success
  'they succeed through dumb luck', 'they accidentally become the hero',
  'their inexperience becomes an advantage', 'they win by not playing by the rules',
  'they impress everyone including themselves', 'beginner\'s luck carries them',
  // Spectacular failure
  'they fail in the most public way possible', 'they make everything worse',
  'they trust the wrong person', 'they\'re exposed as a fraud',
  'they lose something irreplaceable', 'they realize they\'re in over their head',
  // Mixed results
  'they win the battle but lose the war', 'success comes at an unexpected cost',
  'they get what they wanted but it\'s not what they needed', 'victory feels hollow',
  'they succeed but make a powerful enemy', 'they advance but lose an ally',
  // Learning through failure
  'each failure teaches them something crucial', 'they fail upward',
  'they discover their flaw is their weakness', 'they learn the hard way',
  'they make the same mistake twice', 'they refuse to learn the lesson',
  // Escalation
  'the stakes suddenly get real', 'fun turns serious',
  'they realize this isn\'t a game', 'consequences catch up',
  'they can\'t go back now', 'the point of no return approaches'
];

// Midpoint - False victory or false defeat that raises the stakes
const midpointEvents = [
  // False victory (trap)
  'they think they\'ve won but walked into a trap', 'their victory was exactly what the villain wanted',
  'they celebrate too early', 'success blinds them to the real danger',
  'they get cocky and make a fatal mistake', 'winning the battle means losing the war',
  // False defeat (setback)
  'their ally betrays them at the worst moment', 'they lose everything they\'ve gained',
  'their plan falls apart spectacularly', 'they\'re captured by the enemy',
  'their secret is exposed', 'they\'re framed for something they didn\'t do',
  // Revelation
  'they discover the villain is someone they trusted', 'the truth is worse than they imagined',
  'they learn they\'ve been lied to from the beginning', 'their mentor had ulterior motives',
  'they discover they\'re on the wrong side', 'the real enemy is revealed',
  // Transformation
  'they kiss the person they shouldn\'t', 'they cross a line they can\'t uncross',
  'they become what they feared', 'they make a choice that changes everything',
  'they sacrifice their principles for victory', 'they realize they\'ve been changed',
  // Point of no return
  'they burn their bridges', 'they can never go back to their old life',
  'everyone now knows what they did', 'they\'re committed whether they like it or not',
  'the door closes behind them', 'they\'ve gone too far to stop',
  // New information
  'they discover the stakes are much higher', 'a ticking clock is revealed',
  'they learn someone they love is in danger', 'the villain\'s true plan is exposed',
  'they find out they have less time than they thought', 'a new threat emerges'
];

const stakesRaisedOptions = [
  // Personal stakes
  'someone they love is now in danger', 'their family is threatened',
  'they have 24 hours to save someone', 'their child is taken',
  'their partner will die if they fail', 'they\'re forced to choose between two people',
  // Career/reputation stakes
  'their career is on the line', 'they\'ll lose everything they\'ve built',
  'their reputation will be destroyed', 'they\'ll be exposed as a fraud',
  'they\'ll go to prison if they fail', 'they\'ll lose their license',
  // World stakes
  'thousands of lives now depend on them', 'the entire city is at risk',
  'a pandemic will spread if they fail', 'war will break out',
  'an innocent person will be executed', 'a catastrophe is imminent',
  // Internal stakes
  'they\'ll lose themselves if they continue', 'their soul is on the line',
  'they\'ll become the villain', 'they\'ll lose their humanity',
  'they\'ll destroy the person they love', 'they\'ll repeat their parent\'s mistakes',
  // Practical stakes
  'the ticking clock accelerates', 'their backup plan fails',
  'their only ally is captured', 'their resources are cut off',
  'the enemy is stronger than they thought', 'reinforcements won\'t arrive in time',
  // Irreversible consequences
  'there\'s no second chance', 'failure means permanent loss',
  'they can\'t undo what they\'ve done', 'the damage will be irreparable',
  'someone will die no matter what', 'they have to choose who lives'
];

// All Is Lost - The hero hits rock bottom (includes "whiff of death")
const whiffsOfDeath = [
  // Literal death
  'their mentor is killed protecting them', 'their best friend dies in their arms',
  'they watch someone innocent die because of them', 'a child is killed',
  'their partner is murdered', 'they\'re forced to kill someone',
  // Symbolic death
  'they lose their job and identity', 'their home is destroyed',
  'their reputation is obliterated', 'they\'re disowned by their family',
  'their life\'s work is destroyed', 'they lose custody of their children',
  // Near death
  'they\'re left for dead', 'they nearly drown',
  'they survive an assassination attempt', 'they\'re beaten within an inch of their life',
  'they overdose', 'they attempt suicide',
  // Death of hope
  'the person they love marries someone else', 'the cure doesn\'t work',
  'the deadline passes', 'the door closes forever',
  'it\'s too late to save them', 'the point of no return is crossed',
  // Witnessing death
  'they see the villain\'s true power', 'they watch their city burn',
  'they witness mass casualties', 'they see the future and it\'s hopeless',
  'they realize they\'ve already lost', 'they watch their dream die'
];

const rockBottomOptions = [
  // Total loss
  'they\'ve lost everything that mattered', 'everyone they love has abandoned them',
  'they\'re completely alone', 'they have nothing left',
  'their plan has failed catastrophically', 'they\'re out of options',
  // Betrayal
  'their closest ally betrayed them', 'everyone they trusted was lying',
  'they discover they were the pawn all along', 'their mentor was the villain',
  'the person they love chose someone else', 'their team abandons them',
  // Self-destruction
  'their flaw has destroyed everything', 'they\'ve become what they feared',
  'they\'ve hurt everyone who tried to help', 'they\'re the villain now',
  'they can\'t look at themselves', 'they\'ve lost who they were',
  // Despair
  'they break down completely', 'they give up',
  'they accept defeat', 'they want it to end',
  'they can\'t see a way forward', 'hope is gone',
  // Consequences
  'the villain has won', 'innocent people died because of them',
  'they\'ve made everything worse', 'their actions doomed everyone',
  'they can\'t undo what they\'ve done', 'the damage is permanent',
  // Isolation
  'they\'re arrested', 'they\'re exiled',
  'they\'re hunted', 'they\'re homeless',
  'they\'re hospitalized', 'they\'re institutionalized'
];

// Dark Night of the Soul - Moment of reflection leading to epiphany
const reflectionOptions = [
  // Solitude
  'sits alone in the wreckage of their life', 'stares at the ceiling unable to sleep',
  'walks through the ruins of what they built', 'stands in the rain letting it wash over them',
  'sits in their car in an empty parking lot', 'watches the sunrise alone',
  // Breakdown
  'finally lets themselves cry', 'screams into the void',
  'destroys everything in reach', 'collapses in exhaustion',
  'has a panic attack in the dark', 'breaks down in a stranger\'s arms',
  // Visitation/memory
  'is visited by the ghost of their mentor', 'remembers their mother\'s advice',
  'finds the note from Theme Stated', 'dreams of their old life',
  'sees a photo of who they used to be', 'hears their mentor\'s voice',
  // Conversation
  'confesses everything to the B-Story character', 'calls someone they haven\'t spoken to in years',
  'finally tells the truth', 'asks for help for the first time',
  'admits they were wrong', 'apologizes to someone they hurt',
  // Contemplation
  'questions every choice they\'ve made', 'wonders if they\'re the villain',
  'considers giving up entirely', 'thinks about ending it',
  'realizes they\'ve lost themselves', 'doesn\'t recognize who they\'ve become',
  // Symbolic moments
  'looks in the mirror and sees a stranger', 'stands at the edge',
  'holds the weapon they swore never to use', 'reads their own obituary',
  'visits their childhood home', 'returns to where it all began'
];

const epiphanies = [
  // Self-realization
  'realizes they\'ve been the problem all along', 'understands their flaw was their weakness',
  'sees they\'ve been running from themselves', 'recognizes they\'ve become their parent',
  'accepts who they really are', 'forgives themselves',
  // Truth about others
  'realizes the villain was right about them', 'understands why they were betrayed',
  'sees the mentor was protecting them', 'recognizes the B-Story character\'s sacrifice',
  'understands the villain\'s pain', 'realizes everyone was trying to help',
  // The real problem
  'realizes it was never about the goal', 'understands the theme finally makes sense',
  'sees they were chasing the wrong thing', 'recognizes what they really needed',
  'understands the answer was obvious', 'realizes they had it backwards',
  // The solution
  'realizes they don\'t have to do this alone', 'understands they have to let go',
  'sees they must embrace their flaw', 'recognizes they must sacrifice everything',
  'realizes they have to trust', 'understands they must face their fear',
  // Transformation
  'realizes they\'ve already changed', 'sees they\'re stronger than they knew',
  'understands they\'re capable of more', 'recognizes they have a choice',
  'realizes they can still make it right', 'sees there\'s still hope',
  // The cost
  'understands what they must sacrifice', 'realizes the price they must pay',
  'sees they must become something else', 'recognizes they can never go back',
  'understands they must lose to win', 'realizes victory requires everything'
];

// Break Into 3 - The hero learns the theme and formulates a plan
const breakInto3Options = [
  // Epiphany-driven
  'has a breakthrough that changes everything', 'finally understands what they must do',
  'sees the solution clearly for the first time', 'realizes the answer was there all along',
  'connects the dots in a flash of insight', 'understands the theme and acts on it',
  // Determination
  'makes a quiet, unshakeable decision', 'chooses to act despite the cost',
  'decides to sacrifice everything', 'commits fully for the first time',
  'stops running and turns to fight', 'embraces who they must become',
  // Planning
  'formulates a brilliant but risky plan', 'creates a strategy based on their epiphany',
  'devises a plan that uses their flaw as strength', 'figures out the villain\'s weakness',
  'finds the one way to win', 'discovers a loophole',
  // Gathering forces
  'rallies the team for one final push', 'asks for help from everyone they hurt',
  'reunites with estranged allies', 'forgives those who betrayed them',
  'accepts help they previously refused', 'builds a coalition',
  // Transformation
  'embraces their need over their want', 'lets go of what\'s holding them back',
  'forgives themselves', 'accepts who they really are',
  'chooses love over fear', 'trusts for the first time',
  // Sacrifice
  'decides to give up everything for the greater good', 'chooses others over themselves',
  'accepts they might not survive', 'makes peace with the cost',
  'burns their last bridge', 'goes all in'
];

// Finale - The climactic confrontation (high stakes)
const finaleStakes = [
  // Life or death
  'saving their child from execution', 'rescuing everyone from a collapsing building',
  'stopping a bomb with seconds left', 'preventing a mass casualty event',
  'saving their partner\'s life', 'stopping a pandemic from spreading',
  // Impossible choices
  'choosing who lives and who dies', 'sacrificing themselves or someone they love',
  'saving the many or the one', 'choosing between justice and mercy',
  'deciding who deserves to be saved', 'making a choice that will haunt them forever',
  // World stakes
  'preventing nuclear war', 'stopping an apocalypse',
  'saving their city from destruction', 'preventing a coup',
  'exposing a conspiracy that reaches the top', 'stopping a genocide',
  // Personal stakes
  'their soul is on the line', 'they risk becoming the villain',
  'they must sacrifice their humanity', 'they\'ll lose themselves if they win',
  'their identity will be destroyed', 'they\'ll never be the same',
  // Relationship stakes
  'saving their relationship', 'earning forgiveness',
  'proving their love is real', 'choosing between two people they love',
  'reconciling with their family', 'saving their child from themselves',
  // Justice stakes
  'exposing the truth', 'bringing down the corrupt system',
  'freeing the innocent', 'avenging the fallen',
  'making the guilty pay', 'restoring balance',
  // Redemption stakes
  'proving they\'ve changed', 'making up for their past',
  'saving the person they failed before', 'breaking the cycle',
  'becoming the hero they should have been', 'earning their second chance'
];

// Final Image - Mirror of opening showing transformation
const finalImageOptions = [
  // Direct mirrors
  'same location as opening, but everything has changed', 'same action as opening, but with opposite meaning',
  'same view as opening, but they see it differently', 'same moment as opening, but they respond differently',
  'same person as opening, but transformed', 'same choice as opening, but they choose differently',
  // Callbacks
  'the phone rings again, but this time they answer', 'they pass the same spot, but don\'t avoid it',
  'they see their reflection, but recognize themselves', 'they receive the same advice, but finally hear it',
  'they face the same fear, but don\'t run', 'they get the same opportunity, but make a different choice',
  // Role reversal
  'they\'re now the mentor to someone else', 'they give the advice they once ignored',
  'they help someone in their old situation', 'they\'ve become what they needed',
  'they pass on what they learned', 'they break the cycle for someone else',
  // Peace/resolution
  'a quiet moment of contentment', 'they smile for real this time',
  'they sleep peacefully', 'they\'re no longer afraid',
  'they\'re surrounded by people who love them', 'they\'re finally home',
  // Contrast
  'light where there was darkness', 'laughter where there was silence',
  'connection where there was isolation', 'hope where there was despair',
  'purpose where there was emptiness', 'love where there was fear',
  // New beginning
  'they start a new chapter', 'they take the first step of a new journey',
  'they open a door they once closed', 'they say yes instead of no',
  'they reach out instead of pulling away', 'they choose life over survival',
  // Full circle
  'the cycle is broken', 'the pattern is changed',
  'the curse is lifted', 'the debt is paid',
  'the circle is complete', 'the story ends where it began, but different'
];

// B-Story Characters
const bStoryCharacters = [
  'sarcastic informant', 'charming rival', 'riddling mentor', 'childhood friend',
  'sentient AI', 'ghostly apparition', 'grumpy teenager', 'idealistic rookie',
  'ex-lover', 'estranged sibling', 'therapist', 'talking animal',
  'mysterious stranger', 'unlikely ally', 'wise elder'
];

// Flaw Shown - How the hero's flaw is displayed in the opening
const flawShownOptions = [
  // Visible to others
  'is on full display for everyone to see', 'manifests in every interaction',
  'drives everyone away', 'sabotages every opportunity',
  'is obvious to everyone but them', 'controls their every decision',
  // Self-destructive
  'is destroying their life', 'keeps them trapped',
  'prevents any real connection', 'makes them their own worst enemy',
  'blinds them to the truth', 'poisons every relationship',
  // Repetitive pattern
  'repeats the same pattern again', 'causes the same mistake',
  'leads to predictable disaster', 'ensures nothing changes',
  'guarantees failure', 'creates a vicious cycle',
  // Defensive/coping
  'is their armor and their prison', 'protects them from nothing',
  'is their coping mechanism', 'is how they survive',
  'is their shield and their weakness', 'defines who they are'
];

// Dismissed Advice - How the hero ignores wisdom
const dismissedAdviceOptions = [
  // Active dismissal
  'that {hero} immediately dismisses', 'that {hero} laughs off',
  'that {hero} refuses to hear', 'that {hero} argues against',
  'that {hero} thinks doesn\'t apply to them', 'that {hero} finds naive',
  // Passive dismissal
  'that {hero} ignores completely', 'that {hero} doesn\'t understand yet',
  'that {hero} isn\'t ready to hear', 'that {hero} will remember too late',
  'that {hero} pretends to agree with', 'that goes in one ear and out the other',
  // Defensive dismissal
  'that {hero} takes as an insult', 'that {hero} sees as judgment',
  'that {hero} resents', 'that {hero} feels attacked by',
  'that {hero} thinks is criticism', 'that {hero} gets defensive about',
  // Rationalization
  'that {hero} has an excuse for', 'that {hero} thinks is different for them',
  'that {hero} believes they\'re the exception to', 'that {hero} rationalizes away',
  'that {hero} convinces themselves doesn\'t matter', 'that {hero} will regret ignoring'
];

// Wrong Decision - How the hero chooses based on Want not Need
const wrongDecisionOptions = [
  // Choosing the easy path
  'chooses the easy path over the right one', 'takes the shortcut that will cost them',
  'picks comfort over growth', 'selects safety over truth',
  'opts for the familiar over the necessary', 'goes with what feels good instead of what\'s right',
  // Choosing external validation
  'chooses what others expect', 'picks what will impress people',
  'selects what looks good on paper', 'goes with what society values',
  'opts for status over substance', 'chooses appearance over reality',
  // Choosing avoidance
  'chooses to run rather than face it', 'picks escape over confrontation',
  'selects distraction over dealing with it', 'opts to hide rather than heal',
  'chooses denial over acceptance', 'picks the lie over the truth',
  // Choosing selfishness
  'puts their wants above everyone\'s needs', 'chooses themselves over others',
  'picks personal gain over doing right', 'selects revenge over forgiveness',
  'opts for control over connection', 'chooses pride over humility',
  // Choosing the flaw
  'lets their flaw make the choice', 'chooses based on fear not courage',
  'picks what their flaw demands', 'selects what keeps them broken',
  'opts for what maintains the status quo', 'chooses the path that won\'t change them'
];

// Theme Embodied - How the B-Story character represents the theme
const themeEmbodiedOptions = [
  // Living example
  'embodies the lesson of {theme}', 'is a living example of {theme}',
  'has already learned {theme}', 'represents what {theme} looks like in practice',
  'shows {theme} in action', 'demonstrates the truth of {theme}',
  // Teaching through being
  'teaches {theme} without trying', 'radiates {theme} naturally',
  'makes {theme} seem possible', 'proves {theme} is real',
  'shows that {theme} works', 'is proof that {theme} matters',
  // Contrast
  'has what {hero} lacks: {theme}', 'understands {theme} while {hero} doesn\'t',
  'lives by {theme} while {hero} fights it', 'found peace through {theme}',
  'was saved by {theme}', 'chose {theme} and was transformed',
  // Mirror
  'is who {hero} could become through {theme}', 'shows {hero} their potential through {theme}',
  'reflects what {hero} needs: {theme}', 'is {hero}\'s future if they embrace {theme}',
  'mirrors {hero}\'s journey with {theme}', 'walked {hero}\'s path and found {theme}'
];

// Exports

export function openingAction(characterId: string = 'hero'): string { 
  return withPronouns(pick(openingActions), characterId); 
}
export function minorCharacter(): string { return pick(minorCharacters); }
export function stasisIsDeath(characterId: string = 'hero'): string { 
  return withPronouns(pick(stasisIsDeathOptions), characterId); 
}
export function statedGoal(characterId: string = 'hero'): string { 
  return withPronouns(pick(statedGoalOptions), characterId); 
}
export function catalystEvent(characterId: string = 'hero'): string { 
  return withPronouns(pick(catalystEvents), characterId); 
}
export function debateQuestion(characterId: string = 'hero'): string { 
  return withPronouns(pick(debateQuestions), characterId); 
}
export function promiseOfPremise(characterId: string = 'hero'): string { 
  return withPronouns(pick(promiseOfPremiseOptions), characterId); 
}
export function successFailure(characterId: string = 'hero'): string { 
  return withPronouns(pick(successFailureOptions), characterId); 
}
export function midpointEvent(characterId: string = 'hero'): string { 
  return withPronouns(pick(midpointEvents), characterId); 
}
export function stakesRaised(characterId: string = 'hero'): string { 
  return withPronouns(pick(stakesRaisedOptions), characterId); 
}
export function whiffOfDeath(characterId: string = 'hero'): string { 
  return withPronouns(pick(whiffsOfDeath), characterId); 
}
export function rockBottom(characterId: string = 'hero'): string { 
  return withPronouns(pick(rockBottomOptions), characterId); 
}
export function reflection(characterId: string = 'hero'): string { 
  return withPronouns(pick(reflectionOptions), characterId); 
}
export function epiphany(characterId: string = 'hero'): string { 
  return withPronouns(pick(epiphanies), characterId); 
}
export function breakInto3(characterId: string = 'hero'): string { 
  return withPronouns(pick(breakInto3Options), characterId); 
}
export function finaleStake(characterId: string = 'hero'): string { 
  return withPronouns(pick(finaleStakes), characterId); 
}
export function finalImage(characterId: string = 'hero'): string { 
  return withPronouns(pick(finalImageOptions), characterId); 
}
export function bStoryCharacter(): string { return pick(bStoryCharacters); }

// New generators for previously static beats
export function flawShown(characterId: string = 'hero'): string { 
  return withPronouns(pick(flawShownOptions), characterId); 
}
export function dismissedAdvice(): string { return pick(dismissedAdviceOptions); }
export function wrongDecision(characterId: string = 'hero'): string { 
  return withPronouns(pick(wrongDecisionOptions), characterId); 
}
export function themeEmbodied(): string { return pick(themeEmbodiedOptions); }

