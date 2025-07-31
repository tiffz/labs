import React from 'react';
import { upgradeData, getInfiniteUpgradeCost, getInfiniteUpgradeEffect, getInfiniteUpgradeName } from '../../data/upgradeData';
import ItemCard from '../ui/ItemCard';
import MaterialIcon from '../../icons/MaterialIcon';

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
  // For now, all upgrades are love_multiplier type
  const allUpgrades = upgradeData;

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
        
    const tooltipContent = (
      <div>
        <div className="item-tooltip-header">
          <MaterialIcon icon={upgrade.icon} className="item-tooltip-icon" />
          <h4 className="item-tooltip-title">{upgrade.name}</h4>
        </div>
        <p className="item-tooltip-description">{upgrade.description}</p>
        <div className="item-tooltip-effects">
          <div className="item-tooltip-effect-line">
            <strong>Current:</strong> {formatEffect(currentEffect, upgrade.type)}
          </div>
          <div className="item-tooltip-effect-line">
            <strong>Next:</strong> {formatEffect(currentEffect + nextLevelInfo.effect, upgrade.type)}
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
        treatCost={nextLevelInfo.treatCost}
        loveCost={nextLevelInfo.loveCost}
        canAfford={canAffordUpgrade(upgrade.id)}
        onAction={() => onUpgrade(upgrade.id)}
        currentTreats={currentTreats}
        currentLove={currentLove}
        tooltipContent={tooltipContent}
        icon={upgrade.icon}
      />
    );
  };

  return (
    <div className="panel">
      <p className="panel-intro">
        Hard work pays off. Feed your cat treats to get love.
      </p>

      <div className="upgrade-section">
        <h4 className="section-title">Quality</h4>
        <p className="section-description">Improve the meal experience to get more love per treat</p>
        {allUpgrades.map(renderUpgrade)}
      </div>
    </div>
  );
};

export default UpgradePanel; 