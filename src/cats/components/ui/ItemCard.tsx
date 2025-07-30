import React from 'react';
import CostDisplay from './CostDisplay';

interface ItemCardProps {
  title: string;
  description: string;
  level: number;
  levelName?: string;
  currentEffectDisplay: React.ReactNode;
  nextLevelName: string;
  nextEffectDisplay: React.ReactNode;
  treatCost?: number;
  loveCost?: number;
  canAfford: boolean;
  onAction: () => void;
  actionText: string;
  currentLove: number;
  currentTreats?: number;
}

const ItemCard: React.FC<ItemCardProps> = ({
  title,
  description,
  level,
  levelName,
  currentEffectDisplay,
  nextLevelName,
  nextEffectDisplay,
  treatCost,
  loveCost,
  canAfford,
  onAction,
  actionText,
  currentLove,
  currentTreats,
}) => {
  return (
    <div className="item-card">
      <div className="item-card-header">
        <h4 className="item-card-title">{title}</h4>
        <div className="item-card-level">
          {level > 0 ? `Lvl. ${level}${levelName ? `: ${levelName}` : ''}` : 'Not purchased'}
        </div>
      </div>
      <p className="item-card-description">{description}</p>
      
      <div className="item-card-body">
        <div className="item-card-effects">
          <div className="effect-current">
            <strong>Current:</strong> {currentEffectDisplay}
          </div>
          <div className="effect-next">
            <strong>Next:</strong> {nextEffectDisplay}
          </div>
          <div className="next-level-name">
            ({nextLevelName})
          </div>
        </div>

        <div className="item-card-purchase">
          <CostDisplay
            treatCost={treatCost}
            loveCost={loveCost}
            currentTreats={currentTreats}
            currentLove={currentLove}
          />
          <button
            className={`item-card-button ${canAfford ? 'available' : 'disabled'}`}
            onClick={onAction}
            disabled={!canAfford}
          >
            {canAfford ? actionText : "Can't Afford"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemCard; 