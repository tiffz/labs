import { useEffect, useCallback, useMemo, useRef } from 'react';
import type { GameState } from '../game/types';
import { allAchievements, isMilestone, isAward, type Milestone, type Award, type Achievement } from '../data/achievementData';

export const useAchievementSystem = (
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  addNotificationToQueue: (notification: { title: string; message: string; type?: 'merit' | 'general' }) => void
) => {
  const { earnedMerits, earnedAwards, awardProgress, specialActions, jobLevels, thingQuantities, love, treats } = gameState;
  
  // Track achievements currently being processed to prevent race condition duplicates
  const processingAchievementsRef = useRef<Set<string>>(new Set());
  

  
  // Create stable dependencies that only change when achievement-relevant values change
  const jobLevelStableKey = useMemo(() => {
    return JSON.stringify(jobLevels);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(jobLevels)]);
  
  const thingQuantityStableKey = useMemo(() => {
    return JSON.stringify(thingQuantities);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(thingQuantities)]);
  
  const earnedMeritsStableKey = useMemo(() => {
    return earnedMerits.length;
  }, [earnedMerits.length]);
  
  const earnedAwardsStableKey = useMemo(() => {
    return earnedAwards.length;
  }, [earnedAwards.length]);

  const awardAchievement = useCallback((achievement: Achievement) => {
    if (!achievement) return;

    // FIRST: Check if currently being processed (most important check)
    if (processingAchievementsRef.current.has(achievement.id)) {
      return;
    }
    
    // SECOND: Check if already earned using current state from the hook
    const alreadyEarned = isMilestone(achievement) 
      ? earnedMerits.includes(achievement.id)
      : earnedAwards.includes(achievement.id);
    
    if (alreadyEarned) {
      return;
    }
    
    // Mark as being processed IMMEDIATELY
    processingAchievementsRef.current.add(achievement.id);

    // Update game state
    setGameState(prev => {
      return isMilestone(achievement) ? {
        ...prev,
        earnedMerits: [...prev.earnedMerits, achievement.id],
        love: prev.love + (achievement.reward?.love || 0),
        treats: prev.treats + (achievement.reward?.treats || 0),
      } : {
        ...prev,
        earnedAwards: [...prev.earnedAwards, achievement.id],
        love: prev.love + (achievement.reward?.love || 0),
        treats: prev.treats + (achievement.reward?.treats || 0),
      };
    });

    // Create notification and track analytics
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
    
    // Remove from processing set after a short delay to ensure React state has updated
    setTimeout(() => {
      processingAchievementsRef.current.delete(achievement.id);
    }, 50); // Small delay to ensure state updates have propagated
  }, [setGameState, addNotificationToQueue, earnedAwards, earnedMerits]);

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

  // Check all achievements (milestones and awards)
  const checkAllAchievements = useCallback(() => {
    // Check milestones
    const milestones = allAchievements.filter(isMilestone);
    milestones.forEach(milestone => {
      if (!earnedMerits.includes(milestone.id) && checkMilestoneCondition(milestone)) {
        awardAchievement(milestone);
      }
    });

    // Check awards
    const awards = allAchievements.filter(isAward);
    awards.forEach(award => {
      if (!earnedAwards.includes(award.id) && checkAwardCondition(award)) {
        awardAchievement(award);
      }
    });
  }, [awardAchievement, checkAwardCondition, checkMilestoneCondition, earnedAwards, earnedMerits]);

  // Initial check on mount
  useEffect(() => {
    checkAllAchievements();
  }, [checkAllAchievements]);

  // Check achievements when relevant game state changes
  useEffect(() => {
    checkAllAchievements();
  }, [checkAllAchievements, earnedMeritsStableKey, earnedAwardsStableKey, jobLevelStableKey, thingQuantityStableKey, specialActions, love, treats]);

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