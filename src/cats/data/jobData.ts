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
    name: 'Cardboard Box Factory',
    levels: [
      { title: 'Unpaid Intern', cost: 10, treatsPerSecond: 0 },
      { title: 'Box Folder', cost: 50, treatsPerSecond: 1 },
      { title: 'Senior Box Inspector', cost: 250, treatsPerSecond: 3 },
      { title: 'Chief Box Enthusiast', cost: 1000, treatsPerSecond: 10 },
      { title: 'VP of Corrugation', cost: 5000, treatsPerSecond: 25 },
    ],
  },
  {
    id: 'cushion_fluffer',
    name: 'Professional Cushion Fluffer',
    levels: [
      { title: 'Apprentice Fluffer', cost: 100, treatsPerSecond: 2 },
      { title: 'Journeyman of Softness', cost: 750, treatsPerSecond: 8 },
      { title: 'Pillow Quality Analyst', cost: 3000, treatsPerSecond: 20 },
      { title: 'Head of Comfort Operations', cost: 12000, treatsPerSecond: 50 },
      { title: 'Chairman of the Board of Naps', cost: 50000, treatsPerSecond: 150 },
    ],
  },
  {
    id: 'sunbeam_manager',
    name: 'Sunbeam Relocation Specialist',
    levels: [
      { title: 'Sun Spot Monitor', cost: 500, treatsPerSecond: 10 },
      { title: 'Certified Light Wrangler', cost: 2500, treatsPerSecond: 30 },
      { title: 'Chief Photon Officer', cost: 15000, treatsPerSecond: 100 },
      { title: 'Director of Solar Placement', cost: 75000, treatsPerSecond: 400 },
      { title: 'President of the Warm Spot on the Rug', cost: 300000, treatsPerSecond: 1200 },
    ],
  },
]; 