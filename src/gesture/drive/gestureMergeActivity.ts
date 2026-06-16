import type { GesturePack } from '../types';

export function isIncompleteMergePack(pack: GesturePack): boolean {
  return pack.mergeStatus === 'incomplete';
}

export function shouldShowMergeRecoveryBanner(pack: GesturePack): boolean {
  return isIncompleteMergePack(pack);
}

export function mergeRecoverySourceCount(pack: GesturePack): number {
  return pack.mergeSourcePackIds?.length ?? 0;
}

export function mergeRecoveryCompletedCount(pack: GesturePack): number {
  return pack.mergeCompletedSourcePackIds?.length ?? 0;
}

export function formatInterruptedMergeHeadline(pack: GesturePack): string {
  return `Merge interrupted — "${pack.name}"`;
}

export function formatInterruptedMergeSummary(pack: GesturePack): string {
  const total = mergeRecoverySourceCount(pack);
  const done = mergeRecoveryCompletedCount(pack);
  if (total <= 0) {
    return 'This merge did not finish. Continue to move the remaining collections on Drive.';
  }
  if (done <= 0) {
    return `${total} collection${total === 1 ? '' : 's'} still need to move into this folder on Drive.`;
  }
  if (done >= total) {
    return 'Folders are on Drive; finishing local cleanup…';
  }
  return `${done} of ${total} collection${total === 1 ? '' : 's'} moved on Drive.`;
}
