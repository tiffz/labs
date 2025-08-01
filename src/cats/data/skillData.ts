export interface SkillIncrement {
  title: string;
  description: string;
  successRate: number; // 0.0 to 1.0
  loveCost: number;
}

export interface SkillLevel {
  title: string;
  increments: SkillIncrement[];
}

export interface SkillData {
  id: string;
  name: string;
  description: string;
  icon: string; // Material Design icon name
  effectType: 'love_per_pet' | 'love_per_pounce' | 'furniture_love_multiplier' | 'feeding_effect_multiplier' | 'training_experience_multiplier' | 'job_treats_multiplier';
  effectAmount: number; // Amount of increase per level
  levels: SkillLevel[];
}

export const skillData: SkillData[] = [
  {
    id: 'petting_technique',
    name: 'Petting Technique',
    description: 'Master the art of the perfect pet to get more love from each interaction.',
    icon: 'pets',
    effectType: 'love_per_pet',
    effectAmount: 2, // +2 love per pet per level
    levels: [
      { 
        title: 'Gentle Strokes',
        increments: [
          { title: 'Find the sweet spot', description: 'Learning where cats like to be touched', successRate: 0.7, loveCost: 2 },
          { title: 'Pressure control', description: 'Getting the right amount of pressure', successRate: 0.6, loveCost: 3 },
          { title: 'Rhythm mastery', description: 'Finding the perfect petting rhythm', successRate: 0.5, loveCost: 3 },
          { title: 'Reading body language', description: 'Understanding when cats want to be petted', successRate: 0.4, loveCost: 4 }
        ]
      },
      { 
        title: 'Chin Scratches',
        increments: [
          { title: 'Chin location', description: 'Finding the exact chin sweet spot', successRate: 0.6, loveCost: 3 },
          { title: 'Finger technique', description: 'Using the right finger motion', successRate: 0.5, loveCost: 4 },
          { title: 'Timing perfection', description: 'Knowing when cats want chin scratches', successRate: 0.4, loveCost: 4 },
          { title: 'Chin sensitivity', description: 'Adjusting technique for different cats', successRate: 0.3, loveCost: 5 },
          { title: 'Multi-chin mastery', description: 'Handling multiple cats at once', successRate: 0.3, loveCost: 6 }
        ]
      },
      { 
        title: 'Behind the Ears',
        increments: [
          { title: 'Ear anatomy', description: 'Understanding cat ear sensitivity', successRate: 0.5, loveCost: 4 },
          { title: 'Gentle approach', description: 'Not startling cats with ear touches', successRate: 0.4, loveCost: 5 },
          { title: 'The perfect spot', description: 'Finding each cat\'s favorite ear spot', successRate: 0.3, loveCost: 5 },
          { title: 'Ear massage technique', description: 'Advanced ear relaxation methods', successRate: 0.3, loveCost: 6 },
          { title: 'Bilateral coordination', description: 'Coordinating both ear scratches', successRate: 0.2, loveCost: 7 }
        ]
      },
      { 
        title: 'Belly Rub Basics',
        increments: [
          { title: 'Trust building', description: 'Getting cats comfortable with belly exposure', successRate: 0.4, loveCost: 5 },
          { title: 'Trap recognition', description: 'Identifying when it\'s actually a trap', successRate: 0.3, loveCost: 6 },
          { title: 'Quick withdrawal', description: 'Learning to escape belly traps safely', successRate: 0.3, loveCost: 6 },
          { title: 'Gentle belly technique', description: 'The rare art of successful belly rubs', successRate: 0.2, loveCost: 8 }
        ]
      },
      { 
        title: 'Advanced Petting',
        increments: [
          { title: 'Multi-zone coordination', description: 'Petting multiple areas simultaneously', successRate: 0.3, loveCost: 7 },
          { title: 'Purr optimization', description: 'Maximizing purr intensity and duration', successRate: 0.2, loveCost: 8 },
          { title: 'Cat whispering', description: 'Understanding subtle preference signals', successRate: 0.2, loveCost: 9 },
          { title: 'Zen petting state', description: 'Achieving perfect human-cat harmony', successRate: 0.1, loveCost: 12 }
        ]
      }
    ]
  },
  {
    id: 'wand_technique',
    name: 'Wand Play Technique', 
    description: 'Improve your wand toy skills to generate more love from every pounce.',
    icon: 'magic_button',
    effectType: 'love_per_pounce',
    effectAmount: 3, // +3 love per pounce per level
    levels: [
      { 
        title: 'Basic Wiggling',
        increments: [
          { title: 'Wand grip', description: 'Learning to hold the wand properly', successRate: 0.8, loveCost: 2 },
          { title: 'Simple movements', description: 'Making basic enticing motions', successRate: 0.6, loveCost: 3 },
          { title: 'Cat attention', description: 'Getting cats to notice the toy', successRate: 0.5, loveCost: 3 },
          { title: 'Consistent rhythm', description: 'Maintaining steady play patterns', successRate: 0.4, loveCost: 4 }
        ]
      },
      { 
        title: 'Erratic Movements',
        increments: [
          { title: 'Unpredictable patterns', description: 'Making movements cats can\'t predict', successRate: 0.5, loveCost: 4 },
          { title: 'Speed variation', description: 'Mixing fast and slow movements', successRate: 0.4, loveCost: 4 },
          { title: 'Direction changes', description: 'Sudden directional shifts', successRate: 0.3, loveCost: 5 },
          { title: 'Height dynamics', description: 'Varying wand height for intrigue', successRate: 0.3, loveCost: 6 }
        ]
      },
      { 
        title: 'Prey Simulation',
        increments: [
          { title: 'Mouse movements', description: 'Mimicking realistic mouse behavior', successRate: 0.4, loveCost: 5 },
          { title: 'Bird flight patterns', description: 'Simulating bird-like motions', successRate: 0.3, loveCost: 6 },
          { title: 'Hiding behaviors', description: 'Making the toy appear and disappear', successRate: 0.3, loveCost: 6 },
          { title: 'Injury simulation', description: 'Acting like wounded prey to trigger hunting', successRate: 0.2, loveCost: 8 }
        ]
      },
      { 
        title: 'Master Teasing',
        increments: [
          { title: 'Almost-catchable technique', description: 'Letting cats almost catch the toy', successRate: 0.3, loveCost: 7 },
          { title: 'Frustration management', description: 'Keeping cats engaged without overstimulation', successRate: 0.2, loveCost: 8 },
          { title: 'Multi-cat coordination', description: 'Playing with multiple cats simultaneously', successRate: 0.2, loveCost: 9 },
          { title: 'Zen wand mastery', description: 'Achieving perfect predator-prey balance', successRate: 0.1, loveCost: 12 }
        ]
      }
    ]
  },
  {
    id: 'interior_design',
    name: 'Interior Design',
    description: 'Arrange furniture and spaces to maximize your cat\'s comfort and happiness.',
    icon: 'home_improvement_and_tools',
    effectType: 'furniture_love_multiplier',
    effectAmount: 0.1, // +10% furniture love bonus per level
    levels: [
      { 
        title: 'Box Placement',
        increments: [
          { title: 'Box orientation', description: 'Learning optimal box positioning', successRate: 0.7, loveCost: 3 },
          { title: 'Size matching', description: 'Matching box size to cat preferences', successRate: 0.5, loveCost: 4 },
          { title: 'Location theory', description: 'Understanding where cats want boxes', successRate: 0.4, loveCost: 4 },
          { title: 'Multiple box strategy', description: 'Creating box networks throughout the home', successRate: 0.3, loveCost: 5 }
        ]
      },
      { 
        title: 'Cozy Spaces',
        increments: [
          { title: 'Hiding spot identification', description: 'Finding perfect cat hiding places', successRate: 0.5, loveCost: 5 },
          { title: 'Comfort optimization', description: 'Adding blankets and soft surfaces', successRate: 0.4, loveCost: 6 },
          { title: 'Temperature zones', description: 'Creating warm and cool areas', successRate: 0.3, loveCost: 6 },
          { title: 'Privacy design', description: 'Balancing openness with seclusion', successRate: 0.3, loveCost: 7 }
        ]
      },
      { 
        title: 'Cat Highway Engineering',
        increments: [
          { title: 'Vertical pathways', description: 'Creating climbing routes for cats', successRate: 0.4, loveCost: 6 },
          { title: 'Perch positioning', description: 'Optimal viewing platform placement', successRate: 0.3, loveCost: 7 },
          { title: 'Traffic flow analysis', description: 'Understanding cat movement patterns', successRate: 0.2, loveCost: 8 },
          { title: 'Multi-level architecture', description: 'Designing complete 3D cat environments', successRate: 0.2, loveCost: 10 }
        ]
      }
    ]
  },
  {
    id: 'food_prep',
    name: 'Food Preparation',
    description: 'Learn to prepare and present food in ways that maximize your cat\'s enjoyment.',
    icon: 'restaurant',
    effectType: 'feeding_effect_multiplier', 
    effectAmount: 0.15, // +15% feeding effect bonus per level
    levels: [
      { 
        title: 'Bowl Filling',
        increments: [
          { title: 'Portion sizes', description: 'Learning the right amount to serve', successRate: 0.7, loveCost: 3 },
          { title: 'Food arrangement', description: 'Making food look appealing', successRate: 0.5, loveCost: 4 },
          { title: 'Freshness timing', description: 'Serving food at the right time', successRate: 0.4, loveCost: 4 },
          { title: 'Temperature perfection', description: 'Getting the ideal food temperature', successRate: 0.3, loveCost: 5 }
        ]
      },
      { 
        title: 'Gourmet Techniques',
        increments: [
          { title: 'Flavor enhancement', description: 'Learning to make food more appealing', successRate: 0.4, loveCost: 5 },
          { title: 'Texture mastery', description: 'Understanding cat texture preferences', successRate: 0.3, loveCost: 6 },
          { title: 'Presentation skills', description: 'Making meals visually appealing to cats', successRate: 0.3, loveCost: 6 },
          { title: 'Multi-cat dining', description: 'Managing feeding multiple cats', successRate: 0.2, loveCost: 8 }
        ]
      }
    ]
  },
  {
    id: 'work_ethic',
    name: 'Work Ethic',
    description: 'Develop better training habits to gain more experience from every session.',
    icon: 'school',
    effectType: 'training_experience_multiplier',
    effectAmount: 0.2, // +20% training experience bonus per level
    levels: [
      { 
        title: 'Showing Up',
        increments: [
          { title: 'Consistency', description: 'Building a regular practice routine', successRate: 0.6, loveCost: 3 },
          { title: 'Focus basics', description: 'Learning to concentrate on training', successRate: 0.5, loveCost: 4 },
          { title: 'Motivation', description: 'Finding reasons to keep practicing', successRate: 0.4, loveCost: 4 },
          { title: 'Habit formation', description: 'Making training feel automatic', successRate: 0.3, loveCost: 5 }
        ]
      },
      { 
        title: 'Dedicated Practice',
        increments: [
          { title: 'Deep work', description: 'Learning to focus intensively', successRate: 0.4, loveCost: 5 },
          { title: 'Reflection skills', description: 'Analyzing what works and what doesn\'t', successRate: 0.3, loveCost: 6 },
          { title: 'Growth mindset', description: 'Embracing challenges as learning opportunities', successRate: 0.2, loveCost: 7 },
          { title: 'Meta-learning', description: 'Learning how to learn more effectively', successRate: 0.2, loveCost: 9 }
        ]
      }
    ]
  },
  {
    id: 'work_smarts',
    name: 'Work Intelligence',
    description: 'Develop professional acumen to earn more treats from your day job.',
    icon: 'psychology',
    effectType: 'job_treats_multiplier',
    effectAmount: 0.1, // +10% job treats bonus per level
    levels: [
      { 
        title: 'Basic Competence',
        increments: [
          { title: 'Task understanding', description: 'Grasping what your job actually requires', successRate: 0.6, loveCost: 4 },
          { title: 'Time management', description: 'Learning to manage your work time', successRate: 0.4, loveCost: 5 },
          { title: 'Quality standards', description: 'Understanding what good work looks like', successRate: 0.3, loveCost: 5 },
          { title: 'Priority setting', description: 'Knowing what to focus on first', successRate: 0.3, loveCost: 6 }
        ]
      },
      { 
        title: 'Strategic Thinking',
        increments: [
          { title: 'Process improvement', description: 'Finding ways to work more efficiently', successRate: 0.3, loveCost: 6 },
          { title: 'Problem solving', description: 'Tackling complex workplace challenges', successRate: 0.2, loveCost: 7 },
          { title: 'Leadership skills', description: 'Inspiring and guiding others', successRate: 0.2, loveCost: 8 },
          { title: 'Innovation mastery', description: 'Creating new solutions and approaches', successRate: 0.1, loveCost: 10 }
        ]
      }
    ]
  }
];

