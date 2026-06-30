import { bone, muscle } from '../nodeHelpers';

const atlasExtras = { atlasOnly: true as const, cameraPresetKey: 'head' as const };

/** Head and face structures — full-body atlas fill (optional future head module). */
export const atlasHeadFaceNodes = [
  bone('bone_mandible', 'Mandible', 'shoulder_neck', 'box', atlasExtras),
  bone('bone_maxilla', 'Maxilla', 'shoulder_neck', 'box', atlasExtras),
  bone('bone_nasal', 'Nasal bone', 'shoulder_neck', 'box', atlasExtras),
  bone('bone_zygomatic', 'Zygomatic bone', 'shoulder_neck', 'box', atlasExtras),
  bone('bone_hyoid', 'Hyoid bone', 'shoulder_neck', 'box', atlasExtras),
  muscle('muscle_frontalis', 'Frontalis', 'shoulder_neck', 0, 'egg', atlasExtras),
  muscle('muscle_masseter', 'Masseter', 'shoulder_neck', 1, 'egg', atlasExtras),
  muscle('muscle_temporalis', 'Temporalis', 'shoulder_neck', 1, 'egg', atlasExtras),
  muscle('muscle_platysma', 'Platysma', 'shoulder_neck', 0, 'egg', atlasExtras),
  muscle('muscle_zygomaticus_major', 'Zygomaticus major', 'shoulder_neck', 0, 'egg', atlasExtras),
  muscle('muscle_zygomaticus_minor', 'Zygomaticus minor', 'shoulder_neck', 0, 'egg', atlasExtras),
  muscle('muscle_orbicularis_oris', 'Orbicularis oris', 'shoulder_neck', 0, 'egg', atlasExtras),
  muscle('muscle_orbicularis_oculi', 'Orbicularis oculi', 'shoulder_neck', 0, 'egg', atlasExtras),
  muscle('muscle_mentalis', 'Mentalis', 'shoulder_neck', 0, 'egg', atlasExtras),
  muscle('muscle_nasalis', 'Nasalis', 'shoulder_neck', 0, 'egg', atlasExtras),
  muscle('muscle_depressor_anguli_oris', 'Depressor anguli oris', 'shoulder_neck', 0, 'egg', atlasExtras),
  muscle('muscle_levator_labii_superioris', 'Levator labii superioris', 'shoulder_neck', 0, 'egg', atlasExtras),
  muscle('muscle_risorius', 'Risorius', 'shoulder_neck', 0, 'egg', atlasExtras),
  muscle('muscle_bucinator', 'Bucinator', 'shoulder_neck', 1, 'egg', atlasExtras),
  muscle('muscle_corrugator_supercilii', 'Corrugator supercilii', 'shoulder_neck', 0, 'egg', atlasExtras),
  muscle('muscle_depressor_labii_superioris', 'Depressor labii superioris', 'shoulder_neck', 0, 'egg', atlasExtras),
  muscle('muscle_depressor_septi_nasi', 'Depressor septi nasi', 'shoulder_neck', 0, 'egg', atlasExtras),
  muscle('muscle_levator_anguli_oris', 'Levator anguli oris', 'shoulder_neck', 0, 'egg', atlasExtras),
  muscle('muscle_levator_nasolabialis', 'Levator nasolabialis', 'shoulder_neck', 0, 'egg', atlasExtras),
  muscle('muscle_procerus', 'Procerus', 'shoulder_neck', 0, 'egg', atlasExtras),
];
