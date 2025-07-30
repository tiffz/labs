import React from 'react';
import { playingUpgradeData, getInfinitePlayingUpgradeCost, getInfinitePlayingUpgradeEffect, getInfinitePlayingUpgradeName } from '../../data/playingUpgradeData';
import ItemCard from '../ui/ItemCard';

interface PlayingPanelProps {
  playingUpgradeLevels: { [key: string]: number };
  onPlayingUpgrade: (upgradeId: string) => void;
  currentLove: number;
  lovePerClick: number;
  lovePerPounce: number;
}

const PlayingPanel: React.FC<PlayingPanelProps> = ({ 
  playingUpgradeLevels, 
  onPlayingUpgrade, 
  currentLove,
  lovePerClick,
  lovePerPounce
}) => {
  const canAffordUpgrade = (upgradeId: string) => {
    const currentLevel = playingUpgradeLevels[upgradeId] || 0;
    const upgrade = playingUpgradeData.find(u => u.id === upgradeId);
    if (!upgrade) return false;
    
    const usePredefinedLevel = currentLevel < upgrade.levels.length;
    
    if (usePredefinedLevel) {
      const upgradeLevel = upgrade.levels[currentLevel];
      return currentLove >= upgradeLevel.loveCost;
    } else {
      const infiniteCost = getInfinitePlayingUpgradeCost(upgrade, currentLevel);
      if (!infiniteCost) return false;
      return currentLove >= infiniteCost.loveCost;
    }
  };

  const renderPlayingUpgrade = (upgrade: typeof playingUpgradeData[0]) => {
    const level = playingUpgradeLevels[upgrade.id] || 0;
    const usePredefinedLevel = level < upgrade.levels.length;

    let currentValue = upgrade.id === 'love_per_pet' ? lovePerClick : lovePerPounce;
    for (let i = 0; i < Math.min(level, upgrade.levels.length); i++) {
      currentValue += upgrade.levels[i].effect;
    }
    for (let i = upgrade.levels.length; i < level; i++) {
      const infiniteEffectValue = getInfinitePlayingUpgradeEffect(upgrade, i);
      if (infiniteEffectValue) {
        currentValue += infiniteEffectValue;
      }
    }

    const nextLevelInfo = usePredefinedLevel
      ? upgrade.levels[level]
      : {
          name: getInfinitePlayingUpgradeName(upgrade, level)!,
          effect: getInfinitePlayingUpgradeEffect(upgrade, level)!,
          loveCost: getInfinitePlayingUpgradeCost(upgrade, level)!.loveCost,
        };

    return (
      <ItemCard
        key={upgrade.id}
        title={upgrade.name}
        description={upgrade.description}
        level={level}
        levelName={usePredefinedLevel && level > 0 ? upgrade.levels[level - 1].name : undefined}
        currentEffectDisplay={`${Math.round(currentValue)} ❤️ per action`}
        nextLevelName={nextLevelInfo.name}
        nextEffectDisplay={`${Math.round(currentValue + nextLevelInfo.effect)} ❤️ per action`}
        loveCost={nextLevelInfo.loveCost}
        canAfford={canAffordUpgrade(upgrade.id)}
        onAction={() => onPlayingUpgrade(upgrade.id)}
        actionText="Upgrade"
        currentLove={currentLove}
      />
    );
  };

  return (
    <div className="panel">
      <p className="panel-intro">
        Train hard so you can play hard.
      </p>
      
      <div className="playing-section">
        {playingUpgradeData.map(renderPlayingUpgrade)}
      </div>
    </div>
  );
};

export default PlayingPanel; 