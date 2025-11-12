import type { StoryDNA } from '../types';
import { genres } from './genres';
import { themes } from './genres';
import { suggestionEngine } from './suggestionEngine';

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateStoryDNA(selectedGenre: string, selectedTheme: string): StoryDNA {
  const genre = selectedGenre === 'Random' ? getRandom(Object.keys(genres)) : selectedGenre;
  const theme = selectedTheme === 'Random' ? getRandom(themes) : selectedTheme;

  const act2Setting = getRandom(suggestionEngine.act2Settings);
  const initialSetting = getRandom(suggestionEngine.act1Settings);

  // Ensure act2Setting is different from initialSetting
  let finalAct2Setting = act2Setting;
  if (act2Setting === initialSetting) {
    const otherSettings = suggestionEngine.act2Settings.filter((s) => s !== initialSetting);
    finalAct2Setting = getRandom(otherSettings);
  }

  return {
    genre,
    theme,
    hero: `${getRandom(suggestionEngine.heroAdjectives)} ${getRandom(suggestionEngine.heroNouns)}`,
    flaw: getRandom(suggestionEngine.themeFlaws[theme] || []),
    initialSetting,
    act2Setting: finalAct2Setting,
    bStoryCharacter: getRandom(suggestionEngine.bStoryCharacters),
    nemesis: `${getRandom(suggestionEngine.nemesisAdjectives)} ${getRandom(suggestionEngine.nemesisNouns)}`,
  };
}

