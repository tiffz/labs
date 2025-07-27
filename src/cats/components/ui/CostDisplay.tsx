import React from 'react';
import HeartIcon from '../../icons/HeartIcon';
import FishIcon from '../../icons/FishIcon';

interface CostDisplayProps {
  treatCost?: number;
  loveCost?: number;
  currentTreats?: number;
  currentLove?: number;
  inline?: boolean; // For inline display like in Job components
}

const CostDisplay: React.FC<CostDisplayProps> = ({
  treatCost,
  loveCost,
  currentTreats = 0,
  currentLove = 0,
  inline = false
}) => {
  if (inline) {
    // Inline display for Job components
    const parts = [];
    
    if (treatCost !== undefined) {
      parts.push(
        <span key="treats" className="inline-cost">
          <FishIcon className="cost-icon" /> {treatCost.toLocaleString()}
        </span>
      );
    }
    
    if (loveCost !== undefined) {
      parts.push(
        <span key="love" className="inline-cost">
          <HeartIcon className="cost-icon" /> {loveCost.toLocaleString()}
        </span>
      );
    }
    
    return <>{parts}</>;
  }

  // Block display for Upgrade components
  return (
    <div className="upgrade-cost">
      {treatCost !== undefined && (
        <div className={`cost ${currentTreats >= treatCost ? 'affordable' : 'expensive'}`}>
          <FishIcon className="cost-icon" />
          {treatCost.toLocaleString()}
        </div>
      )}
      {loveCost !== undefined && (
        <div className={`cost ${currentLove >= loveCost ? 'affordable' : 'expensive'}`}>
          <HeartIcon className="cost-icon" />
          {loveCost.toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default CostDisplay; 