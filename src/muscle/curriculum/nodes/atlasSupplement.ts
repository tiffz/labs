import { muscle } from '../nodeHelpers';

/** Study-deck muscles promoted from atlas supplement (Phase 5). */
const PROMOTED_LEG = [
  ['muscle_gluteus_maximus', 'Gluteus maximus', 0, 'pelvis'] as const,
  ['muscle_gluteus_medius', 'Gluteus medius', 1, 'pelvis'] as const,
  ['muscle_gluteus_minimus', 'Gluteus minimus', 2, 'pelvis'] as const,
  ['muscle_tensor_fasciae_latae', 'Tensor fasciae latae', 0, 'pelvis'] as const,
  ['muscle_adductor_longus', 'Adductor longus', 1, 'leg'] as const,
  ['muscle_vastus_medialis', 'Vastus medialis', 0, 'leg'] as const,
  ['muscle_vastus_intermedius', 'Vastus intermedius', 2, 'leg'] as const,
  ['muscle_semitendinosus', 'Semitendinosus', 0, 'leg'] as const,
  ['muscle_semimembranosus', 'Semimembranosus', 1, 'leg'] as const,
] as const;

const PROMOTED_SHOULDER = [
  ['muscle_rhomboid_major', 'Rhomboid major', 1, 'back'] as const,
  ['muscle_infraspinatus', 'Infraspinatus', 2, 'back'] as const,
  ['muscle_teres_major', 'Teres major', 1, 'back'] as const,
  ['muscle_supraspinatus', 'Supraspinatus', 2, 'shoulder'] as const,
] as const;

/** Deep / clinical muscles — atlas reference only. */
const ATLAS_ONLY_LEG = [
  ['muscle_piriformis', 'Piriformis', 2, 'pelvis'],
  ['muscle_gemellus_superior', 'Superior gemellus', 2, 'pelvis'],
  ['muscle_gemellus_inferior', 'Inferior gemellus', 2, 'pelvis'],
  ['muscle_quadratus_femoris', 'Quadratus femoris', 2, 'pelvis'],
  ['muscle_obturator_internus', 'Obturator internus', 2, 'pelvis'],
  ['muscle_soleus', 'Soleus', 1, 'leg'],
  ['muscle_gracilis', 'Gracilis', 1, 'leg'],
  ['muscle_sartorius', 'Sartorius', 0, 'leg'],
] as const;

const ATLAS_ONLY_NECK = [
  ['muscle_splenius_capitis', 'Splenius capitis', 1, 'head'],
  ['muscle_omohyoid', 'Omohyoid', 1, 'head'],
] as const;

export const atlasSupplementNodes = [
  ...PROMOTED_LEG.map(([id, name, layer, preset]) =>
    muscle(id, name, 'leg', layer, 'egg', { cameraPresetKey: preset }),
  ),
  ...PROMOTED_SHOULDER.map(([id, name, layer, preset]) =>
    muscle(id, name, 'shoulder_neck', layer, 'egg', { cameraPresetKey: preset }),
  ),
  ...ATLAS_ONLY_LEG.map(([id, name, layer, preset]) =>
    muscle(id, name, 'leg', layer, 'egg', { atlasOnly: true, cameraPresetKey: preset }),
  ),
  ...ATLAS_ONLY_NECK.map(([id, name, layer, preset]) =>
    muscle(id, name, 'shoulder_neck', layer, 'egg', { atlasOnly: true, cameraPresetKey: preset }),
  ),
];
