/**
 * Unified Achievement System
 * 
 * Combines Milestones (progressive) and Awards (secret one-offs) into a single system.
 * Both types contribute Merit points for upgrades while maintaining their distinct UX.
 */

import { allMilestones, type Milestone, type MilestoneGroup } from './milestoneData';
import { gameAwards, type Award } from './awardData';

// Union type for all achievements
export type Achievement = Milestone | Award;

// Type guards
export function isMilestone(achievement: Achievement): achievement is Milestone {
  return 'target' in achievement && !('isSecret' in achievement);
}

export function isAward(achievement: Achievement): achievement is Award {
  return 'isSecret' in achievement;
}

// All achievements for compatibility with existing merit system
export const allAchievements: Achievement[] = [
  ...allMilestones,
  ...gameAwards
];

// Export types for UI components
export type { Milestone, MilestoneGroup, Award };