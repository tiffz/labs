import React, { useState, useEffect } from 'react';
import CostDisplay from './CostDisplay';
import { TooltipManager } from './TooltipManager';
import MaterialIcon from '../../icons/MaterialIcon';

interface ItemCardProps {
  id: string;
  title: string;
  level: number;
  treatCost?: number;
  loveCost?: number;
  canAfford: boolean;
  onAction: () => void;
  currentLove: number;
  currentTreats?: number;
  tooltipContent: React.ReactNode;
  icon: string; // Material Design icon name
}

const ItemCard: React.FC<ItemCardProps> = ({
  id,
  title,
  level,
  treatCost,
  loveCost,
  canAfford,
  onAction,
  currentLove,
  currentTreats,
  tooltipContent,
  icon,
}) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const tooltipId = `item-tooltip-${id}`;

  // Subscribe to tooltip manager to handle exclusive visibility
  useEffect(() => {
    const unsubscribe = TooltipManager.subscribe((activeTooltip) => {
      if (activeTooltip && activeTooltip !== tooltipId) {
        setIsTooltipVisible(false);
        setTimeoutId((currentTimeoutId) => {
          if (currentTimeoutId) {
            clearTimeout(currentTimeoutId);
          }
          return null;
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [tooltipId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  const handleMouseEnter = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    TooltipManager.setActiveTooltip(tooltipId);
    setIsTooltipVisible(true);
  };

  const handleMouseLeave = () => {
    const id = setTimeout(() => {
      if (TooltipManager.getActiveTooltip() === tooltipId) {
        TooltipManager.setActiveTooltip(null);
      }
      setIsTooltipVisible(false);
    }, 200);
    setTimeoutId(id);
  };

  return (
    <div 
      className="item-card-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        className={`item-card-button ${canAfford ? 'available' : 'disabled'}`}
        onClick={onAction}
        disabled={!canAfford}
      >
        <div className="item-card-main-content">
          <MaterialIcon icon={icon} className="item-card-icon" />
          <span className="item-card-title">{title}</span>
          <span className="item-card-level">x{level}</span>
        </div>
        <div className="item-card-cost">
          <CostDisplay
            treatCost={treatCost}
            loveCost={loveCost}
            currentTreats={currentTreats}
            currentLove={currentLove}
          />
        </div>
      </button>
      {isTooltipVisible && (
        <div 
          className="item-card-tooltip"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="item-card-tooltip-content">
            {tooltipContent}
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemCard; 