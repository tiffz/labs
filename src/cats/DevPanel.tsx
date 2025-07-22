import React from 'react';

interface DevPanelProps {
  energy: number;
  pounceConfidence: number;
  rapidClickCount: number;
  lastVelocity: number;
  proximityMultiplier: number;
}

const DevPanel: React.FC<DevPanelProps> = ({
  energy,
  pounceConfidence,
  rapidClickCount,
  lastVelocity,
  proximityMultiplier,
}) => {
  return (
    <div className="dev-panel">
      <h3>Dev Info</h3>
      <p>
        <strong>Energy:</strong> {energy.toFixed(2)} / 100
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
        <strong>Rapid Clicks:</strong> {rapidClickCount}
      </p>
    </div>
  );
};

export default DevPanel; 