// Helper functions for skills
export function getSkillLevel(skillId: string, skillIncrements: { [levelIndex: number]: number }): number {
  const skill = skillData.find(s => s.id === skillId);
  if (!skill) return 0;
  
  let level = 0;
  for (let i = 0; i < skill.levels.length; i++) {
    const incrementsUnlocked = skillIncrements[i] || 0;
    const totalIncrements = skill.levels[i].increments.length;
    
    if (incrementsUnlocked >= totalIncrements) {
      level = i + 1;
    } else {
      break;
    }
  }
  return level;
}

export function getCurrentTrainingTarget(skillId: string, skillIncrements: { [levelIndex: number]: number }): { levelIndex: number; incrementIndex: number } | null {
  const skill = skillData.find(s => s.id === skillId);
  if (!skill) return null;
  
  for (let levelIndex = 0; levelIndex < skill.levels.length; levelIndex++) {
    const incrementsUnlocked = skillIncrements[levelIndex] || 0;
    const totalIncrements = skill.levels[levelIndex].increments.length;
    
    if (incrementsUnlocked < totalIncrements) {
      return { levelIndex, incrementIndex: incrementsUnlocked };
    }
  }
  
  return null; // All levels mastered
}

export function getSkillProgress(skillId: string, skillIncrements: { [levelIndex: number]: number }): { 
  currentLevel: number; 
  isMaxLevel: boolean; 
  currentLevelProgress: number;
  currentTarget: { levelIndex: number; incrementIndex: number } | null;
} {
  const skill = skillData.find(s => s.id === skillId);
  if (!skill) return { currentLevel: 0, isMaxLevel: false, currentLevelProgress: 0, currentTarget: null };
  
  const currentLevel = getSkillLevel(skillId, skillIncrements);
  const currentTarget = getCurrentTrainingTarget(skillId, skillIncrements);
  const isMaxLevel = currentTarget === null;
  
  let currentLevelProgress = 0;
  if (currentTarget) {
    const incrementsUnlocked = skillIncrements[currentTarget.levelIndex] || 0;
    const totalIncrements = skill.levels[currentTarget.levelIndex].increments.length;
    currentLevelProgress = incrementsUnlocked / totalIncrements;
  } else if (currentLevel > 0) {
    currentLevelProgress = 1; // Completed current level
  }
  
  return { currentLevel, isMaxLevel, currentLevelProgress, currentTarget };
}

export function getSkillEffect(skillId: string, skillIncrements: { [levelIndex: number]: number }): number {
  const skill = skillData.find(s => s.id === skillId);
  if (!skill) return 0;
  
  const level = getSkillLevel(skillId, skillIncrements);
  return level * skill.effectAmount;
}