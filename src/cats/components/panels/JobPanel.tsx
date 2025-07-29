import React from 'react';
import { jobData } from '../../data/jobData';
import Job from '../jobs/Job';

interface JobPanelProps {
  jobLevels: { [key: string]: number };
  onPromote: (jobId: string) => void;
  currentLove: number;
  unlockedJobs: string[];
}

const JobPanel: React.FC<JobPanelProps> = ({ jobLevels, onPromote, currentLove, unlockedJobs }) => {
  const unlockedJobData = jobData.filter(job => unlockedJobs.includes(job.id));
  const lockedJobsCount = jobData.length - unlockedJobData.length;

  return (
    <div className="job-panel">
      <p className="job-panel-intro">
        Your cat needs a better life. It&apos;s time to get a job.
      </p>
      {unlockedJobData.map((job) => (
        <Job
          key={job.id}
          job={job}
          level={jobLevels[job.id] || 0}
          onPromote={() => onPromote(job.id)}
          canPromote={currentLove >= (job.levels[jobLevels[job.id] || 0]?.cost || Infinity)}
          currentLove={currentLove}
        />
      ))}
      {lockedJobsCount > 0 && (
        <div className="locked-jobs-hint">
          <div className="locked-jobs-text">
            <svg className="lock-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18,8h-1V6c0-2.76-2.24-5-5-5S7,3.24,7,6v2H6c-1.1,0-2,0.9-2,2v10c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2V10C20,8.9,19.1,8,18,8z M12,17c-1.1,0-2-0.9-2-2s0.9-2,2-2s2,0.9,2,2S13.1,17,12,17z M15.1,8H8.9V6c0-1.71,1.39-3.1,3.1-3.1s3.1,1.39,3.1,3.1V8z"/>
            </svg>
            {lockedJobsCount} more career {lockedJobsCount === 1 ? 'path' : 'paths'} to discover
          </div>
        </div>
      )}
    </div>
  );
};

export default JobPanel; 