import { describe, expect, it } from 'vitest';
import { ALL_NODES } from './index';

/**
 * Origin → insertion ground truth, read from each muscle's Wikipedia infobox
 * (Gray's-derived) on 2026-10-26. The canvas draws an arrow from origin to
 * insertion, so a swapped pair teaches the muscle backwards.
 *
 * Every node that claims attachments must be listed here, so a new claim
 * cannot ship without someone checking it against a source.
 */
const VERIFIED_ATTACHMENTS: Record<string, { origin: string; insertion: string; source: string }> = {
  muscle_rectus_abdominis: {
    origin: 'bone_pelvis',
    insertion: 'bone_sternum',
    source: 'Pubic crest → xiphoid process and costal cartilages 5–7',
  },
  muscle_latissimus_dorsi: {
    origin: 'bone_pelvis',
    insertion: 'bone_humerus',
    source: 'Iliac crest (also T7–S5 spines, lower ribs) → intertubercular groove of humerus',
  },
  muscle_pectoralis_major: {
    origin: 'bone_sternum',
    insertion: 'bone_humerus',
    source: 'Sternum, costal cartilages, medial clavicle → lateral lip of bicipital groove',
  },
  muscle_deltoid_anterior: {
    origin: 'bone_clavicle',
    insertion: 'bone_humerus',
    source: 'Lateral third of clavicle → deltoid tuberosity',
  },
  muscle_biceps_brachii: {
    origin: 'bone_scapula',
    insertion: 'bone_radius',
    source: 'Coracoid process and supraglenoid tubercle → radial tuberosity',
  },
  muscle_triceps_long_head: {
    origin: 'bone_scapula',
    insertion: 'bone_ulna',
    source: 'Infraglenoid tubercle → olecranon',
  },
  muscle_triceps_lateral_head: {
    origin: 'bone_humerus',
    insertion: 'bone_ulna',
    source: 'Humerus above the radial groove → olecranon',
  },
  muscle_triceps_medial_head: {
    origin: 'bone_humerus',
    insertion: 'bone_ulna',
    source: 'Humerus below the radial groove → olecranon',
  },
  muscle_quadriceps_rectus_femoris: {
    origin: 'bone_pelvis',
    insertion: 'bone_patella',
    source: 'Anterior inferior iliac spine → patella via quadriceps tendon',
  },
};

describe('muscle attachment facts', () => {
  const claimed = ALL_NODES.filter((n) => n.originBoneId || n.insertionBoneId);

  it('finds attachment claims to check', () => {
    expect(claimed.length).toBeGreaterThan(0);
  });

  it('lists every attachment claim in the verified table', () => {
    expect(claimed.map((n) => n.id).sort()).toEqual(Object.keys(VERIFIED_ATTACHMENTS).sort());
  });

  it.each(Object.entries(VERIFIED_ATTACHMENTS))('%s runs origin → insertion per source', (id, fact) => {
    const node = ALL_NODES.find((n) => n.id === id);
    expect({ origin: node?.originBoneId, insertion: node?.insertionBoneId }).toEqual({
      origin: fact.origin,
      insertion: fact.insertion,
    });
  });
});
