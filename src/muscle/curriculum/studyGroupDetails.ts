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
  sn_deltoid: {
    definition:
      'The deltoid caps the shoulder in three regions — anterior, lateral, and posterior — abducting and rotating the arm.',
    colloquialNames: ['delts', 'deltoid'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Deltoid_muscle',
  },
  torso_pecs: {
    definition:
      'The pectoralis major (“pecs”) fans from the chest to the upper arm, adducting and medially rotating the humerus.',
    colloquialNames: ['pecs', 'chest muscle'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Pectoralis_major',
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
