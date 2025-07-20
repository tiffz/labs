import React, { useState, useEffect } from 'react';
import Cat from './Cat';

function App() {
  const [treats, setTreats] = useState(0);
  const [treatsPerClick, setTreatsPerClick] = useState(1);
  const [treatsPerSecond, setTreatsPerSecond] = useState(0);
  const [isPetting, setIsPetting] = useState(false);

  const handleCatClick = () => {
    setTreats(treats + treatsPerClick);
    setIsPetting(true);
    setTimeout(() => setIsPetting(false), 200);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTreats((prevTreats) => prevTreats + treatsPerSecond);
    }, 1000);
    return () => clearInterval(interval);
  }, [treatsPerSecond]);

  const handleUpgradeTreatsPerClick = () => {
    const cost = treatsPerClick * 10;
    if (treats >= cost) {
      setTreats(treats - cost);
      setTreatsPerClick(treatsPerClick + 1);
    }
  };

  const handleUpgradeTreatsPerSecond = () => {
    const cost = (treatsPerSecond + 1) * 15;
    if (treats >= cost) {
      setTreats(treats - cost);
      setTreatsPerSecond(treatsPerSecond + 1);
    }
  };

  return (
    <div className="game-container">
      <h1>Cat Clicker</h1>
      <div className="stats-container">
        <p>Treats: {treats}</p>
        <p>Treats per click: {treatsPerClick}</p>
        <p>Treats per second: {treatsPerSecond}</p>
      </div>
      <div className="cat-container">
        <Cat onClick={handleCatClick} isPetting={isPetting} />
      </div>
      <div className="upgrades-container">
        <button onClick={handleUpgradeTreatsPerClick} disabled={treats < treatsPerClick * 10}>
          Upgrade treats per click (Cost: {treatsPerClick * 10})
        </button>
        <button onClick={handleUpgradeTreatsPerSecond} disabled={treats < (treatsPerSecond + 1) * 15}>
          Upgrade treats per second (Cost: {(treatsPerSecond + 1) * 15})
        </button>
      </div>
    </div>
  );
}

export default App; 