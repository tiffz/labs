interface JobLevel {
  title: string;
  treatsPerSecond: number;
  experienceRequired: number; // Experience needed to unlock this level
}

export interface JobData {
  id: string;
  name: string;
  description: string;
  icon: string;
  levels: JobLevel[];
}

export const jobData: JobData[] = [
  {
    id: 'box_factory',
    name: 'Box Factory',
    description: 'A reliable and sturdy career in the art of cardboard.',
    icon: 'conveyor_belt',
    levels: [
      { title: 'Unpaid Intern', treatsPerSecond: 0, experienceRequired: 3 },
      { title: 'Box Folder', treatsPerSecond: 1, experienceRequired: 5 },
      { title: 'Box Tape Specialist', treatsPerSecond: 2, experienceRequired: 12 },
      { title: 'Cardboard Quality Inspector', treatsPerSecond: 4, experienceRequired: 22 },
      { title: 'Box Assembly Coordinator', treatsPerSecond: 7, experienceRequired: 35 },
      { title: 'Senior Box Inspector', treatsPerSecond: 11, experienceRequired: 52 },
      { title: 'Packaging Process Leader', treatsPerSecond: 16, experienceRequired: 75 },
      { title: 'Chief Box Enthusiast', treatsPerSecond: 23, experienceRequired: 105 },
      { title: 'Cardboard Engineering Manager', treatsPerSecond: 32, experienceRequired: 145 },
      { title: 'VP of Cardboard Operations', treatsPerSecond: 45, experienceRequired: 200 },
      { title: 'Director of Global Box Strategy', treatsPerSecond: 65, experienceRequired: 275 },
      { title: 'Chief Cardboard Officer', treatsPerSecond: 95, experienceRequired: 375 },
      { title: 'Supreme Box Overlord', treatsPerSecond: 140, experienceRequired: 500 },
    ],
  },
  {
    id: 'software_developer',
    name: 'Software Developer',
    description: 'Use your paws to write code and catch bugs.',
    icon: 'work',
    levels: [
      { title: 'Junior Keyboard Warmer', treatsPerSecond: 3, experienceRequired: 0 },
      { title: 'Bug Catcher', treatsPerSecond: 12, experienceRequired: 15 },
      { title: 'String Theorist', treatsPerSecond: 30, experienceRequired: 35 },
      { title: 'Lead Architect', treatsPerSecond: 80, experienceRequired: 70 },
      { title: 'Principal Engineer', treatsPerSecond: 200, experienceRequired: 120 },
      { title: 'Senior Principal Engineer', treatsPerSecond: 480, experienceRequired: 180 },
      { title: 'Distinguished Engineer', treatsPerSecond: 1100, experienceRequired: 260 },
      { title: 'Chief Technology Officer', treatsPerSecond: 2400, experienceRequired: 360 },
    ],
  },
  {
    id: 'librarian',
    name: 'Librarian',
    description: 'Ensure silence and order among the towering shelves.',
    icon: 'school',
    levels: [
      { title: 'Book Dust Sniffer', treatsPerSecond: 15, experienceRequired: 0 },
      { title: 'Page Turner', treatsPerSecond: 45, experienceRequired: 20 },
      { title: 'Lead Shusher', treatsPerSecond: 120, experienceRequired: 45 },
      { title: 'Head of the Cardboard Box Section', treatsPerSecond: 350, experienceRequired: 80 },
      {
        title: 'Director of Dewey Decimal Disturbance',
        treatsPerSecond: 900,
        experienceRequired: 140,
      },
      { title: 'Chief Information Officer', treatsPerSecond: 2200, experienceRequired: 220 },
      { title: 'Master of All Knowledge', treatsPerSecond: 5000, experienceRequired: 320 },
    ],
  },
  {
    id: 'chef',
    name: 'Professional Chef',
    description: 'Turn ingredients into culinary masterpieces with whiskers precision.',
    icon: 'restaurant',
    levels: [
      { title: 'Dish Washer', treatsPerSecond: 25, experienceRequired: 0 },
      { title: 'Prep Cook', treatsPerSecond: 85, experienceRequired: 25 },
      { title: 'Line Cook', treatsPerSecond: 250, experienceRequired: 50 },
      { title: 'Sous Chef', treatsPerSecond: 650, experienceRequired: 90 },
      { title: 'Head Chef', treatsPerSecond: 1500, experienceRequired: 150 },
      { title: 'Executive Chef', treatsPerSecond: 3200, experienceRequired: 230 },
      { title: 'Celebrity Chef', treatsPerSecond: 6800, experienceRequired: 340 },
      { title: 'Michelin Star Master', treatsPerSecond: 14000, experienceRequired: 480 },
    ],
  },
  {
    id: 'artist',
    name: 'Digital Artist',
    description: 'Create beautiful art using your natural sense of aesthetics and claws.',
    icon: 'brush',
    levels: [
      { title: 'Sketch Pad Scratcher', treatsPerSecond: 40, experienceRequired: 0 },
      { title: 'Junior Illustrator', treatsPerSecond: 140, experienceRequired: 30 },
      { title: 'Graphic Designer', treatsPerSecond: 420, experienceRequired: 60 },
      { title: 'Art Director', treatsPerSecond: 1100, experienceRequired: 110 },
      { title: 'Creative Director', treatsPerSecond: 2600, experienceRequired: 180 },
      { title: 'Master Artist', treatsPerSecond: 5500, experienceRequired: 280 },
      { title: 'Renaissance Cat', treatsPerSecond: 11000, experienceRequired: 420 },
    ],
  },
  {
    id: 'detective',
    name: 'Private Detective', 
    description: 'Use your natural curiosity and stealth to solve mysteries.',
    icon: 'search',
    levels: [
      { title: 'Assistant Snooper', treatsPerSecond: 60, experienceRequired: 0 },
      { title: 'Evidence Collector', treatsPerSecond: 220, experienceRequired: 35 },
      { title: 'Case Investigator', treatsPerSecond: 650, experienceRequired: 75 },
      { title: 'Senior Detective', treatsPerSecond: 1700, experienceRequired: 130 },
      { title: 'Private Investigator', treatsPerSecond: 4000, experienceRequired: 210 },
      { title: 'Master Detective', treatsPerSecond: 8500, experienceRequired: 320 },
      { title: 'Legendary Sleuth', treatsPerSecond: 17000, experienceRequired: 460 },
    ],
  },
  {
    id: 'scientist',
    name: 'Research Scientist',
    description: 'Apply your natural experiments with physics to advance science.',
    icon: 'science',
    levels: [
      { title: 'Lab Assistant', treatsPerSecond: 90, experienceRequired: 0 },
      { title: 'Research Associate', treatsPerSecond: 340, experienceRequired: 40 },
      { title: 'Project Scientist', treatsPerSecond: 1000, experienceRequired: 85 },
      { title: 'Senior Researcher', treatsPerSecond: 2700, experienceRequired: 150 },
      { title: 'Principal Scientist', treatsPerSecond: 6200, experienceRequired: 240 },
      { title: 'Lead Researcher', treatsPerSecond: 13000, experienceRequired: 360 },
      { title: 'Nobel Prize Winner', treatsPerSecond: 26000, experienceRequired: 520 },
    ],
  },
  {
    id: 'astronaut',
    name: 'Space Explorer',
    description: 'Boldly go where no cat has gone before, in zero gravity.',
    icon: 'rocket_launch',
    levels: [
      { title: 'Space Cadet', treatsPerSecond: 130, experienceRequired: 0 },
      { title: 'Mission Specialist', treatsPerSecond: 520, experienceRequired: 45 },
      { title: 'Pilot Astronaut', treatsPerSecond: 1600, experienceRequired: 95 },
      { title: 'Mission Commander', treatsPerSecond: 4200, experienceRequired: 170 },
      { title: 'Space Station Captain', treatsPerSecond: 9500, experienceRequired: 270 },
      { title: 'Interplanetary Explorer', treatsPerSecond: 20000, experienceRequired: 400 },
      { title: 'Galactic Pioneer', treatsPerSecond: 40000, experienceRequired: 580 },
    ],
  },
  {
    id: 'entrepreneur',
    name: 'Business Mogul',
    description: 'Build cat empires and disrupt industries with innovative thinking.',
    icon: 'business_center',
    levels: [
      { title: 'Intern Entrepreneur', treatsPerSecond: 200, experienceRequired: 0 },
      { title: 'Startup Founder', treatsPerSecond: 800, experienceRequired: 50 },
      { title: 'Series A CEO', treatsPerSecond: 2500, experienceRequired: 110 },
      { title: 'Venture Capitalist', treatsPerSecond: 6500, experienceRequired: 190 },
      { title: 'Industry Disruptor', treatsPerSecond: 15000, experienceRequired: 300 },
      { title: 'Global Business Leader', treatsPerSecond: 32000, experienceRequired: 450 },
      { title: 'Economic Visionary', treatsPerSecond: 65000, experienceRequired: 650 },
    ],
  },
]; 