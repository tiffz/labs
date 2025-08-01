import type { SkillData, SkillIncrement } from './skillData';
import { skillData, getCurrentTrainingTarget, getSkillLevel } from './skillData';

export interface SkillTrainingAttemptResult {
  success: boolean;
  loveCost: number;
  message: string;
  increment?: SkillIncrement;
}

// Training attempt messages for different outcomes
const successMessages = [
  "It clicks! You finally get it",
  "Breakthrough moment - everything makes sense now",
  "That's it! You've got the hang of it",
  "Aha! It all comes together",
  "Perfect execution - you nailed it",
  "Something just clicked into place",
  "Yes! That felt exactly right",
  "Everything suddenly became clear",
  "You can feel the improvement happening",
  "The technique finally feels natural"
];

const failureMessages = [
  "Almost there, but not quite",
  "You can sense you're close to understanding",
  "Something's still not clicking",
  "You're making progress, but it's not there yet",
  "Getting warmer, but missing something",
  "You feel like you're on the verge of a breakthrough",
  "So close you can taste it, but not quite",
  "You're circling around the right answer",
  "There's a piece of the puzzle you're missing",
  "Your instincts say you're getting closer",
  "You can feel understanding just out of reach",
  "The concept is fuzzy but starting to form",
  "You're building the foundation, slowly",
  "Each attempt teaches you something new",
  "Frustrating, but you sense progress underneath"
];

function getRandomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

// Alias for backward compatibility
export function calculateSkillTrainingCost(skillId: string, skillIncrements: { [levelIndex: number]: number }): number | null {
  return getCurrentTrainingCost(skillId, skillIncrements);
}

export function getCurrentTrainingCost(skillId: string, skillIncrements: { [levelIndex: number]: number }): number | null {
  const target = getCurrentTrainingTarget(skillId, skillIncrements);
  if (!target) return null; // No more training needed
  
  const skill = skillData.find((s) => s.id === skillId);
  if (!skill) return null;
  
  const increment = skill.levels[target.levelIndex].increments[target.incrementIndex];
  return increment.loveCost;
}

export function canAffordSkillTraining(currentLove: number, skillId: string, skillIncrements: { [levelIndex: number]: number }): boolean {
  const cost = getCurrentTrainingCost(skillId, skillIncrements);
  return cost !== null && currentLove >= cost;
}

// Alias for backward compatibility
export function performSkillTraining(skillId: string, skillIncrements: { [levelIndex: number]: number }): SkillTrainingAttemptResult | null {
  return performSkillTrainingAttempt(skillId, skillIncrements);
}

export function performSkillTrainingAttempt(skillId: string, skillIncrements: { [levelIndex: number]: number }): SkillTrainingAttemptResult | null {
  const target = getCurrentTrainingTarget(skillId, skillIncrements);
  if (!target) return null; // No more training needed
  
  const skill = skillData.find((s) => s.id === skillId);
  if (!skill) return null;
  
  const increment = skill.levels[target.levelIndex].increments[target.incrementIndex];
  const success = Math.random() < increment.successRate;
  
  return {
    success,
    loveCost: increment.loveCost,
    message: success ? getRandomMessage(successMessages) : getRandomMessage(failureMessages),
    increment: success ? increment : undefined
  };
}

// Check if completing an increment results in a level up
export function checkForSkillLevelUp(skillDataArray: SkillData[], skillId: string, oldIncrements: { [levelIndex: number]: number }, newIncrements: { [levelIndex: number]: number }): boolean {
  const oldLevel = getSkillLevel(skillId, oldIncrements);
  const newLevel = getSkillLevel(skillId, newIncrements);
  
  return newLevel > oldLevel;
}

// Get the total increments needed for the next level (for backward compatibility with old tests)
export function getNextLevelExperience(skillDataArray: SkillData[], skillId: string, currentLevel: number): number | null {
  const skill = skillDataArray.find(s => s.id === skillId);
  if (!skill || currentLevel >= skill.levels.length) return null;
  
  // In the new system, this would be the total increments needed for the next level
  // For compatibility, we'll return the number of increments needed for that level
  return skill.levels[currentLevel] ? skill.levels[currentLevel].increments.length : null;
}