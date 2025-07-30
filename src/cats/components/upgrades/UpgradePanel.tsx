import React from 'react';
import { upgradeData, getInfiniteUpgradeCost, getInfiniteUpgradeEffect, getInfiniteUpgradeName } from '../../data/upgradeData';
import ItemCard from '../ui/ItemCard';

interface UpgradePanelProps {
  upgradeLevels: { [key: string]: number };
  onUpgrade: (upgradeId: string) => void;
  currentTreats: number;
  currentLove: number;
}

const UpgradePanel: React.FC<UpgradePanelProps> = ({ 
  upgradeLevels, 
  onUpgrade, 
  currentTreats, 
  currentLove
}) => {
  const conversionUpgrades = upgradeData.filter(u => u.type === 'conversion_rate');
  const multiplierUpgrades = upgradeData.filter(u => u.type === 'love_multiplier');

  const canAffordUpgrade = (upgradeId: string) => {
    const currentLevel = upgradeLevels[upgradeId] || 0;
    const upgrade = upgradeData.find(u => u.id === upgradeId);
    if (!upgrade) return false;
    
    const usePredefinedLevel = currentLevel < upgrade.levels.length;
    
    if (usePredefinedLevel) {
      const upgradeLevel = upgrade.levels[currentLevel];
      return currentTreats >= upgradeLevel.treatCost && currentLove >= upgradeLevel.loveCost;
    } else {
      const infiniteCost = getInfiniteUpgradeCost(upgrade, currentLevel);
      if (!infiniteCost) return false;
      return currentTreats >= infiniteCost.treatCost && currentLove >= infiniteCost.loveCost;
    }
  };

  const formatEffect = (value: number, type: string) => {
    if (type === 'conversion_rate') {
      return `${value.toFixed(1)} treats/sec`;
    } else {
      return `${value.toFixed(1)}x love`;
    }
  };

  const renderUpgrade = (upgrade: typeof upgradeData[0]) => {
    const level = upgradeLevels[upgrade.id] || 0;
    const usePredefinedLevel = level < upgrade.levels.length;

    let currentEffect = upgrade.baseEffect;
    for (let i = 0; i < Math.min(level, upgrade.levels.length); i++) {
      currentEffect += upgrade.levels[i].effect;
    }
    for (let i = upgrade.levels.length; i < level; i++) {
      const infiniteEffectValue = getInfiniteUpgradeEffect(upgrade, i);
      if (infiniteEffectValue) {
        currentEffect += infiniteEffectValue;
      }
    }

    const nextLevelInfo = usePredefinedLevel
      ? upgrade.levels[level]
      : {
          name: getInfiniteUpgradeName(upgrade, level)!,
          effect: getInfiniteUpgradeEffect(upgrade, level)!,
          treatCost: getInfiniteUpgradeCost(upgrade, level)!.treatCost,
          loveCost: getInfiniteUpgradeCost(upgrade, level)!.loveCost,
        };

    return (
      <ItemCard
        key={upgrade.id}
        title={upgrade.name}
        description={upgrade.description}
        level={level}
        levelName={usePredefinedLevel && level > 0 ? upgrade.levels[level - 1].name : undefined}
        currentEffectDisplay={formatEffect(currentEffect, upgrade.type)}
        nextLevelName={nextLevelInfo.name}
        nextEffectDisplay={formatEffect(currentEffect + nextLevelInfo.effect, upgrade.type)}
        treatCost={nextLevelInfo.treatCost}
        loveCost={nextLevelInfo.loveCost}
        canAfford={canAffordUpgrade(upgrade.id)}
        onAction={() => onUpgrade(upgrade.id)}
        actionText="Upgrade"
        currentTreats={currentTreats}
        currentLove={currentLove}
      />
    );
  };

  return (
    <div className="panel">
      <p className="panel-intro">
        Hard work pays off. Feed your cat treats to get love.
      </p>

      <div className="upgrade-section">
        {conversionUpgrades.map(renderUpgrade)}
      </div>

      <div className="upgrade-section">
        <h4 className="section-title">Quality</h4>
        <p className="section-description">Improve the meal experience to get more love per treat</p>
        {multiplierUpgrades.map(renderUpgrade)}
      </div>
    </div>
  );
};

export default UpgradePanel; 