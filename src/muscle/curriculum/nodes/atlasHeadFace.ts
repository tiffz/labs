import { bone, muscle } from '../nodeHelpers';

const ATLAS_CTX = {
  whyItMatters: 'Completes the head and face in the full-body atlas.',
  commonMistake: 'Study facial masses in the Shoulder & neck module for drawing notes.',
  movementEffect: 'Visible in Full body view only.',
};

/** Head and face structures missing from module curricula — full-body atlas fill. */
export const atlasHeadFaceNodes = [
  bone('bone_mandible', 'Mandible', 'shoulder_neck', 'box', ATLAS_CTX, {
    atlasOnly: true,
    cameraPresetKey: 'head',
  }),
  bone('bone_maxilla', 'Maxilla', 'shoulder_neck', 'box', ATLAS_CTX, {
    atlasOnly: true,
    cameraPresetKey: 'head',
  }),
  bone('bone_nasal', 'Nasal bone', 'shoulder_neck', 'box', ATLAS_CTX, {
    atlasOnly: true,
    cameraPresetKey: 'head',
  }),
  bone('bone_zygomatic', 'Zygomatic bone', 'shoulder_neck', 'box', ATLAS_CTX, {
    atlasOnly: true,
    cameraPresetKey: 'head',
  }),
  bone('bone_hyoid', 'Hyoid bone', 'shoulder_neck', 'box', ATLAS_CTX, {
    atlasOnly: true,
    cameraPresetKey: 'head',
  }),
  muscle('muscle_frontalis', 'Frontalis', 'shoulder_neck', 0, 'egg', ATLAS_CTX, {
    atlasOnly: true,
    cameraPresetKey: 'head',
  }),
  muscle('muscle_masseter', 'Masseter', 'shoulder_neck', 1, 'egg', ATLAS_CTX, {
    atlasOnly: true,
    cameraPresetKey: 'head',
  }),
  muscle('muscle_temporalis', 'Temporalis', 'shoulder_neck', 1, 'egg', ATLAS_CTX, {
    atlasOnly: true,
    cameraPresetKey: 'head',
  }),
  muscle('muscle_platysma', 'Platysma', 'shoulder_neck', 0, 'egg', ATLAS_CTX, {
    atlasOnly: true,
    cameraPresetKey: 'head',
  }),
  muscle('muscle_zygomaticus_major', 'Zygomaticus major', 'shoulder_neck', 0, 'egg', ATLAS_CTX, {
    atlasOnly: true,
    cameraPresetKey: 'head',
  }),
  muscle('muscle_zygomaticus_minor', 'Zygomaticus minor', 'shoulder_neck', 0, 'egg', ATLAS_CTX, {
    atlasOnly: true,
    cameraPresetKey: 'head',
  }),
  muscle('muscle_orbicularis_oris', 'Orbicularis oris', 'shoulder_neck', 0, 'egg', ATLAS_CTX, {
    atlasOnly: true,
    cameraPresetKey: 'head',
  }),
  muscle('muscle_orbicularis_oculi', 'Orbicularis oculi', 'shoulder_neck', 0, 'egg', ATLAS_CTX, {
    atlasOnly: true,
    cameraPresetKey: 'head',
  }),
  muscle('muscle_mentalis', 'Mentalis', 'shoulder_neck', 0, 'egg', ATLAS_CTX, {
    atlasOnly: true,
    cameraPresetKey: 'head',
  }),
  muscle('muscle_nasalis', 'Nasalis', 'shoulder_neck', 0, 'egg', ATLAS_CTX, {
    atlasOnly: true,
    cameraPresetKey: 'head',
  }),
  muscle('muscle_depressor_anguli_oris', 'Depressor anguli oris', 'shoulder_neck', 0, 'egg', ATLAS_CTX, {
    atlasOnly: true,
    cameraPresetKey: 'head',
  }),
  muscle('muscle_levator_labii_superioris', 'Levator labii superioris', 'shoulder_neck', 0, 'egg', ATLAS_CTX, {
    atlasOnly: true,
    cameraPresetKey: 'head',
  }),
  muscle('muscle_risorius', 'Risorius', 'shoulder_neck', 0, 'egg', ATLAS_CTX, {
    atlasOnly: true,
    cameraPresetKey: 'head',
  }),
  muscle('muscle_bucinator', 'Bucinator', 'shoulder_neck', 1, 'egg', ATLAS_CTX, {
    atlasOnly: true,
    cameraPresetKey: 'head',
  }),
  muscle('muscle_corrugator_supercilii', 'Corrugator supercilii', 'shoulder_neck', 0, 'egg', ATLAS_CTX, {
    atlasOnly: true,
    cameraPresetKey: 'head',
  }),
  muscle('muscle_depressor_labii_superioris', 'Depressor labii superioris', 'shoulder_neck', 0, 'egg', ATLAS_CTX, {
    atlasOnly: true,
    cameraPresetKey: 'head',
  }),
  muscle('muscle_depressor_septi_nasi', 'Depressor septi nasi', 'shoulder_neck', 0, 'egg', ATLAS_CTX, {
    atlasOnly: true,
    cameraPresetKey: 'head',
  }),
  muscle('muscle_levator_anguli_oris', 'Levator anguli oris', 'shoulder_neck', 0, 'egg', ATLAS_CTX, {
    atlasOnly: true,
    cameraPresetKey: 'head',
  }),
  muscle('muscle_levator_nasolabialis', 'Levator nasolabialis', 'shoulder_neck', 0, 'egg', ATLAS_CTX, {
    atlasOnly: true,
    cameraPresetKey: 'head',
  }),
  muscle('muscle_procerus', 'Procerus', 'shoulder_neck', 0, 'egg', ATLAS_CTX, {
    atlasOnly: true,
    cameraPresetKey: 'head',
  }),
];
