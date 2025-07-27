import React from 'react';

interface DevPanelProps {
  energy: number;
  pounceConfidence: number;
  rapidClickCount: number;
  lastVelocity: number;
  proximityMultiplier: number;
  lovePerClick: number;
  movementNovelty: number;
  clickExcitement: number;
  treatsPerSecond: number;
  conversionRate: number;
  loveMultiplier: number;
  currentTreats: number;
  onTimeSkip: () => void;
  onGiveTreats: () => void;
  onGiveLove: () => void;
}

const DevPanel: React.FC<DevPanelProps> = ({
  energy,
  pounceConfidence,
  rapidClickCount,
  lastVelocity,
  proximityMultiplier,
  lovePerClick,
  movementNovelty,
  clickExcitement,
  treatsPerSecond,
  conversionRate,
  loveMultiplier,
  currentTreats,
  onTimeSkip,
  onGiveTreats,
  onGiveLove,
}) => {
  return (
    <div className="dev-panel">
      <h3>Dev Info</h3>
      
      <div className="dev-section">
        <h4>Interaction & Pouncing</h4>
        <p>
          <strong>Energy:</strong> {energy.toFixed(2)} / 100
        </p>
        <p>
          <strong>Love per Click:</strong> {lovePerClick}
        </p>
        <p>
          <strong>Pounce Confidence:</strong> {pounceConfidence.toFixed(2)}
        </p>
        <p>
          <strong>Cursor Velocity:</strong> {lastVelocity.toFixed(2)}
        </p>
        <p>
          <strong>Proximity Multiplier:</strong> {proximityMultiplier.toFixed(2)}x
        </p>
        <p>
          <strong>Movement Novelty:</strong> {movementNovelty.toFixed(2)}
        </p>
        <p>
          <strong>Click Excitement:</strong> {clickExcitement.toFixed(2)}
        </p>
        <p>
          <strong>Rapid Clicks:</strong> {rapidClickCount}
        </p>
      </div>

      <div className="dev-section">
        <h4>Treats & Love Generation</h4>
        <p>
                      <strong>Treats per Second:</strong> {Math.floor(treatsPerSecond)}
        </p>
                  <p>
            <strong>Conversion Rate:</strong> {Math.floor(conversionRate)} treats/sec
          </p>
          <p>
            <strong>Love per Treat:</strong> {Math.floor(loveMultiplier)}x
          </p>
                  <p>
            <strong>Love per Second:</strong> {currentTreats > 0 && treatsPerSecond > 0 ? Math.floor(Math.min(conversionRate, treatsPerSecond) * loveMultiplier) : '0'} ❤️/sec
          </p>
      </div>

      <div className="dev-section">
        <h4>Debug Controls</h4>
        <button className="dev-button" onClick={onTimeSkip}>
          Skip Forward 1 Day
        </button>
        <button className="dev-button" onClick={onGiveTreats}>
          Give 1000 Treats
        </button>
        <button className="dev-button" onClick={onGiveLove}>
          Give 1000 Love
        </button>
      </div>
    </div>
  );
};

export default DevPanel; 