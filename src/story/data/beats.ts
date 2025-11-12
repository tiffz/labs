import type { Beat } from '../types';

export const beats: Beat[] = [
  {
    name: '1. Opening Image',
    prompt: 'A "before" snapshot...',
    act: 1,
    sub: ['Visual Snapshot', 'Flaw Shown'],
  },
  {
    name: '2. Theme Stated',
    prompt: 'Stated by a minor character...',
    act: 1,
    sub: ['Minor Character', 'Dismissed Advice'],
  },
  {
    name: '3. Setup',
    prompt: "Show the hero's normal life...",
    act: 1,
    sub: ['Stasis = Death', 'Stated Goal (Want)'],
  },
  {
    name: '4. Catalyst',
    prompt: 'An action beat that happens *to* the hero.',
    act: 1,
    sub: ['Inciting Incident'],
  },
  {
    name: '5. Debate',
    prompt: 'A question or preparation.',
    act: 1,
    sub: ['Core Question'],
  },
  {
    name: '6. Break Into 2',
    prompt: 'The hero makes a proactive decision...',
    act: '2A',
    sub: ['New World', 'Wrong Decision'],
  },
  {
    name: '7. B Story',
    prompt: 'Introduce a new character or concept...',
    act: '2A',
    sub: ['New Character', 'Theme Embodied'],
  },
  {
    name: '8. Fun and Games',
    prompt: 'The "promise of the premise."',
    act: '2A',
    sub: ['Promise of Premise', 'Success/Failure'],
  },
  {
    name: '9. Midpoint',
    prompt: 'A "false victory" or "false defeat"...',
    act: '2A',
    sub: ['Turning Point', 'Stakes Raised'],
  },
  {
    name: '10. Bad Guys Close In',
    prompt: 'The opposite of Fun and Games.',
    act: '2B',
    sub: ['External Pressure', 'Internal Pressure'],
  },
  {
    name: '11. All Is Lost',
    prompt: 'The hero hits rock bottom.',
    act: '2B',
    sub: ['Whiff of Death', 'Rock Bottom'],
  },
  {
    name: '12. Dark Night of the Soul',
    prompt: 'A moment of reflection...',
    act: '2B',
    sub: ['Moment of Reflection', 'The Epiphany'],
  },
  {
    name: '13. Break Into 3',
    prompt: 'The hero learns the theme...',
    act: 3,
    sub: ['Right Decision'],
  },
  {
    name: '14. Finale',
    prompt: 'The hero enacts the plan...',
    act: 3,
    sub: ['Final Battle', 'Dig Deep Down', 'High Stakes'],
  },
  {
    name: '15. Final Image',
    prompt: 'A visual "after" snapshot...',
    act: 3,
    sub: ['Mirrored Image', 'Transformation'],
  },
];

