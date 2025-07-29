import { useCallback } from 'react';
import type { GameState } from '../game/types';
import { jobData } from '../data/jobData';

export const useJobSystem = (
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
) => {
  const handlePromotion = useCallback((jobId: string) => {
    setGameState(prev => {
      const { love, jobLevels } = prev;
      const currentLevel = jobLevels[jobId] || 0;
      const job = jobData.find(j => j.id === jobId);
      
      if (!job || currentLevel >= job.levels.length) {
        return prev;
      }
      
      const promotionCost = job.levels[currentLevel].cost;
      
      if (love >= promotionCost) {
        return {
          ...prev,
          love: love - promotionCost,
          jobLevels: {
            ...jobLevels,
            [jobId]: currentLevel + 1,
          },
        };
      }
      
      return prev;
    });
  }, [setGameState]);

  return { handlePromotion };
}; 