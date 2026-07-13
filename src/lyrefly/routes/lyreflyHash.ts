import type { LyreflyWorkflowStage } from '../workflow/lyreflyWorkflowStages';

export type LyreflyRoute =
  | { kind: 'gallery' }
  | { kind: 'sketchbook' }
  | { kind: 'project'; projectId: string; stage?: LyreflyWorkflowStage }
  | { kind: 'profile'; projectId: string }
  | { kind: 'script'; projectId: string }
  | { kind: 'share'; fileId: string };

const STAGE_IDS = new Set<LyreflyWorkflowStage>(['brainstorm', 'script', 'thumbs', 'art', 'publish']);

export function parseLyreflyHash(hash: string): LyreflyRoute {
  const raw = hash.replace(/^#/, '').replace(/^\//, '');
  const segments = raw.split('/').filter(Boolean);
  if (segments.length === 0 || segments[0] === 'gallery' || segments[0] === 'logo-gallery') {
    return { kind: 'gallery' };
  }
  if (segments[0] === 'sketchbook') {
    return { kind: 'sketchbook' };
  }
  if (segments[0] === 'project' && segments[1]) {
    if (segments[2] === 'profile') {
      return { kind: 'profile', projectId: segments[1] };
    }
    const maybeStage = segments[2];
    const stage = maybeStage && STAGE_IDS.has(maybeStage as LyreflyWorkflowStage)
      ? (maybeStage as LyreflyWorkflowStage)
      : undefined;
    return { kind: 'project', projectId: segments[1], stage };
  }
  if (segments[0] === 'share' && segments[1]) {
    return { kind: 'share', fileId: decodeURIComponent(segments[1]) };
  }
  if (segments[0] === 'script' && segments[1]) {
    return { kind: 'script', projectId: segments[1] };
  }
  return { kind: 'gallery' };
}

export function lyreflyGalleryHref(): string {
  return '#/gallery';
}

export function lyreflySketchbookHref(): string {
  return '#/sketchbook';
}

export function lyreflyProjectHref(projectId: string): string {
  return `#/project/${projectId}`;
}

export function lyreflyProjectStageHref(projectId: string, stage: LyreflyWorkflowStage): string {
  return `#/project/${projectId}/${stage}`;
}

export function lyreflyProjectProfileHref(projectId: string): string {
  return `#/project/${projectId}/profile`;
}

export function lyreflyScriptHref(projectId: string): string {
  return `#/project/${projectId}/script`;
}

export function navigateLyreflyHash(href: string): void {
  window.location.hash = href.replace(/^#/, '');
}
