import { MUSCLE_MODULES } from '../curriculum/modules';
import type { MuscleRegion } from '../types/node';

export function parseMuscleModuleFromSearch(search: string): MuscleRegion | null {
  const raw = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('module');
  if (!raw) return null;
  return MUSCLE_MODULES.some((mod) => mod.id === raw) ? (raw as MuscleRegion) : null;
}

/** Shareable module URL — omits `module` for full-body atlas view. */
export function muscleModuleHref(moduleId: MuscleRegion | null): string {
  if (typeof window === 'undefined') {
    return moduleId ? `?module=${encodeURIComponent(moduleId)}` : '/muscle/';
  }
  const params = new URLSearchParams(window.location.search);
  if (moduleId) params.set('module', moduleId);
  else params.delete('module');
  const qs = params.toString();
  const path = window.location.pathname;
  return qs ? `${path}?${qs}` : path;
}

export function syncMuscleModuleUrl(moduleId: MuscleRegion | null): void {
  if (typeof window === 'undefined') return;
  const href = muscleModuleHref(moduleId);
  const current = `${window.location.pathname}${window.location.search}`;
  if (current !== href) {
    window.history.replaceState(null, '', href);
  }
}
