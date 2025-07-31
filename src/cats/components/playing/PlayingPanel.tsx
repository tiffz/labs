import React from 'react';
import { playingUpgradeData, getInfinitePlayingUpgradeCost, getInfinitePlayingUpgradeEffect, getInfinitePlayingUpgradeName } from '../../data/playingUpgradeData';
import ItemCard from '../ui/ItemCard';
import MaterialIcon from '../../icons/MaterialIcon';

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
    // This loop is incorrect for playing upgrades, it should be done in the game state
    // but for now, we'll just sum up the effects for display
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

    const tooltipContent = (
      <div>
        <div className="item-tooltip-header">
          <MaterialIcon icon={upgrade.icon} className="item-tooltip-icon" />
          <h4 className="item-tooltip-title">{upgrade.name}</h4>
        </div>
        <p className="item-tooltip-description">{upgrade.description}</p>
        <div className="item-tooltip-effects">
          <div className="item-tooltip-effect-line">
            <strong>Current:</strong> {`${Math.round(currentValue)} ❤️ per action`}
          </div>
          <div className="item-tooltip-effect-line">
            <strong>Next:</strong> {`${Math.round(currentValue + nextLevelInfo.effect)} ❤️ per action`}
          </div>
          <div className="item-tooltip-effect-line" style={{ fontStyle: 'italic', fontSize: '0.75rem' }}>
            ({nextLevelInfo.name})
          </div>
        </div>
      </div>
    );

    return (
      <ItemCard
        key={upgrade.id}
        id={upgrade.id}
        title={upgrade.name}
        level={level}
        loveCost={nextLevelInfo.loveCost}
        canAfford={canAffordUpgrade(upgrade.id)}
        onAction={() => onPlayingUpgrade(upgrade.id)}
        currentLove={currentLove}
        tooltipContent={tooltipContent}
        icon={upgrade.icon}
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