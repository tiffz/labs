import { useEffect, useCallback } from 'react';
import type { GameState } from '../game/types';
import type { Merit } from '../data/meritData';
import { gameMerits } from '../data/meritData';

export const useMeritSystem = (
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  addNotificationToQueue: (notification: { title: string; message: string }) => void
) => {
  const { earnedMerits, jobLevels, thingQuantities, love, treats } = gameState;

  const awardMerit = useCallback((meritId: string) => {
    const merit = gameMerits.find(m => m.id === meritId);
    if (merit && !earnedMerits.includes(meritId)) {
      setGameState(prev => ({
        ...prev,
        earnedMerits: [...prev.earnedMerits, meritId],
        love: prev.love + (merit.reward?.love || 0),
        treats: prev.treats + (merit.reward?.treats || 0),
      }));

      // Create a notification for the merit award (auto-generate if not specified)
      const notificationTitle = merit.notification?.title || merit.title;
      const notificationMessage = merit.notification?.message || merit.reward?.message || merit.description;
      
      addNotificationToQueue({
        title: notificationTitle,
        message: notificationMessage,
        type: 'merit' // Add a type to distinguish merit notifications
      });
      
      // Track merit earning event
      if (window.labsAnalytics) {
        window.labsAnalytics.trackEvent('merit_earned', {
          meritId: merit.id,
          meritTitle: merit.title,
          meritType: merit.type,
          loveReward: merit.reward?.love || 0,
          treatsReward: merit.reward?.treats || 0
        });
      }
    }
  }, [earnedMerits, setGameState, addNotificationToQueue]);

  useEffect(() => {
    const checkMerits = () => {
      gameMerits.forEach(merit => {
        // Skip if already earned
        if (earnedMerits.includes(merit.id)) return;

        let shouldAward = false;

        switch (merit.type) {
          case 'love_milestone':
            if (merit.target?.currencyType === 'love' && merit.target.amount && love >= merit.target.amount) {
              shouldAward = true;
            }
            break;

          case 'treats_milestone':
            if (merit.target?.currencyType === 'treats' && merit.target.amount && treats >= merit.target.amount) {
              shouldAward = true;
            }
            break;

          case 'job_achievement':
            if (merit.target?.jobId && (jobLevels[merit.target.jobId] || 0) > 0) {
              shouldAward = true;
            }
            break;

          case 'promotion_milestone':
            if (merit.target?.jobLevel) {
              // Check if any job has reached the target level
              const hasReachedLevel = Object.values(jobLevels).some(level => level >= merit.target!.jobLevel!);
              if (hasReachedLevel) {
                shouldAward = true;
              }
            }
            break;

          case 'purchase_achievement':
            if (merit.target?.thingId && (thingQuantities[merit.target.thingId] || 0) > 0) {
              shouldAward = true;
            }
            break;
        }

        if (shouldAward) {
          awardMerit(merit.id);
        }
      });
    };

    checkMerits();
  }, [earnedMerits, jobLevels, thingQuantities, love, treats, awardMerit]);

  const earnedMeritObjects: Merit[] = gameMerits
    .filter(m => earnedMerits.includes(m.id))
    .map(m => ({ ...m, isEarned: true }));

  const availableMerits: Merit[] = gameMerits
    .filter(m => !earnedMerits.includes(m.id))
    .map(m => ({ ...m, isEarned: false }));

  const sortedEarnedMerits = earnedMeritObjects.sort((a, b) => {
    // Sort by the order they appear in the merit list (most recent first)
    const aIndex = earnedMerits.indexOf(a.id);
    const bIndex = earnedMerits.indexOf(b.id);
    return bIndex - aIndex;
  });

  const sortedAvailableMerits = availableMerits.sort((a, b) => {
    // Sort by type and then by target values for consistent ordering
    if (a.type !== b.type) {
      return a.type.localeCompare(b.type);
    }
    
    // Within same type, sort by target amount/level
    const aTarget = a.target?.amount || a.target?.jobLevel || 0;
    const bTarget = b.target?.amount || b.target?.jobLevel || 0;
    return aTarget - bTarget;
  });

  return { 
    earnedMerits: sortedEarnedMerits, 
    availableMerits: sortedAvailableMerits, 
    awardMerit 
  };
};