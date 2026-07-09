import type { LyreflyWorkflowStage } from '../workflow/lyreflyWorkflowStages';

export type LyreflyRoute =
  | { kind: 'gallery' }
  | { kind: 'project'; projectId: string; stage?: LyreflyWorkflowStage }
  | { kind: 'script'; projectId: string };

const STAGE_IDS = new Set<LyreflyWorkflowStage>(['brainstorm', 'script', 'art', 'publish']);

export function parseLyreflyHash(hash: string): LyreflyRoute {
  const raw = hash.replace(/^#/, '').replace(/^\//, '');
  const segments = raw.split('/').filter(Boolean);
  if (segments.length === 0 || segments[0] === 'gallery') {
    return { kind: 'gallery' };
  }
  if (segments[0] === 'project' && segments[1]) {
    const maybeStage = segments[2];
    const stage = maybeStage && STAGE_IDS.has(maybeStage as LyreflyWorkflowStage)
      ? (maybeStage as LyreflyWorkflowStage)
      : undefined;
    return { kind: 'project', projectId: segments[1], stage };
  }
  if (segments[0] === 'script' && segments[1]) {
    return { kind: 'script', projectId: segments[1] };
  }
  return { kind: 'gallery' };
}

export function lyreflyGalleryHref(): string {
  return '#/gallery';
}

export function lyreflyProjectHref(projectId: string): string {
  return `#/project/${projectId}`;
}

export function lyreflyProjectStageHref(projectId: string, stage: LyreflyWorkflowStage): string {
  return `#/project/${projectId}/${stage}`;
}

export function lyreflyScriptHref(projectId: string): string {
  return `#/project/${projectId}/script`;
}

export function navigateLyreflyHash(href: string): void {
  window.location.hash = href.replace(/^#/, '');
}
