import { parseEncoreAppHash } from '../../routes/encoreAppHash';

export function subscribePerformancesSubTab(onStoreChange: () => void): () => void {
  window.addEventListener('hashchange', onStoreChange);
  return () => window.removeEventListener('hashchange', onStoreChange);
}

export function getPerformancesSubTabSnapshot(): 'list' | 'wrapped' {
  if (typeof window === 'undefined') return 'list';
  const route = parseEncoreAppHash(window.location.hash);
  if (route.kind !== 'performances') return 'list';
  return route.tab === 'wrapped' ? 'wrapped' : 'list';
}
