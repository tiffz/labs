import React, { useState } from 'react';
import JobPanel from '../jobs/JobPanel';
import UpgradePanel from '../upgrades/UpgradePanel';
import PlayingPanel from '../playing/PlayingPanel';
import GoalsPanel from './GoalsPanel';
import type { Goal } from '../../data/eventData';

interface TabbedPanelProps {
  // Job panel props
  jobLevels: { [key: string]: number };
  onPromote: (jobId: string) => void;
  unlockedJobs: string[];
  
  // Upgrade panel props
  upgradeLevels: { [key: string]: number };
  onUpgrade: (upgradeId: string) => void;
  
  // Playing panel props
  playingUpgradeLevels: { [key: string]: number };
  onPlayingUpgrade: (upgradeId: string) => void;
  lovePerClick: number;
  lovePerPounce: number;
  
  // Goals panel props
  activeGoals: Goal[];
  completedGoals: Goal[];
  
  // Shared currency props
  currentLove: number;
  currentTreats: number;
}

type TabId = 'jobs' | 'feeding' | 'playing' | 'goals';

const TabbedPanel: React.FC<TabbedPanelProps> = ({
  jobLevels,
  onPromote,
  unlockedJobs,
  upgradeLevels,
  onUpgrade,
  playingUpgradeLevels,
  onPlayingUpgrade,
  lovePerClick,
  lovePerPounce,
  activeGoals,
  completedGoals,
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
        <button
          className={`tab-header ${activeTab === 'goals' ? 'active' : ''}`}
          onClick={() => setActiveTab('goals')}
        >
          Goals
          {activeGoals.length > 0 && (
            <span className="tab-badge">{activeGoals.length}</span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'jobs' && (
          <JobPanel
            jobLevels={jobLevels}
            onPromote={onPromote}
            currentLove={currentLove}
            unlockedJobs={unlockedJobs}
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
        {activeTab === 'goals' && (
          <GoalsPanel
            activeGoals={activeGoals}
            completedGoals={completedGoals}
          />
        )}
      </div>
    </div>
  );
};

export default TabbedPanel; 