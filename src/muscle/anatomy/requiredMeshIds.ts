/** Browser-safe required mesh ids for debug UI and e2e (keep in sync with anatomyCoverageLedger). */

export const REQUIRED_FULL_BODY_BONE_IDS = [
  'bone_skull',
  'bone_ribcage',
  'bone_sternum',
  'bone_pelvis',
  'bone_humerus',
  'bone_radius',
  'bone_ulna',
  'bone_femur',
  'bone_tibia',
  'bone_calcaneus',
  'bone_talus',
  'bone_metatarsals',
] as const;

export const REQUIRED_SKIN_OVERLAY_NODE_IDS = [
  'skin_envelope',
  'eye_globes',
] as const;

/** Curriculum muscles that must resolve in Full body runtime mesh inventory (study view). */
export const REQUIRED_FULL_BODY_MUSCLE_IDS = [
  'muscle_platysma',
  'muscle_sternocleidomastoid',
  'muscle_trapezius_upper',
  'muscle_deltoid_anterior',
  'muscle_deltoid_lateral',
  'muscle_deltoid_posterior',
  'muscle_pectoralis_major',
  'muscle_external_oblique',
  'muscle_biceps_brachii',
  'muscle_rectus_abdominis',
] as const;
