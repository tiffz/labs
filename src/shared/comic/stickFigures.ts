export const STICK_POSE_IDS = [
  'standing',
  'walking',
  'sitting',
  'pointing',
  'arms-up',
] as const;

export type StickPoseId = (typeof STICK_POSE_IDS)[number];

export function stickFigureSvg(poseId: StickPoseId, color = '#333'): string {
  const poses: Record<StickPoseId, string> = {
    standing: `<circle cx="50" cy="18" r="8" fill="none" stroke="${color}" stroke-width="2"/><line x1="50" y1="26" x2="50" y2="55" stroke="${color}" stroke-width="2"/><line x1="50" y1="35" x2="35" y2="48" stroke="${color}" stroke-width="2"/><line x1="50" y1="35" x2="65" y2="48" stroke="${color}" stroke-width="2"/><line x1="50" y1="55" x2="38" y2="78" stroke="${color}" stroke-width="2"/><line x1="50" y1="55" x2="62" y2="78" stroke="${color}" stroke-width="2"/>`,
    walking: `<circle cx="52" cy="18" r="8" fill="none" stroke="${color}" stroke-width="2"/><line x1="52" y1="26" x2="48" y2="55" stroke="${color}" stroke-width="2"/><line x1="48" y1="35" x2="62" y2="42" stroke="${color}" stroke-width="2"/><line x1="48" y1="35" x2="34" y2="50" stroke="${color}" stroke-width="2"/><line x1="48" y1="55" x2="58" y2="78" stroke="${color}" stroke-width="2"/><line x1="48" y1="55" x2="32" y2="72" stroke="${color}" stroke-width="2"/>`,
    sitting: `<circle cx="50" cy="22" r="8" fill="none" stroke="${color}" stroke-width="2"/><line x1="50" y1="30" x2="50" y2="52" stroke="${color}" stroke-width="2"/><line x1="50" y1="38" x2="35" y2="48" stroke="${color}" stroke-width="2"/><line x1="50" y1="38" x2="65" y2="48" stroke="${color}" stroke-width="2"/><line x1="50" y1="52" x2="35" y2="58" stroke="${color}" stroke-width="2"/><line x1="50" y1="52" x2="65" y2="58" stroke="${color}" stroke-width="2"/>`,
    pointing: `<circle cx="48" cy="18" r="8" fill="none" stroke="${color}" stroke-width="2"/><line x1="48" y1="26" x2="48" y2="55" stroke="${color}" stroke-width="2"/><line x1="48" y1="35" x2="30" y2="45" stroke="${color}" stroke-width="2"/><line x1="48" y1="35" x2="72" y2="32" stroke="${color}" stroke-width="2"/><line x1="48" y1="55" x2="38" y2="78" stroke="${color}" stroke-width="2"/><line x1="48" y1="55" x2="58" y2="78" stroke="${color}" stroke-width="2"/>`,
    'arms-up': `<circle cx="50" cy="20" r="8" fill="none" stroke="${color}" stroke-width="2"/><line x1="50" y1="28" x2="50" y2="58" stroke="${color}" stroke-width="2"/><line x1="50" y1="36" x2="32" y2="22" stroke="${color}" stroke-width="2"/><line x1="50" y1="36" x2="68" y2="22" stroke="${color}" stroke-width="2"/><line x1="50" y1="58" x2="40" y2="80" stroke="${color}" stroke-width="2"/><line x1="50" y1="58" x2="60" y2="80" stroke="${color}" stroke-width="2"/>`,
  };
  return `<svg viewBox="0 0 100 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${poses[poseId]}</svg>`;
}

export function silhouetteSvg(color = '#333'): string {
  return `<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><ellipse cx="40" cy="22" rx="14" ry="16" fill="${color}"/><path d="M18 95 C18 60 28 48 40 48 C52 48 62 60 62 95 Z" fill="${color}"/></svg>`;
}
