import type { MuscleRegion } from '../types/node';

export interface ArtistStudyEntry {
  id: string;
  displayName: string;
  moduleId: MuscleRegion;
  studyGroupPath: string[];
  defaultVisible: boolean;
  quizEligible: boolean;
  prokoLessonRef?: string;
  afsChapterTag?: string;
  colloquialNames?: string[];
}

/** Ordered guided path (excludes full_body reference). */
export const GUIDED_MODULE_SEQUENCE: MuscleRegion[] = [
  'anatomy_terms',
  'fundamentals',
  'torso',
  'shoulder_neck',
  'arm',
  'hand',
  'leg',
  'foot',
];

/** Promote from atlas supplement into default study decks. */
export const PROMOTE_TO_STUDY: string[] = [
  'muscle_gluteus_maximus',
  'muscle_gluteus_medius',
  'muscle_gluteus_minimus',
  'muscle_tensor_fasciae_latae',
  'muscle_adductor_longus',
  'muscle_rhomboid_major',
  'muscle_infraspinatus',
  'muscle_teres_major',
  'muscle_supraspinatus',
];

/** Stay atlas-only — clinical subdivisions without distinct artist silhouette. */
export const RETIRE_OR_ATLAS_ONLY: string[] = [
  'muscle_vastus_medialis',
  'muscle_vastus_intermedius',
  'muscle_piriformis',
  'muscle_gemellus_superior',
  'muscle_gemellus_inferior',
  'muscle_quadratus_femoris',
  'muscle_obturator_internus',
];

