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
    ],
  },
]; 