import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readGlbJson } from './glbFileAudit';

/**
 * The bridge maps Z-Anatomy object names to study nodes, and Z-Anatomy's names
 * are not always right: two triceps heads are labelled "…biceps brachii
 * muscle", and the app shipped a biceps highlighted on the back of the arm.
 * Names cannot catch that. Where a mesh sits can.
 *
 * Each pair says "A lies in front of B" in anatomical position, from
 * OpenStax A&P 2e ch. 11. Measured on the bounding-box centre of each node's
 * mesh in the shipped GLBs (glTF is Y-up; the export puts the front at +Z).
 */
const IN_FRONT_OF: Array<[front: string, back: string]> = [
  // Axis control: if these fail, the export flipped the axis, not the anatomy.
  ['muscle_rectus_abdominis', 'muscle_erector_spinae'],
  ['bone_patella', 'muscle_gastrocnemius'],
  // Upper arm: flexors in front of the humerus, extensors behind.
  ['muscle_biceps_brachii', 'bone_humerus'],
  ['bone_humerus', 'muscle_triceps_long_head'],
  ['bone_humerus', 'muscle_triceps_lateral_head'],
  ['muscle_biceps_brachii', 'muscle_triceps_long_head'],
  // Brachialis hugs the front of the humerus, so compare it with the muscle opposite it.
  ['muscle_brachialis', 'muscle_triceps_medial_head'],
  // Forearm, palms forward: flexors in front of extensors.
  ['muscle_flexor_carpi_radialis', 'muscle_extensor_carpi_radialis'],
  ['muscle_flexor_digitorum_superficialis', 'muscle_extensor_digitorum'],
  // Hand, palms forward: palm muscles in front of the back of the hand.
  ['muscle_thenar_eminence', 'muscle_dorsal_interossei_hand'],
  // Shoulder and torso.
  ['muscle_deltoid_anterior', 'muscle_deltoid_posterior'],
  ['muscle_pectoralis_major', 'muscle_latissimus_dorsi'],
  ['muscle_pectoralis_major', 'muscle_rhomboid_major'],
  // Rotator cuff: subscapularis on the front of the scapula, the other three behind it.
  ['muscle_subscapularis', 'muscle_infraspinatus'],
  ['muscle_subscapularis', 'muscle_teres_minor'],
  // Thigh and leg.
  ['muscle_quadriceps_rectus_femoris', 'muscle_hamstrings_biceps_femoris'],
  ['muscle_vastus_medialis', 'muscle_semitendinosus'],
  ['muscle_tensor_fasciae_latae', 'muscle_gluteus_maximus'],
  ['muscle_tibialis_anterior', 'muscle_gastrocnemius'],
];

const MODELS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../public/muscle/models');

type GlbDoc = {
  nodes?: Array<{ mesh?: number; extras?: { nodeId?: string } }>;
  meshes?: Array<{ primitives: Array<{ attributes: { POSITION: number } }> }>;
  accessors?: Array<{ min?: number[]; max?: number[] }>;
};

/** Front-back coordinate (Z) of each node's bounding-box centre; region models win over the atlas. */
function frontBackByNodeId(): Map<string, number> {
  const out = new Map<string, number>();
  const files = ['fundamentals', 'torso', 'shoulder_neck', 'arm', 'hand', 'leg', 'foot', 'atlas_supplement'];
  for (const file of files) {
    const doc = readGlbJson(path.join(MODELS_DIR, `${file}.glb`)) as GlbDoc;
    for (const node of doc.nodes ?? []) {
      const nodeId = node.extras?.nodeId;
      if (node.mesh === undefined || !nodeId || out.has(nodeId)) continue;
      const accessor = doc.accessors?.[doc.meshes![node.mesh].primitives[0].attributes.POSITION];
      if (!accessor?.min || !accessor.max) continue;
      out.set(nodeId, (accessor.min[2] + accessor.max[2]) / 2);
    }
  }
  return out;
}

describe('muscle meshes sit on the correct side of the body', () => {
  const z = frontBackByNodeId();

  it.each(IN_FRONT_OF)('%s lies in front of %s', (front, back) => {
    expect(z.has(front), `${front} has no mesh`).toBe(true);
    expect(z.has(back), `${back} has no mesh`).toBe(true);
    expect(z.get(front)!).toBeGreaterThan(z.get(back)!);
  });
});
