import { useEffect, useCallback } from 'react';
import type { GameState } from '../game/types';
import { allAchievements, getAchievementById, isMilestone, isAward, type Milestone, type Award } from '../data/achievementData';

export const useAchievementSystem = (
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  addNotificationToQueue: (notification: { title: string; message: string; type?: 'merit' | 'general' }) => void
) => {
  const { earnedMerits, earnedAwards, awardProgress, specialActions, jobLevels, thingQuantities, love, treats } = gameState;

  const awardAchievement = useCallback((achievementId: string) => {
    const achievement = getAchievementById(achievementId);
    if (!achievement) return;

    // Check if already earned
    const alreadyEarned = isMilestone(achievement) 
      ? earnedMerits.includes(achievementId)
      : earnedAwards.includes(achievementId);
    
    if (alreadyEarned) return;

    // Add to appropriate earned list
    if (isMilestone(achievement)) {
      setGameState(prev => ({
        ...prev,
        earnedMerits: [...prev.earnedMerits, achievementId],
        love: prev.love + (achievement.reward?.love || 0),
        treats: prev.treats + (achievement.reward?.treats || 0),
      }));
    } else {
      setGameState(prev => ({
        ...prev,
        earnedAwards: [...prev.earnedAwards, achievementId],
        love: prev.love + (achievement.reward?.love || 0),
        treats: prev.treats + (achievement.reward?.treats || 0),
      }));
    }

    // Create notification
    const notificationTitle = achievement.notification?.title || achievement.title;
    const notificationMessage = achievement.notification?.message || achievement.reward?.message || achievement.description;
    
    addNotificationToQueue({
      title: notificationTitle,
      message: notificationMessage,
      type: 'merit' // Use 'merit' type for both milestones and awards
    });
    
    // Track analytics
    if (window.labsAnalytics) {
      window.labsAnalytics.trackEvent('achievement_earned', {
        achievementId: achievement.id,
        achievementTitle: achievement.title,
        achievementType: isMilestone(achievement) ? 'milestone' : 'award',
        loveReward: achievement.reward?.love || 0,
        treatsReward: achievement.reward?.treats || 0
      });
    }
  }, [earnedMerits, earnedAwards, setGameState, addNotificationToQueue]);

  // Track special actions for awards
  const trackSpecialAction = useCallback((actionType: 'noseClicks' | 'earClicks' | 'cheekPets' | 'happyJumps') => {
    setGameState(prev => ({
      ...prev,
      specialActions: {
        ...prev.specialActions,
        [actionType]: prev.specialActions[actionType] + 1
      }
    }));
  }, [setGameState]);

  // Helper function to check milestone conditions (same as old merit system)
  const checkMilestoneCondition = useCallback((milestone: Milestone): boolean => {
    const target = milestone.target;
    
    if (target.currencyType === 'love' && target.amount && love >= target.amount) {
      return true;
    }
    
    if (target.currencyType === 'treats' && target.amount && treats >= target.amount) {
      return true;
    }
    
    if (target.jobId && (jobLevels[target.jobId] || 0) > 0) {
      return true;
    }
    
    if (target.jobLevel) {
      const hasReachedLevel = Object.values(jobLevels).some(level => level >= target.jobLevel!);
      if (hasReachedLevel) {
        return true;
      }
    }
    
    if (target.thingId && (thingQuantities[target.thingId] || 0) > 0) {
      return true;
    }
    
    return false;
  }, [love, treats, jobLevels, thingQuantities]);

  // Helper function to check award conditions
  const checkAwardCondition = useCallback((award: Award): boolean => {
    const target = award.target;
    if (!target) return false;
    
    const requiredCount = target.count || 1;
    
    switch (target.actionType) {
      case 'nose_click':
        return specialActions.noseClicks >= requiredCount;
      case 'happy_jump':
        return specialActions.happyJumps >= requiredCount;
      case 'ear_wiggle':
        return specialActions.earClicks >= requiredCount;
      case 'cheek_pet':
        return specialActions.cheekPets >= requiredCount;
      default:
        return false;
    }
  }, [specialActions]);

  // Check achievements periodically
  useEffect(() => {
    const checkAchievements = () => {
      allAchievements.forEach(achievement => {
        const achievementId = achievement.id;
        
        // Skip if already earned
        const alreadyEarned = isMilestone(achievement)
          ? earnedMerits.includes(achievementId)
          : earnedAwards.includes(achievementId);
        
        if (alreadyEarned) return;

        let shouldAward = false;

        if (isMilestone(achievement)) {
          // Check milestone conditions
          shouldAward = checkMilestoneCondition(achievement);
        } else {
          // Check award conditions
          shouldAward = checkAwardCondition(achievement);
        }

        if (shouldAward) {
          awardAchievement(achievementId);
        }
      });
    };

    checkAchievements();
  }, [earnedMerits, earnedAwards, jobLevels, thingQuantities, love, treats, specialActions, awardAchievement, checkAwardCondition, checkMilestoneCondition]);

  // Get earned achievements with proper typing
  const earnedMilestones: Milestone[] = allAchievements
    .filter(a => isMilestone(a) && earnedMerits.includes(a.id))
    .map(a => ({ ...a as Milestone, isEarned: true }));

  const earnedAwardsList: Award[] = allAchievements
    .filter(a => isAward(a) && earnedAwards.includes(a.id))
    .map(a => ({ ...a as Award, isEarned: true }));

  const availableMilestones: Milestone[] = allAchievements
    .filter(a => isMilestone(a) && !earnedMerits.includes(a.id))
    .map(a => ({ ...a as Milestone, isEarned: false }));

  const availableAwards: Award[] = allAchievements
    .filter(a => isAward(a) && !earnedAwards.includes(a.id))
    .map(a => ({ ...a as Award, isEarned: false }));

  return {
    // Milestones (for Milestones UI)
    earnedMilestones,
    availableMilestones,
    
    // Awards (for Awards UI)
    earnedAwards: earnedAwardsList,
    availableAwards,
    
    // For backward compatibility with existing Merit system
    earnedMerits: earnedMilestones,
    availableMerits: availableMilestones,
    
    // Actions
    awardAchievement,
    trackSpecialAction,
    
    // Progress tracking
    awardProgress,
    specialActions
  };
};