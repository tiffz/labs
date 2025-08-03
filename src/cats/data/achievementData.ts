/**
 * Unified Achievement System
 * 
 * Combines Milestones (progressive) and Awards (secret one-offs) into a single system.
 * Both types contribute Merit points for upgrades while maintaining their distinct UX.
 */

import { allMilestones, type Milestone, milestoneGroups, type MilestoneGroup } from './milestoneData';
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

// Export individual data for specific UI needs
export { allMilestones, milestoneGroups, gameAwards };
export type { Milestone, MilestoneGroup, Award };

// Helper functions for achievement management
export function getAchievementById(id: string): Achievement | undefined {
  return allAchievements.find(achievement => achievement.id === id);
}

export function getMilestonesByGroup(groupId: string): Milestone[] {
  const group = milestoneGroups.find(g => g.id === groupId);
  return group ? group.milestones : [];
}

export function getEarnedAchievements(earnedIds: string[]): Achievement[] {
  return allAchievements.filter(achievement => earnedIds.includes(achievement.id));
}

export function getAvailableAchievements(earnedIds: string[]): Achievement[] {
  return allAchievements.filter(achievement => !earnedIds.includes(achievement.id));
}

// Convert achievement to merit-compatible format for existing systems
export function achievementToMerit(achievement: Achievement) {
  if (isMilestone(achievement)) {
    return {
      id: achievement.id,
      title: achievement.title,
      description: achievement.description,
      type: determineMeritType(achievement),
      target: achievement.target,
      reward: achievement.reward,
      notification: achievement.notification,
      icon: achievement.icon,
      color: achievement.color
    };
  } else {
    return {
      id: achievement.id,
      title: achievement.title,
      description: achievement.description,
      type: 'award_achievement' as const,
      target: achievement.target,
      reward: achievement.reward,
      notification: achievement.notification,
      icon: achievement.icon,
      color: achievement.color
    };
  }
}

// Helper to determine merit type from milestone
function determineMeritType(milestone: Milestone): string {
  if (milestone.target.currencyType === 'love') return 'love_milestone';
  if (milestone.target.currencyType === 'treats') return 'treats_milestone';
  if (milestone.target.jobId) return 'job_achievement';
  if (milestone.target.jobLevel) return 'promotion_milestone';
  if (milestone.target.thingId) return 'purchase_achievement';
  return 'milestone';
}