export function getNewSuggestion(rerollId: string, dna: StoryDNA): string {
  switch (rerollId) {
    // Core DNA
    case 'hero':
      return `${getRandom(suggestionEngine.heroAdjectives)} ${getRandom(suggestionEngine.heroNouns)}`;
    case 'flaw':
      return getRandom(suggestionEngine.themeFlaws[dna.theme] || []);
    case 'nemesis':
      return `${getRandom(suggestionEngine.nemesisAdjectives)} ${getRandom(suggestionEngine.nemesisNouns)}`;

    // Genre Elements
    case 'The Detective':
      return getRandom(suggestionEngine.genericDetectives);
    case 'The Secret':
      return getRandom(suggestionEngine.genericSecrets);
    case 'The Dark Turn':
      return getRandom(suggestionEngine.genericDarkTurns);
    case 'The Life Problem':
      return getRandom(suggestionEngine.genericLifeProblems);
    case 'The Wrong Way':
      return getRandom(suggestionEngine.genericWrongWays);
    case 'The Acceptance':
      return getRandom(suggestionEngine.genericAcceptances);
    case 'The Group':
      return getRandom(suggestionEngine.genericGroups);
    case 'The Choice':
      return getRandom(suggestionEngine.genericChoices);
    case 'The Sacrifice':
      return getRandom(suggestionEngine.genericSacrifices);
    case 'The Power':
      return getRandom(suggestionEngine.genericPowers);
    case 'The Curse':
      return getRandom(suggestionEngine.genericCurses);
    case 'The Innocent Hero':
      return getRandom(suggestionEngine.genericInnocentHeros);
    case 'The Sudden Event':
      return getRandom(suggestionEngine.genericSuddenEvents);
    case 'The Life or Death Battle':
      return getRandom(suggestionEngine.genericLifeOrDeathBattles);
    case 'The Fool':
      return getRandom(suggestionEngine.genericFools);
    case 'The Establishment':
      return getRandom(suggestionEngine.genericEstablishments);
    case 'The Transmutation':
      return getRandom(suggestionEngine.genericTransmutations);
    case 'The Incomplete Hero':
      return getRandom(suggestionEngine.genericIncompleteHeros);
    case 'The Counterpart':
      return getRandom(suggestionEngine.genericCounterparts);
    case 'The Complication':
      return getRandom(suggestionEngine.genericComplications);
    case 'The Wish':
      return getRandom(suggestionEngine.genericWishes);
    case 'The Spell':
      return getRandom(suggestionEngine.genericSpells);
    case 'The Lesson':
      return getRandom(suggestionEngine.genericLessons);
    case 'The Road':
      return getRandom(suggestionEngine.genericRoads);
    case 'The Team':
      return getRandom(suggestionEngine.genericTeams);
    case 'The Prize':
      return getRandom(suggestionEngine.genericPrizes);
    case 'The Monster':
      return getRandom(suggestionEngine.genericMonsters);
    case 'The House':
      return getRandom(suggestionEngine.genericHouses);
    case 'The Sin':
      return getRandom(suggestionEngine.genericSins);

    // Beat Sub-Elements
    case 'beat_OpeningImage_VisualSnapshot':
      return `${getRandom(suggestionEngine.openingActions)} in ${dna.initialSetting}.`;
    case 'beat_OpeningImage_FlawShown':
      return `Their ${dna.flaw} is on full display.`;
    case 'beat_ThemeStated_MinorCharacter':
      return `A ${getRandom(suggestionEngine.minorCharacters)}...`;
    case 'beat_ThemeStated_DismissedAdvice':
      return `Says something wise about ${dna.theme} that the hero ignores.`;
    case 'beat_Setup_StasisDeath':
      return `Hero is ${getRandom(suggestionEngine.stasisIsDeathOptions)}.`;
    case 'beat_Setup_StatedGoalWant':
      return `${getRandom(suggestionEngine.statedGoalOptions)}.`;
    case 'beat_Catalyst_IncitingIncident':
      return getRandom(suggestionEngine.catalystEvents);
    case 'beat_Debate_CoreQuestion':
      return `${getRandom(suggestionEngine.debateQuestions)}.`;
    case 'beat_BreakInto2_NewWorld':
      return `Hero enters the ${dna.act2Setting}.`;
    case 'beat_BreakInto2_WrongDecision':
      return `Actively chooses this new path based on 'Want', not 'Need'.`;
    case 'beat_BStory_NewCharacter':
      return `The ${dna.bStoryCharacter} is introduced.`;
    case 'beat_BStory_ThemeEmbodied':
      return `This character represents the lesson of ${dna.theme}.`;
    case 'beat_FunandGames_PromiseofPremise':
      return `${getRandom(suggestionEngine.promiseOfPremiseOptions)}.`;
    case 'beat_FunandGames_SuccessFailure':
      return `${getRandom(suggestionEngine.successFailureOptions)}.`;
    case 'beat_Midpoint_TurningPoint':
      return getRandom(suggestionEngine.midpointEvents);
    case 'beat_Midpoint_StakesRaised':
      return `${getRandom(suggestionEngine.stakesRaisedOptions)}.`;
    case 'beat_BadGuysCloseIn_ExternalPressure':
      return `The ${dna.nemesis} applies direct force.`;
    case 'beat_BadGuysCloseIn_InternalPressure':
      return `The hero's ${dna.flaw} makes things worse.`;
    case 'beat_AllIsLost_WhiffofDeath':
      return getRandom(suggestionEngine.whiffsOfDeath);
    case 'beat_AllIsLost_RockBottom':
      return `${getRandom(suggestionEngine.rockBottomOptions)}.`;
    case 'beat_DarkNightoftheSoul_MomentofReflection':
      return `${getRandom(suggestionEngine.reflectionOptions)}.`;
    case 'beat_DarkNightoftheSoul_TheEpiphany':
      return getRandom(suggestionEngine.epiphanies);
    case 'beat_BreakInto3_RightDecision':
      return getRandom(suggestionEngine.breakInto3Options);
    case 'beat_Finale_FinalBattle':
      return `Hero confronts the ${dna.nemesis}.`;
    case 'beat_Finale_DigDeepDown':
      return `They must overcome their ${dna.flaw} to win.`;
    case 'beat_Finale_HighStakes':
      return getRandom(suggestionEngine.finaleStakes);
    case 'beat_FinalImage_MirroredImage':
      return `${getRandom(suggestionEngine.finalImageOptions)}.`;
    case 'beat_FinalImage_Transformation':
      return `Hero now acts with an understanding of ${dna.theme}.`;

    default:
      console.warn(`Unknown rerollId: ${rerollId}`);
      return 'Error';
  }
}

