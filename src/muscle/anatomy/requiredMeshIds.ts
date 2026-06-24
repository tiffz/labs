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
