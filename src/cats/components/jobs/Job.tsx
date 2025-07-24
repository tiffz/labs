import React from 'react';
import type { JobData } from '../../data/jobData';
import HeartIcon from '../../icons/HeartIcon';

interface JobProps {
  job: JobData;
  level: number;
  onPromote: () => void;
  canPromote: boolean;
}

const Job: React.FC<JobProps> = ({ job, level, onPromote, canPromote }) => {
  const currentLevel = level > 0 ? job.levels[level - 1] : null;
  const nextLevel = level < job.levels.length ? job.levels[level] : null;

  return (
    <div className="job">
      <h4>{job.name}</h4>
      <p>
        Current Level: {currentLevel ? currentLevel.title : 'Unemployed'}
      </p>
      {currentLevel && (
        <p>
          Earnings: {currentLevel.treatsPerSecond.toFixed(1)} treats/sec
        </p>
      )}
      <div className="job-action">
        {nextLevel ? (
          <button onClick={onPromote} disabled={!canPromote}>
            Promote to {nextLevel.title} (Cost: <HeartIcon className="love-icon" /> {nextLevel.cost})
          </button>
        ) : (
          <p>Max level reached!</p>
        )}
      </div>
    </div>
  );
};

export default Job; 