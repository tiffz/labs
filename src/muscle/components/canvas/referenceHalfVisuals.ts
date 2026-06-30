import type { MuscleMemoryNode } from '../../types/node';

/** Opaque desaturated palette for the écorché reference half (non-interactive). */
export function referenceColorForNode(node: MuscleMemoryNode | undefined): string {
  if (!node) return '#7a8494';
  if (node.type === 'bone') return '#b8aea0';
  if (node.type === 'joint') return '#9aa8b8';
  return '#8f7a7e';
}
