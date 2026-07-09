import { useLiveQuery } from 'dexie-react-hooks';

import { resolveDexieLiveQuery } from '../../shared/dexie/resolveDexieLiveQuery';
import { lyreflyDb } from '../db/lyreflyDb';
import type { ComicProject } from '../types';

export function useLyreflyProjects(): {
  projects: ComicProject[];
  projectsHydrated: boolean;
} {
  const raw = useLiveQuery(() => lyreflyDb.projects.orderBy('updatedAt').reverse().toArray(), []);
  const { value, hydrated } = resolveDexieLiveQuery(raw, []);
  return { projects: value, projectsHydrated: hydrated };
}
