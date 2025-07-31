import React from 'react';
import { getThingsByCategory } from '../../data/thingsData';
import ThingCard from './ThingCard';

interface ThingsPanelProps {
  thingQuantities: { [key: string]: number };
  onPurchaseThing: (thingId: string) => void;
  currentTreats: number;
}

const ThingsPanel: React.FC<ThingsPanelProps> = ({ 
  thingQuantities, 
  onPurchaseThing, 
  currentTreats 
}) => {
  const feedingThings = getThingsByCategory('feeding');
  const environmentThings = getThingsByCategory('environment');

  return (
    <div className="panel">
      <p className="panel-intro">
        Money can&apos;t buy happiness... or can it?
      </p>

      <div className="things-section">
        <h4 className="section-title">Feeding</h4>
        <p className="section-description">Feed your cat treats to get love.</p>
        <div className="things-grid">
          {feedingThings.map(thing => (
            <ThingCard
              key={thing.id}
              thing={thing}
              quantity={thingQuantities[thing.id] || 0}
              currentTreats={currentTreats}
              onPurchase={onPurchaseThing}
            />
          ))}
        </div>
      </div>

      <div className="things-section">
        <h4 className="section-title">Environment</h4>
        <p className="section-description">A nice home is a happy home.</p>
        <div className="things-grid">
          {environmentThings.map(thing => (
            <ThingCard
              key={thing.id}
              thing={thing}
              quantity={thingQuantities[thing.id] || 0}
              currentTreats={currentTreats}
              onPurchase={onPurchaseThing}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ThingsPanel; 