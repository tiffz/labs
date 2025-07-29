import { useCallback } from 'react';
import type { GameState } from '../game/types';
import { upgradeData, getInfiniteUpgradeCost } from '../data/upgradeData';
import { playingUpgradeData, getInfinitePlayingUpgradeCost, getInfinitePlayingUpgradeEffect } from '../data/playingUpgradeData';

export const useUpgradeSystem = (
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  setLovePerClick: React.Dispatch<React.SetStateAction<number>>,
  setLovePerPounce: React.Dispatch<React.SetStateAction<number>>,
) => {
  const handleUpgrade = useCallback((upgradeId: string) => {
    setGameState(prev => {
      const { treats, love, upgradeLevels } = prev;
      const currentLevel = upgradeLevels[upgradeId] || 0;
      const upgrade = upgradeData.find(u => u.id === upgradeId);

      if (!upgrade) return prev;

      const usePredefinedLevel = currentLevel < upgrade.levels.length;
      let treatCost: number, loveCost: number;

      if (usePredefinedLevel) {
        const level = upgrade.levels[currentLevel];
        treatCost = level.treatCost;
        loveCost = level.loveCost;
      } else {
        const infiniteCost = getInfiniteUpgradeCost(upgrade, currentLevel);
        if (!infiniteCost) return prev;
        treatCost = infiniteCost.treatCost;
        loveCost = infiniteCost.loveCost;
      }

      if (treats >= treatCost && love >= loveCost) {
        return {
          ...prev,
          treats: treats - treatCost,
          love: love - loveCost,
          upgradeLevels: { ...upgradeLevels, [upgradeId]: currentLevel + 1 },
        };
      }

      return prev;
    });
  }, [setGameState]);

  const handlePlayingUpgrade = useCallback((upgradeId: string) => {
    setGameState(prev => {
      const { love, playingUpgradeLevels } = prev;
      const currentLevel = playingUpgradeLevels[upgradeId] || 0;
      const upgrade = playingUpgradeData.find(u => u.id === upgradeId);

      if (!upgrade) return prev;

      const usePredefinedLevel = currentLevel < upgrade.levels.length;
      let loveCost: number, effectValue: number;

      if (usePredefinedLevel) {
        const level = upgrade.levels[currentLevel];
        loveCost = level.loveCost;
        effectValue = level.effect;
      } else {
        const infiniteCost = getInfinitePlayingUpgradeCost(upgrade, currentLevel);
        const infiniteEffect = getInfinitePlayingUpgradeEffect(upgrade, currentLevel);
        if (!infiniteCost || !infiniteEffect) return prev;
        loveCost = infiniteCost.loveCost;
        effectValue = infiniteEffect;
      }

      if (love >= loveCost) {
        if (upgradeId === 'love_per_pet') {
          setLovePerClick(current => current + effectValue);
        } else if (upgradeId === 'love_per_pounce') {
          setLovePerPounce(current => current + effectValue);
        }

        return {
          ...prev,
          love: love - loveCost,
          playingUpgradeLevels: { ...playingUpgradeLevels, [upgradeId]: currentLevel + 1 },
        };
      }

      return prev;
    });
  }, [setGameState, setLovePerClick, setLovePerPounce]);

  return { handleUpgrade, handlePlayingUpgrade };
}; 