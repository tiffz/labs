import type { StructureDetails } from '../types/node';

/** Artist-facing group summaries — shown when a study group is highlighted before drilling into members. */
export const STUDY_GROUP_DETAILS: Record<string, StructureDetails> = {
  leg_quads: {
    definition:
      'The quadriceps femoris (“quads”) extend the knee and include four muscles on the front thigh: rectus femoris, vastus lateralis, vastus medialis, and vastus intermedius.',
    colloquialNames: ['quads', 'quadriceps'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Quadriceps_femoris_muscle',
  },
  leg_hamstrings: {
    definition:
      'The hamstrings flex the knee and extend the hip on the back thigh — biceps femoris, semitendinosus, and semimembranosus.',
    colloquialNames: ['hamstrings'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Hamstring',
  },
  leg_gluteal: {
    definition:
      'The gluteal muscles form the buttock mass — gluteus maximus (powerful hip extensor), gluteus medius, and gluteus minimus (hip abductors and stabilizers).',
    colloquialNames: ['glutes', 'gluteal muscles'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Gluteal_muscles',
  },
  sn_deltoid: {
    definition:
      'The deltoid caps the shoulder in three regions — anterior, lateral, and posterior — abducting and rotating the arm.',
    colloquialNames: ['delts', 'deltoid'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Deltoid_muscle',
  },
  sn_rotator_cuff: {
    definition:
      'The rotator cuff stabilizes the glenohumeral joint — supraspinatus initiates abduction; infraspinatus externally rotates the arm.',
    colloquialNames: ['rotator cuff'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Rotator_cuff',
  },
  hand_thenar: {
    definition:
      'Thenar muscles form the thumb pad at the base of the palm — opponens pollicis, abductor pollicis brevis, and flexor pollicis brevis work together.',
    colloquialNames: ['thenar eminence', 'thenar muscles'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Thenar_eminence',
  },
  hand_intrinsic: {
    definition:
      'Intrinsic muscles of the hand lie entirely within the palm and digits — lumbricals flex the metacarpophalangeal joints; dorsal interossei spread the fingers.',
    colloquialNames: ['intrinsic hand muscles'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Intrinsic_muscles_of_the_hand',
  },
  fund_spine_group: {
    definition:
      'The vertebral column (“spine”) stacks vertebrae from skull to pelvis, protecting the spinal cord and allowing trunk movement.',
    colloquialNames: ['spine', 'backbone'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Vertebral_column',
  },
};

export function getStudyGroupDetails(groupId: string): StructureDetails | undefined {
  return STUDY_GROUP_DETAILS[groupId];
}
