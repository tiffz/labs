import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import MaterialIcon from '../../icons/MaterialIcon';
import CostDisplay from '../ui/CostDisplay';
import FishIcon from '../../icons/FishIcon';
import HeartIcon from '../../icons/HeartIcon';
import { type ThingData, getThingPrice } from '../../data/thingsData';

interface ThingCardProps {
  thing: ThingData;
  quantity: number;
  currentTreats: number;
  onPurchase: (thingId: string) => void;
}

const ThingCard: React.FC<ThingCardProps> = ({
  thing,
  quantity,
  currentTreats,
  onPurchase,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const price = getThingPrice(thing, quantity);
  const canAfford = currentTreats >= price;

  const handleClick = () => {
    if (canAfford) {
      onPurchase(thing.id);
    }
  };

  const renderEffectWithIcons = (effect: number, isTotal: boolean = false) => {
    const prefix = isTotal ? 'Total: ' : '';
    
    if (thing.effectType === 'love_per_treat') {
      return (
        <span className="thing-tooltip-effect">
          {prefix}+{effect} <HeartIcon className="tooltip-breakdown-icon" /> per <FishIcon className="tooltip-breakdown-icon" />
        </span>
      );
    } else if (thing.effectType === 'treat_consumption_rate') {
      return (
        <span className="thing-tooltip-effect">
          {prefix}+{effect} <FishIcon className="tooltip-breakdown-icon" /> consumption rate
        </span>
      );
    } else {
      return (
        <span className="thing-tooltip-effect">
          {prefix}+{effect} <HeartIcon className="tooltip-breakdown-icon" />/sec
        </span>
      );
    }
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const tooltipWidth = 240; // max-width of tooltip
    const tooltipHeight = 120; // reduced estimate for more accurate positioning
    const spaceAbove = rect.top;
    
    // Always show tooltip on the left side for consistency
    
    // Simple, conservative positioning - align with top of Thing by default
    let top = rect.top + window.scrollY;
    
    // Only adjust vertically if we'd go off screen
    if (top + tooltipHeight > window.innerHeight + window.scrollY) {
      // Position above the Thing if tooltip would go below viewport
      if (spaceAbove > tooltipHeight + 10) {
        top = rect.top + window.scrollY - tooltipHeight - 8;
      } else {
        // Otherwise just position to fit in viewport
        top = window.innerHeight + window.scrollY - tooltipHeight - 10;
      }
    }
    
    // Always position on the left side with extra spacing
    const horizontalGap = 16;
    const left = rect.left + window.scrollX - tooltipWidth - horizontalGap;
    
    setTooltipPosition({ top, left });
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <div
      className="thing-card-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        className={`thing-card ${canAfford ? 'affordable' : 'expensive'}`}
        onClick={handleClick}
        disabled={!canAfford}
      >
        <div className="thing-card-icon">
          <MaterialIcon icon={thing.icon} />
        </div>
        <div className="thing-card-info">
          <div className="thing-card-name">{thing.name}</div>
          <div className="thing-card-quantity">×{quantity}</div>
        </div>
        <div className="thing-card-cost">
          <CostDisplay
            treatCost={price}
            currentTreats={currentTreats}
            inline={true}
          />
        </div>
      </button>

      {showTooltip && ReactDOM.createPortal(
        <div 
          className="thing-card-tooltip left-side"
          style={{
            position: 'fixed',
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
          }}
        >
          <div className="thing-tooltip-header">
            <MaterialIcon icon={thing.icon} className="thing-tooltip-icon" />
            <h4 className="thing-tooltip-title">{thing.name}</h4>
          </div>
          <p className="thing-tooltip-description">{thing.description}</p>
          <div className="thing-tooltip-effects">
            <div className="thing-tooltip-effect">
              <strong>Effect:</strong> {renderEffectWithIcons(thing.baseEffect)}
            </div>
            {quantity > 0 && (
              <div className="thing-tooltip-effect">
                {renderEffectWithIcons(thing.baseEffect * quantity, true)}
              </div>
            )}
            <div className="thing-tooltip-price">
              <strong>Cost:</strong> {price} <FishIcon className="tooltip-breakdown-icon" />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ThingCard; 