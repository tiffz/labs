import React from 'react';
import { jobData } from '../../data/jobData';
import { 
  calculateTrainingCost, 
  canAffordTraining, 
  canPromoteToNextLevel,
  getExperienceRequiredForPromotion 
} from '../../data/jobTrainingSystem';
import { calculateInterviewCost, canAffordInterview } from '../../data/interviewSystem';
import type { JobInterviewState } from '../../game/types';

import MaterialIcon from '../../icons/MaterialIcon';
import HeartIcon from '../../icons/HeartIcon';
import FishIcon from '../../icons/FishIcon';

interface JobPanelProps {
  jobLevels: { [key:string]: number };
  jobExperience: { [key:string]: number };
  jobInterviews: { [key:string]: JobInterviewState };
  onPromote: (jobId: string) => void;
  onTrain: (jobId: string) => void;
  onInterview: (jobId: string) => void;
  currentLove: number;
  unlockedJobs: string[];
}

const JobPanel: React.FC<JobPanelProps> = ({ jobLevels, jobExperience, jobInterviews, onPromote, onTrain, onInterview, currentLove, unlockedJobs }) => {
  const unlockedJobData = jobData.filter(job => unlockedJobs.includes(job.id));
  const lockedJobsCount = jobData.length - unlockedJobData.length;

  const renderJob = (job: typeof jobData[0]) => {
    const level = jobLevels[job.id] || 0;
    const interviewState = jobInterviews[job.id] || { hasOffer: false };
    
    // If not employed yet (level 0), show interview UI
    if (level === 0) {
      return renderInterviewUI(job, interviewState);
    }
    
    // If employed (level > 0), show normal job UI
    return renderEmployedUI(job, level);
  };

  const renderInterviewUI = (job: typeof jobData[0], interviewState: JobInterviewState) => {
    const interviewCost = calculateInterviewCost(job.id);
    const canAfford = canAffordInterview(currentLove, job.id);
    
    if (interviewState.hasOffer) {
      // Player has received a job offer - show accept button
      return (
        <div key={job.id} className="compact-job-card offer-state">
          <div className="job-main-info">
            <MaterialIcon icon={job.icon} className="job-icon-small" />
            <div className="job-details">
              <div className="job-name">{job.name}</div>
              <div className="job-progress">
                <span className="job-current">Job Offer Received!</span>
              </div>
            </div>
            <span className="income-indicator">
              <FishIcon className="treats-icon-small" />
              {Math.floor(job.levels[0].treatsPerSecond)}/sec
            </span>
          </div>
          {interviewState.lastRejectionReason && (
            <div className="interview-feedback">
              <strong>Rejection:</strong> <em>&ldquo;{interviewState.lastRejectionReason}&rdquo;</em>
            </div>
          )}
          <div className="job-actions-compact">
            <button 
              className="action-btn accept-offer-btn ready"
              onClick={() => onPromote(job.id)}
              title="Accept the job offer and start working!"
            >
              <MaterialIcon icon="check_circle" />
              <span className="btn-text">Accept Offer</span>
            </button>
          </div>
        </div>
      );
    } else {
      // Player is interviewing - show interview button and rejection reason
      return (
        <div key={job.id} className="compact-job-card interview-state">
          <div className="job-main-info">
            <MaterialIcon icon={job.icon} className="job-icon-small" />
            <div className="job-details">
              <div className="job-name">{job.name}</div>
              <div className="job-progress">
                <span className="job-current">Looking for work</span>
              </div>
            </div>
            <span className="income-indicator">
              <FishIcon className="treats-icon-small" />
              {Math.floor(job.levels[0].treatsPerSecond)}/sec
            </span>
          </div>
          {interviewState.lastRejectionReason && (
            <div className="interview-feedback">
              <strong>Rejection:</strong> <em>&ldquo;{interviewState.lastRejectionReason}&rdquo;</em>
            </div>
          )}
          <div className="job-actions-compact">
            <button 
              className={`action-btn interview-btn ${canAfford ? 'affordable' : 'expensive'}`}
              onClick={() => canAfford && onInterview(job.id)}
              disabled={!canAfford}
              title={`Interview for this position (costs ${interviewCost} love)`}
            >
              <MaterialIcon icon="person" />
              <span className="btn-text">
                Interview ({interviewCost} <HeartIcon className="love-icon-small" />)
              </span>
            </button>
          </div>
        </div>
      );
    }
  };

  const renderEmployedUI = (job: typeof jobData[0], level: number) => {
    const experience = jobExperience[job.id] || 0;
    const currentLevelInfo = level > 0 ? job.levels[level - 1] : null;
    const nextLevelInfo = level < job.levels.length ? job.levels[level] : null;
    
    // Training costs and affordability
    const trainingCost = calculateTrainingCost(job.id, experience);
    const canAffordTrain = canAffordTraining(currentLove, job.id, experience);
    
    // Promotion requirements
    const requiredExperience = getExperienceRequiredForPromotion(jobData, job.id, level);
    const canPromoteExp = canPromoteToNextLevel(jobData, job.id, level, experience);
    const canPromote = canPromoteExp; // Only depends on experience, not love

    // Experience progress calculation
    const experienceProgress = requiredExperience ? Math.min(experience / requiredExperience, 1) : 1;

    // Build compact job ladder for this job
    const ladderDots = job.levels.map((levelInfo, index) => (
      <span 
        key={index} 
        className={`ladder-dot ${index < level ? 'completed' : index === level ? 'current' : 'locked'}`}
        title={`${levelInfo.title} (${Math.floor(levelInfo.treatsPerSecond)} treats/sec)`}
      >
        {index < level ? '●' : index === level ? '◉' : '○'}
      </span>
    ));



    return (
      <div key={job.id} className="compact-job-card">
        <div className="job-main-info">
          <MaterialIcon icon={job.icon} className="job-icon-small" />
          <div className="job-details">
            <div className="job-name">{job.name}</div>
            <div className="job-progress">
              <span className="job-ladder-compact">{ladderDots}</span>
              <span className="job-current">
                {currentLevelInfo ? (
                  <>
                    {currentLevelInfo.title}
                                         <span className="income-indicator"> ({Math.floor(currentLevelInfo.treatsPerSecond)} <FishIcon className="treats-icon-small" />/sec)</span>
                  </>
                ) : 'Unemployed'}
              </span>
            </div>
            {nextLevelInfo && (
              <div className="experience-bar-compact">
                <div 
                  className="experience-fill-compact" 
                  style={{ width: `${experienceProgress * 100}%` }}
                />
                <span className="experience-text">{experience}/{requiredExperience} XP</span>
              </div>
            )}
          </div>
        </div>

        <div className="job-actions-compact">
          {nextLevelInfo && (
            <>
                                <button 
                    className={`action-btn train-btn ${canAffordTrain ? 'affordable' : 'expensive'}`}
                    onClick={() => onTrain(job.id)}
                    disabled={!canAffordTrain}
                    title={`${level === 0 ? 'Interview' : 'Work'} for ${trainingCost} love`}
                  >
                    <MaterialIcon icon={level === 0 ? "person" : "business_center"} />
                    <span className="btn-text">
                      {level === 0 ? 'Interview' : 'Work'} ({trainingCost}
                      <HeartIcon className="love-icon-small" />)
                    </span>
                  </button>
                  <button 
                    className={`action-btn promote-btn ${canPromote ? 'ready' : 'needs-exp'}`}
                    onClick={() => onPromote(job.id)}
                    disabled={!canPromote}
                    title={canPromote ? (level === 0 ? 'Accept the job offer!' : 'Ask for a promotion now!') : `Need ${(requiredExperience || 0) - experience} more XP`}
                  >
                    <MaterialIcon icon="trending_up" />
                    <span className="btn-text">
                      {canPromote ? (level === 0 ? 'Accept offer' : 'Ask for promotion') : 'Locked'}
                    </span>
                  </button>
            </>
          )}
          {!nextLevelInfo && level > 0 && (
            <div className="max-level-compact">
              <MaterialIcon icon="workspace_premium" />
              <span>Max Level</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="panel">
      <p className="job-panel-intro">
        Your cat needs a better life. It&apos;s time to get a job.
      </p>
      <div className="enhanced-jobs-section">
        {unlockedJobData.map(renderJob)}
      </div>
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