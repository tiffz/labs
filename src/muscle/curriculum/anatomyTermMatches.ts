import { ALL_NODES } from './index';
import { Z_ANATOMY_BRIDGE } from './zAnatomyBridge';
import type { AnatomyTerm } from '../types/anatomyTerm';
import type { JointType, MuscleMemoryNode } from '../types/node';

export type LatinRootPattern = {
  id: string;
  /** Match against latinName or display name (case-insensitive). */
  pattern: RegExp;
};

export const MUSCLE_LATIN_ROOTS: LatinRootPattern[] = [
  { id: 'root_bi', pattern: /\bbi-|\bbiceps\b/i },
  { id: 'root_tri', pattern: /\btri-|\btriceps\b/i },
  { id: 'root_maximus', pattern: /\bmaximus\b/i },
  { id: 'root_minimus', pattern: /\bminimus\b/i },
  { id: 'root_longus', pattern: /\blongus\b/i },
  { id: 'root_brevis', pattern: /\bbrevis\b/i },
  { id: 'root_magnus', pattern: /\bmagnus\b/i },
  { id: 'root_gluteus', pattern: /\bgluteus\b/i },
  { id: 'root_flexor', pattern: /\bflexor\b/i },
  { id: 'root_extensor', pattern: /\bextensor\b/i },
  { id: 'root_abductor', pattern: /\babductor\b/i },
  { id: 'root_adductor', pattern: /\badductor\b/i },
];

const ROOT_BY_TERM_ID: Record<string, LatinRootPattern['id']> = {
  term_prefix_bi: 'root_bi',
  term_prefix_tri: 'root_tri',
  term_prefix_maximus: 'root_maximus',
  term_prefix_minimus: 'root_minimus',
  term_prefix_longus: 'root_longus',
  term_prefix_brevis: 'root_brevis',
  term_prefix_magnus: 'root_magnus',
  term_prefix_gluteus: 'root_gluteus',
  term_prefix_flexor: 'root_flexor',
  term_prefix_extensor: 'root_extensor',
  term_prefix_abductor: 'root_abductor',
  term_prefix_adductor: 'root_adductor',
};

const JOINT_TYPE_BY_TERM_ID: Record<string, JointType> = {
  term_joint_hinge: 'hinge',
  term_joint_pivot: 'pivot',
  term_joint_ball_socket: 'ball_socket',
  term_joint_ellipsoid: 'ellipsoid',
  term_joint_saddle: 'saddle',
  term_joint_plane: 'plane',
};

const CURATED_NODE_IDS = new Set(
  ALL_NODES.filter((node) => !node.atlasOnly).map((node) => node.id),
);

const BRIDGE_NODE_BY_ATLAS_NAME = new Map(
  Z_ANATOMY_BRIDGE.map((entry) => [entry.zAnatomyName.toLowerCase(), entry.nodeId]),
);

function normalizeAtlasLabel(value: string): string {
  return value.toLowerCase().replace(/\.r$/, '').replace(/\s+/g, ' ').trim();
}

function searchableName(node: MuscleMemoryNode): string {
  return [
    node.name,
    node.details.latinName,
    ...(node.details.colloquialNames ?? []),
  ]
    .filter(Boolean)
    .join(' ');
}

function curatedParentForNode(node: MuscleMemoryNode): string {
  if (!node.atlasOnly) return node.id;
  const exact = BRIDGE_NODE_BY_ATLAS_NAME.get(node.name.toLowerCase());
  if (exact && CURATED_NODE_IDS.has(exact)) return exact;

  const norm = normalizeAtlasLabel(node.name);
  for (const [bridgeName, nodeId] of BRIDGE_NODE_BY_ATLAS_NAME) {
    const bridgeNorm = normalizeAtlasLabel(bridgeName);
    if (
      (norm.includes(bridgeNorm.slice(0, 28)) || bridgeNorm.includes(norm.slice(0, 28))) &&
      CURATED_NODE_IDS.has(nodeId)
    ) {
      return nodeId;
    }
  }
  return node.id;
}

export function findMusclesMatchingLatinRoot(rootId: LatinRootPattern['id']): MuscleMemoryNode[] {
  const root = MUSCLE_LATIN_ROOTS.find((entry) => entry.id === rootId);
  if (!root) return [];
  return ALL_NODES.filter((node) => node.type === 'muscle' && root.pattern.test(searchableName(node)));
}

export function findJointsByType(jointType: JointType): MuscleMemoryNode[] {
  return ALL_NODES.filter((node) => node.type === 'joint' && node.jointType === jointType);
}

export function getHighlightNodeIdsForTerm(term: AnatomyTerm): string[] {
  const rootId = ROOT_BY_TERM_ID[term.id];
  if (rootId) {
    const matches = findMusclesMatchingLatinRoot(rootId);
    const ids = new Set<string>();
    for (const node of matches) {
      ids.add(node.id);
      if (node.atlasOnly) {
        const parentId = curatedParentForNode(node);
        if (CURATED_NODE_IDS.has(parentId)) ids.add(parentId);
      }
    }
    return [...ids];
  }

  const jointType = JOINT_TYPE_BY_TERM_ID[term.id];
  if (jointType) {
    return findJointsByType(jointType).map((node) => node.id);
  }

  return term.exampleNodeIds ?? [];
}

/** Curated chip list for term panels — one chip per study muscle, not atlas sub-meshes. */
export function getTermChipNodes(term: AnatomyTerm): MuscleMemoryNode[] {
  const ids = getHighlightNodeIdsForTerm(term);
  const nodes = ids
    .map((id) => ALL_NODES.find((node) => node.id === id))
    .filter((node): node is MuscleMemoryNode => Boolean(node));

  const chipIds = new Set<string>();
  for (const node of nodes) {
    chipIds.add(curatedParentForNode(node));
  }

  return [...chipIds]
    .map((id) => ALL_NODES.find((node) => node.id === id))
    .filter((node): node is MuscleMemoryNode => Boolean(node && node.type === 'muscle'))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export function isTermPatternTerm(term: AnatomyTerm): boolean {
  return (
    term.visualization === 'term_pattern_highlight' || term.visualization === 'joint_type_highlight'
  );
}

export function jointTypeTermIdForJoint(node: MuscleMemoryNode): string | undefined {
  if (!node.jointType) return undefined;
  const entry = Object.entries(JOINT_TYPE_BY_TERM_ID).find(([, type]) => type === node.jointType);
  return entry?.[0];
}
