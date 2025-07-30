export interface JobLevel {
  title: string;
  cost: number;
  treatsPerSecond: number;
}

export interface JobData {
  id: string;
  name: string;
  levels: JobLevel[];
}

export const jobData: JobData[] = [
  {
    id: 'box_factory',
    name: 'Box Factory',
    levels: [
      { title: 'Unpaid Intern', cost: 10, treatsPerSecond: 0 },
      { title: 'Box Folder', cost: 50, treatsPerSecond: 1 },
      { title: 'Senior Box Inspector', cost: 250, treatsPerSecond: 3 },
      { title: 'Chief Box Enthusiast', cost: 1000, treatsPerSecond: 10 },
      { title: 'VP of Cardboard', cost: 5000, treatsPerSecond: 25 },
    ],
  },
  {
    id: 'software_developer',
    name: 'Software Developer',
    levels: [
      { title: 'Junior Keyboard Warmer', cost: 100, treatsPerSecond: 2 },
      { title: 'Bug Catcher', cost: 750, treatsPerSecond: 8 },
      { title: 'String Theorist', cost: 3000, treatsPerSecond: 20 },
      { title: 'Lead Architect', cost: 12000, treatsPerSecond: 50 },
      { title: 'Principal Engineer', cost: 50000, treatsPerSecond: 150 },
    ],
  },
  {
    id: 'librarian',
    name: 'Librarian',
    levels: [
      { title: 'Book Dust Sniffer', cost: 500, treatsPerSecond: 10 },
      { title: 'Page Turner', cost: 2500, treatsPerSecond: 30 },
      { title: 'Lead Shusher', cost: 15000, treatsPerSecond: 100 },
      { title: 'Head of the Cardboard Box Section', cost: 75000, treatsPerSecond: 400 },
      {
        title: 'Director of Dewey Decimal Disturbance',
        cost: 300000,
        treatsPerSecond: 1200,
      },
    ],
  },
]; 