import { useEffect, useCallback } from 'react';
import type { GameState } from '../game/types';
import type { Goal } from '../data/goalData';
import { gameGoals } from '../data/goalData';

export const useGoalSystem = (
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
) => {
  const { activeGoals: activeGoalIds, completedGoals: completedGoalIds, jobLevels, upgradeLevels, thingQuantities, love, treats } = gameState;

  const addGoal = useCallback((goalId: string) => {
    const goal = gameGoals.find(g => g.id === goalId);
    if (goal && !activeGoalIds.includes(goalId) && !completedGoalIds.includes(goalId)) {
      setGameState(prev => ({
        ...prev,
        activeGoals: [...prev.activeGoals, goalId],
      }));
    }
  }, [activeGoalIds, completedGoalIds, setGameState]);

  const completeGoal = useCallback((goalId: string) => {
    const goal = gameGoals.find(g => g.id === goalId);
    if (goal && activeGoalIds.includes(goalId)) {
      setGameState(prev => ({
        ...prev,
        activeGoals: prev.activeGoals.filter(id => id !== goalId),
        completedGoals: [...prev.completedGoals, goalId],
        love: prev.love + (goal.reward?.love || 0),
        treats: prev.treats + (goal.reward?.treats || 0),
      }));
    }
  }, [activeGoalIds, setGameState]);

  useEffect(() => {
    const checkGoals = () => {
      activeGoalIds.forEach(goalId => {
        const goal = gameGoals.find(g => g.id === goalId);
        if (!goal) return;

        let isCompleted = false;
        switch (goal.type) {
          case 'get_job':
            if (goal.target?.jobId && (jobLevels[goal.target.jobId] || 0) > 0) {
              isCompleted = true;
            }
            break;
          case 'get_paying_job':
            if (jobLevels && Object.values(jobLevels).some(level => level > 1)) {
              isCompleted = true;
            }
            break;
          case 'buy_upgrade':
            if (goal.target?.upgradeId && (upgradeLevels[goal.target.upgradeId] || 0) > 0) {
              isCompleted = true;
            }
            break;
          case 'buy_thing':
            if (goal.target?.thingId && (thingQuantities[goal.target.thingId] || 0) > 0) {
              isCompleted = true;
            }
            break;
          case 'reach_currency':
            if (goal.target?.currencyType === 'love' && goal.target.amount && love >= goal.target.amount) {
              isCompleted = true;
            } else if (goal.target?.currencyType === 'treats' && goal.target.amount && treats >= goal.target.amount) {
              isCompleted = true;
            }
            break;
        }

        if (isCompleted) {
          completeGoal(goal.id);
        }
      });
    };

    checkGoals();
  }, [activeGoalIds, jobLevels, upgradeLevels, thingQuantities, love, treats, completeGoal]);

  const activeGoals: Goal[] = gameGoals.filter(g => activeGoalIds.includes(g.id));
  const completedGoals: Goal[] = gameGoals.filter(g => completedGoalIds.includes(g.id)).map(g => ({ ...g, isCompleted: true }));

  return { activeGoals, completedGoals, addGoal };
}; 