export const ARTIST_STUDY_MANIFEST: ArtistStudyEntry[] = [
  // Fundamentals — grouped by region (study group path)
  { id: 'bone_skull', displayName: 'Skull', moduleId: 'fundamentals', studyGroupPath: ['Head & neck', 'Bones'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Shoulder Bones / Portrait structure', afsChapterTag: 'Form of the Head & Neck' },
  { id: 'bone_sternum', displayName: 'Sternum', moduleId: 'fundamentals', studyGroupPath: ['Torso core', 'Bones'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Rib Cage', afsChapterTag: 'Understanding the Human Figure — Torso' },
  { id: 'bone_ribcage', displayName: 'Rib cage', moduleId: 'fundamentals', studyGroupPath: ['Torso core', 'Bones'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Rib Cage', afsChapterTag: 'Understanding the Human Figure — Torso' },
  { id: 'bone_spine', displayName: 'Vertebral column', moduleId: 'fundamentals', studyGroupPath: ['Torso core', 'Bones'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Rib Cage', afsChapterTag: 'Understanding the Human Figure — Torso', colloquialNames: ['spine', 'backbone'] },
  { id: 'bone_pelvis', displayName: 'Pelvis', moduleId: 'fundamentals', studyGroupPath: ['Torso core', 'Bones'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Pelvis', afsChapterTag: 'Understanding the Human Figure — Pelvis' },
  { id: 'bone_humerus', displayName: 'Humerus', moduleId: 'fundamentals', studyGroupPath: ['Arm', 'Bones'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Shoulder Bones', afsChapterTag: 'Arm and Hand in Motion' },
  { id: 'bone_radius', displayName: 'Radius', moduleId: 'fundamentals', studyGroupPath: ['Arm', 'Bones'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Types of Joints — pronation', afsChapterTag: 'Arm and Hand in Motion' },
  { id: 'bone_ulna', displayName: 'Ulna', moduleId: 'fundamentals', studyGroupPath: ['Arm', 'Bones'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Types of Joints — elbow', afsChapterTag: 'Arm and Hand in Motion' },
  { id: 'bone_femur', displayName: 'Femur', moduleId: 'fundamentals', studyGroupPath: ['Leg', 'Bones'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Legs — bone structure', afsChapterTag: 'Understanding the Human Figure — Legs' },
  { id: 'bone_tibia', displayName: 'Tibia', moduleId: 'fundamentals', studyGroupPath: ['Leg', 'Bones'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Legs — bone structure', afsChapterTag: 'Understanding the Human Figure — Legs' },
  { id: 'joint_shoulder', displayName: 'Glenohumeral joint', moduleId: 'fundamentals', studyGroupPath: ['Arm', 'Joints'], defaultVisible: true, quizEligible: false, prokoLessonRef: 'The 6 Types of Joints' },
  { id: 'joint_elbow', displayName: 'Elbow joint', moduleId: 'fundamentals', studyGroupPath: ['Arm', 'Joints'], defaultVisible: true, quizEligible: false, prokoLessonRef: 'The 6 Types of Joints' },
  { id: 'joint_hip', displayName: 'Hip joint', moduleId: 'fundamentals', studyGroupPath: ['Leg', 'Joints'], defaultVisible: true, quizEligible: false, prokoLessonRef: 'The 6 Types of Joints' },
  { id: 'joint_knee', displayName: 'Knee joint', moduleId: 'fundamentals', studyGroupPath: ['Leg', 'Joints'], defaultVisible: true, quizEligible: false, prokoLessonRef: 'The 6 Types of Joints' },
  // Torso
  { id: 'muscle_pectoralis_major', displayName: 'Pectoralis major', moduleId: 'torso', studyGroupPath: ['Front torso'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Pecs & Breasts', colloquialNames: ['pecs'] },
  { id: 'muscle_rectus_abdominis', displayName: 'Rectus abdominis', moduleId: 'torso', studyGroupPath: ['Front torso'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Abs', colloquialNames: ['abs'] },
  { id: 'muscle_external_oblique', displayName: 'External oblique', moduleId: 'torso', studyGroupPath: ['Front torso'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Obliques', colloquialNames: ['obliques'] },
  { id: 'muscle_serratus_anterior', displayName: 'Serratus anterior', moduleId: 'torso', studyGroupPath: ['Front torso'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Torso Drawing' },
  { id: 'muscle_latissimus_dorsi', displayName: 'Latissimus dorsi', moduleId: 'torso', studyGroupPath: ['Back torso'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Upper Back Muscles', colloquialNames: ['lats'] },
  { id: 'muscle_erector_spinae', displayName: 'Erector spinae group', moduleId: 'torso', studyGroupPath: ['Back torso'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Lower Back Muscles' },
  // Shoulder & neck
  { id: 'bone_clavicle', displayName: 'Clavicle', moduleId: 'shoulder_neck', studyGroupPath: ['Shoulder girdle', 'Bones'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Shoulder Bones', colloquialNames: ['collarbone'] },
  { id: 'bone_scapula', displayName: 'Scapula', moduleId: 'shoulder_neck', studyGroupPath: ['Shoulder girdle', 'Bones'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Shoulder Bones', colloquialNames: ['shoulder blade'] },
  { id: 'muscle_deltoid_anterior', displayName: 'Anterior deltoid', moduleId: 'shoulder_neck', studyGroupPath: ['Deltoid'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Shoulder Muscles' },
  { id: 'muscle_deltoid_lateral', displayName: 'Lateral deltoid', moduleId: 'shoulder_neck', studyGroupPath: ['Deltoid'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Shoulder Muscles' },
  { id: 'muscle_deltoid_posterior', displayName: 'Posterior deltoid', moduleId: 'shoulder_neck', studyGroupPath: ['Deltoid'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Shoulder Muscles' },
  { id: 'muscle_trapezius_upper', displayName: 'Upper trapezius', moduleId: 'shoulder_neck', studyGroupPath: ['Neck & upper back'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Neck Muscles', colloquialNames: ['traps'] },
  { id: 'muscle_sternocleidomastoid', displayName: 'Sternocleidomastoid', moduleId: 'shoulder_neck', studyGroupPath: ['Neck & upper back'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Neck Muscles', colloquialNames: ['SCM'] },
  { id: 'joint_sternoclavicular', displayName: 'Sternoclavicular joint', moduleId: 'shoulder_neck', studyGroupPath: ['Shoulder girdle', 'Joints'], defaultVisible: true, quizEligible: false, prokoLessonRef: 'Shoulder Bones' },
  { id: 'muscle_rhomboid_major', displayName: 'Rhomboid major', moduleId: 'shoulder_neck', studyGroupPath: ['Neck & upper back'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Upper Back Muscles' },
  { id: 'muscle_infraspinatus', displayName: 'Infraspinatus', moduleId: 'shoulder_neck', studyGroupPath: ['Rotator cuff'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Shoulder Muscles' },
  { id: 'muscle_teres_major', displayName: 'Teres major', moduleId: 'shoulder_neck', studyGroupPath: ['Rotator cuff'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Shoulder Muscles' },
  { id: 'muscle_supraspinatus', displayName: 'Supraspinatus', moduleId: 'shoulder_neck', studyGroupPath: ['Rotator cuff'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Shoulder Muscles' },
  // Arm
  { id: 'muscle_biceps_brachii', displayName: 'Biceps brachii', moduleId: 'arm', studyGroupPath: ['Upper arm'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Arms', afsChapterTag: 'Arm and Hand in Motion' },
  { id: 'muscle_triceps_long_head', displayName: 'Triceps (long head)', moduleId: 'arm', studyGroupPath: ['Upper arm'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Arms' },
  { id: 'muscle_brachialis', displayName: 'Brachialis', moduleId: 'arm', studyGroupPath: ['Upper arm'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Arms' },
  { id: 'muscle_brachioradialis', displayName: 'Brachioradialis', moduleId: 'arm', studyGroupPath: ['Forearm'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Arms' },
  { id: 'muscle_extensor_carpi_radialis', displayName: 'Extensor carpi radialis', moduleId: 'arm', studyGroupPath: ['Forearm'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Arms' },
  { id: 'muscle_flexor_carpi_radialis', displayName: 'Flexor carpi radialis', moduleId: 'arm', studyGroupPath: ['Forearm'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Arms' },
  // Hand
  { id: 'bone_carpals', displayName: 'Carpals', moduleId: 'hand', studyGroupPath: ['Bones'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Hands', afsChapterTag: 'Arm and Hand in Motion' },
  { id: 'bone_metacarpals', displayName: 'Metacarpals', moduleId: 'hand', studyGroupPath: ['Bones'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Hands', afsChapterTag: 'Arm and Hand in Motion' },
  { id: 'bone_phalanges_hand', displayName: 'Finger phalanges', moduleId: 'hand', studyGroupPath: ['Bones'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Hands', afsChapterTag: 'Arm and Hand in Motion' },
  { id: 'muscle_thenar_eminence', displayName: 'Thenar eminence', moduleId: 'hand', studyGroupPath: ['Palm masses'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Hands' },
  { id: 'muscle_hypothenar_eminence', displayName: 'Hypothenar eminence', moduleId: 'hand', studyGroupPath: ['Palm masses'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Hands' },
  { id: 'muscle_flexor_pollicis_brevis', displayName: 'Flexor pollicis brevis', moduleId: 'hand', studyGroupPath: ['Palm masses'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Hands' },
  { id: 'muscle_lumbricals_hand', displayName: 'Lumbricals', moduleId: 'hand', studyGroupPath: ['Intrinsic muscles'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Hands' },
  { id: 'muscle_dorsal_interossei_hand', displayName: 'Dorsal interossei', moduleId: 'hand', studyGroupPath: ['Intrinsic muscles'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Hands' },
  { id: 'muscle_flexor_digitorum_superficialis', displayName: 'Flexor digitorum superficialis', moduleId: 'hand', studyGroupPath: ['Tendons'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Hands' },
  { id: 'muscle_extensor_digitorum', displayName: 'Extensor digitorum', moduleId: 'hand', studyGroupPath: ['Tendons'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Hands' },
  // Leg
  { id: 'bone_patella', displayName: 'Patella', moduleId: 'leg', studyGroupPath: ['Bones'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Legs', colloquialNames: ['kneecap'] },
  { id: 'muscle_quadriceps_rectus_femoris', displayName: 'Rectus femoris', moduleId: 'leg', studyGroupPath: ['Front thigh'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Legs', colloquialNames: ['quads'] },
  { id: 'muscle_vastus_lateralis', displayName: 'Vastus lateralis', moduleId: 'leg', studyGroupPath: ['Front thigh'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Legs', colloquialNames: ['quads'] },
  { id: 'muscle_hamstrings_biceps_femoris', displayName: 'Biceps femoris', moduleId: 'leg', studyGroupPath: ['Back thigh'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Legs', colloquialNames: ['hamstrings'] },
  { id: 'muscle_gastrocnemius', displayName: 'Gastrocnemius', moduleId: 'leg', studyGroupPath: ['Calf'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Legs', colloquialNames: ['calf'] },
  { id: 'muscle_tibialis_anterior', displayName: 'Tibialis anterior', moduleId: 'leg', studyGroupPath: ['Shin'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Legs' },
  { id: 'muscle_gluteus_maximus', displayName: 'Gluteus maximus', moduleId: 'leg', studyGroupPath: ['Hip & butt'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Legs', colloquialNames: ['glutes'] },
  { id: 'muscle_gluteus_medius', displayName: 'Gluteus medius', moduleId: 'leg', studyGroupPath: ['Hip & butt'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Legs', colloquialNames: ['glutes'] },
  { id: 'muscle_gluteus_minimus', displayName: 'Gluteus minimus', moduleId: 'leg', studyGroupPath: ['Hip & butt'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Legs' },
  { id: 'muscle_tensor_fasciae_latae', displayName: 'Tensor fasciae latae', moduleId: 'leg', studyGroupPath: ['Hip & butt'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Legs', colloquialNames: ['TFL'] },
  { id: 'muscle_adductor_longus', displayName: 'Adductor longus', moduleId: 'leg', studyGroupPath: ['Inner thigh'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Legs', colloquialNames: ['adductors'] },
  // Foot
  { id: 'bone_calcaneus', displayName: 'Calcaneus', moduleId: 'foot', studyGroupPath: ['Bones'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Feet', colloquialNames: ['heel bone'] },
  { id: 'bone_talus', displayName: 'Talus', moduleId: 'foot', studyGroupPath: ['Bones'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Feet' },
  { id: 'bone_tarsals', displayName: 'Tarsals', moduleId: 'foot', studyGroupPath: ['Bones'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Feet' },
  { id: 'bone_metatarsals', displayName: 'Metatarsals', moduleId: 'foot', studyGroupPath: ['Bones'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Feet' },
  { id: 'bone_phalanges_foot', displayName: 'Toe phalanges', moduleId: 'foot', studyGroupPath: ['Bones'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Feet' },
  { id: 'muscle_abductor_hallucis', displayName: 'Abductor hallucis', moduleId: 'foot', studyGroupPath: ['Arch & sole'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Feet' },
  { id: 'muscle_flexor_digitorum_brevis', displayName: 'Flexor digitorum brevis', moduleId: 'foot', studyGroupPath: ['Arch & sole'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Feet' },
  { id: 'muscle_lumbricals_foot', displayName: 'Lumbricals', moduleId: 'foot', studyGroupPath: ['Arch & sole'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Feet' },
  { id: 'muscle_extensor_digitorum_brevis', displayName: 'Extensor digitorum brevis', moduleId: 'foot', studyGroupPath: ['Dorsal foot'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Feet' },
  { id: 'muscle_peroneus_longus', displayName: 'Peroneus longus', moduleId: 'foot', studyGroupPath: ['Lateral ankle'], defaultVisible: true, quizEligible: true, prokoLessonRef: 'Feet' },
];

export const ARTIST_STUDY_BY_ID = new Map(ARTIST_STUDY_MANIFEST.map((e) => [e.id, e]));

export function getArtistStudyEntry(nodeId: string): ArtistStudyEntry | undefined {
  return ARTIST_STUDY_BY_ID.get(nodeId);
}

export function recommendedNextModule(completedModules: Set<MuscleRegion>): MuscleRegion | null {
  for (const mod of GUIDED_MODULE_SEQUENCE) {
    if (!completedModules.has(mod)) return mod;
  }
  return null;
}
