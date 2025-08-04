interface InterviewResult {
  success: boolean;
  message: string;
  loveCost: number;
}

// Short, punchy rejection reasons (quotes added by UI)
const rejectionReasons = [
  "We're allergic to cats",
  "You talked about cats too much",
  "We need more traditional experience",
  "You fell asleep in the waiting room",
  "Petting cats isn't a real skill",
  "You weren't paying close attention",
  "Stop petting our office plants",
  "Nap time isn't a company value",
  "Your phone meowed for an hour",
  "Health plan doesn't cover vet bills",
  "Cover letter was just cat photos",
  "Fridays off for cat business? No",
  "You can't pet the interviewer",
  "Your references are all cats",
  "Your shirt was covered in cat hair",
  "Your 5 year goal was to pet your cat",
  "You meowed at the interviewer",
  "Cat photos aren't a portfolio"
];

// Short success messages (quotes added by UI)
const successReasons = [
  "Your unique perspective could be valuable here. You're hired!",
  "We admire your dedication to your hobbies",
  "You have the focused attention we're looking for",
  "Your unconventional background makes you stand out",
  "We appreciate candidates who think outside the box",
  "Your references spoke highly of your gentle nature",
  "You showed real composure under pressure",
  "We're impressed by your adaptability",
  "Your work-life balance aligns with our culture",
  "Something about you feels right. Welcome to the team!"
];

interface InterviewConfig {
  baseLoveCost: number;
  successRate: number; // Probability of success (0.0 to 1.0)
}

// Interview configurations per job type
const interviewConfigs: { [jobId: string]: InterviewConfig } = {
  box_factory: {
    baseLoveCost: 3,
    successRate: 0.35, // 35% success rate = ~3 attempts needed on average
  },
  software_developer: {
    baseLoveCost: 5,
    successRate: 0.15, // Harder to get
  },
  librarian: {
    baseLoveCost: 7,
    successRate: 0.12, // Even harder
  },
};

// Default config for unknown jobs
const defaultInterviewConfig: InterviewConfig = {
  baseLoveCost: 4,
  successRate: 0.18,
};

export function getInterviewConfig(jobId: string): InterviewConfig {
  return interviewConfigs[jobId] || defaultInterviewConfig;
}

export function calculateInterviewCost(jobId: string): number {
  const config = getInterviewConfig(jobId);
  return config.baseLoveCost;
}

export function canAffordInterview(currentLove: number, jobId: string): boolean {
  const cost = calculateInterviewCost(jobId);
  return currentLove >= cost;
}

export function performInterview(jobId: string): InterviewResult {
  const config = getInterviewConfig(jobId);
  const loveCost = config.baseLoveCost;
  
  // Roll for success
  const success = Math.random() < config.successRate;
  
  let message: string;
  if (success) {
    // Pick a random success reason
    message = successReasons[Math.floor(Math.random() * successReasons.length)];
  } else {
    // Pick a random rejection reason
    message = rejectionReasons[Math.floor(Math.random() * rejectionReasons.length)];
  }
  
  return {
    success,
    message,
    loveCost,
  };
} 