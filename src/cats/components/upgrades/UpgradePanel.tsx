import React from 'react';
import { upgradeData, getInfiniteUpgradeCost } from '../../data/upgradeData';
import Upgrade from './Upgrade';

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
    
    // Determine if using predefined or infinite level
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

  return (
    <div className="upgrade-panel">
      <p className="panel-intro">
        Hard work pays off. Feed your cat treats to get love.
      </p>

      <div className="upgrade-section">
        {conversionUpgrades.map((upgrade) => (
          <Upgrade
            key={upgrade.id}
            upgrade={upgrade}
            level={upgradeLevels[upgrade.id] || 0}
            onUpgrade={() => onUpgrade(upgrade.id)}
            canUpgrade={canAffordUpgrade(upgrade.id)}
            currentTreats={currentTreats}
            currentLove={currentLove}
          />
        ))}
      </div>

      <div className="upgrade-section">
        <h4 className="section-title">Love Efficiency</h4>
        <p className="section-description">Increase love gained per treat conversion</p>
        {multiplierUpgrades.map((upgrade) => (
          <Upgrade
            key={upgrade.id}
            upgrade={upgrade}
            level={upgradeLevels[upgrade.id] || 0}
            onUpgrade={() => onUpgrade(upgrade.id)}
            canUpgrade={canAffordUpgrade(upgrade.id)}
            currentTreats={currentTreats}
            currentLove={currentLove}
          />
        ))}
      </div>
    </div>
  );
};

export default UpgradePanel; 