import React, { useState } from 'react';
import JobPanel from '../jobs/JobPanel';
import UpgradePanel from '../upgrades/UpgradePanel';
import PlayingPanel from '../playing/PlayingPanel';

interface TabbedPanelProps {
  // Job panel props
  jobLevels: { [key: string]: number };
  onPromote: (jobId: string) => void;
  
  // Upgrade panel props
  upgradeLevels: { [key: string]: number };
  onUpgrade: (upgradeId: string) => void;
  
  // Playing panel props
  playingUpgradeLevels: { [key: string]: number };
  onPlayingUpgrade: (upgradeId: string) => void;
  lovePerClick: number;
  lovePerPounce: number;
  
  // Shared currency props
  currentLove: number;
  currentTreats: number;
}

type TabId = 'jobs' | 'feeding' | 'playing';

const TabbedPanel: React.FC<TabbedPanelProps> = ({
  jobLevels,
  onPromote,
  upgradeLevels,
  onUpgrade,
  playingUpgradeLevels,
  onPlayingUpgrade,
  lovePerClick,
  lovePerPounce,
  currentLove,
  currentTreats,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('jobs');

  return (
    <div className="tabbed-panel">
      {/* Tab Headers */}
      <div className="tab-headers">
        <button
          className={`tab-header ${activeTab === 'jobs' ? 'active' : ''}`}
          onClick={() => setActiveTab('jobs')}
        >
          Jobs
        </button>
        <button
          className={`tab-header ${activeTab === 'feeding' ? 'active' : ''}`}
          onClick={() => setActiveTab('feeding')}
        >
          Feeding
        </button>
        <button
          className={`tab-header ${activeTab === 'playing' ? 'active' : ''}`}
          onClick={() => setActiveTab('playing')}
        >
          Playing
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'jobs' && (
          <JobPanel
            jobLevels={jobLevels}
            onPromote={onPromote}
            currentLove={currentLove}
          />
        )}
        {activeTab === 'feeding' && (
          <UpgradePanel
            upgradeLevels={upgradeLevels}
            onUpgrade={onUpgrade}
            currentTreats={currentTreats}
            currentLove={currentLove}
          />
        )}
        {activeTab === 'playing' && (
          <PlayingPanel
            playingUpgradeLevels={playingUpgradeLevels}
            onPlayingUpgrade={onPlayingUpgrade}
            currentLove={currentLove}
            lovePerClick={lovePerClick}
            lovePerPounce={lovePerPounce}
          />
        )}
      </div>
    </div>
  );
};

export default TabbedPanel; 