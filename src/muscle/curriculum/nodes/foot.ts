import { bone, joint, muscle } from '../nodeHelpers';

export const footNodes = [
  bone('bone_calcaneus', 'Calcaneus', 'foot', 'box', {
    layout: { position: [0.2, -1.45, -0.06], scale: [0.08, 0.06, 0.12] },
    subcutaneousLandmarks: ['Calcaneal tuberosity'],
    cameraPresetKey: 'foot',
  }),
  bone('bone_talus', 'Talus', 'foot', 'egg', {
    layout: { position: [0.2, -1.38, 0.02], scale: [0.07, 0.05, 0.09] },
    cameraPresetKey: 'foot',
  }),
  bone('bone_tarsals', 'Tarsals', 'foot', 'box', {
    layout: { position: [0.22, -1.4, 0.04], scale: [0.12, 0.05, 0.1] },
    subcutaneousLandmarks: ['Navicular', 'Cuboid'],
    cameraPresetKey: 'foot',
  }),
  bone('bone_metatarsals', 'Metatarsals', 'foot', 'box', {
    layout: { position: [0.22, -1.42, 0.12], scale: [0.14, 0.04, 0.22] },
    cameraPresetKey: 'foot',
  }),
  bone('bone_phalanges_foot', 'Toe phalanges', 'foot', 'box', {
    layout: { position: [0.24, -1.43, 0.2], scale: [0.12, 0.03, 0.16] },
    cameraPresetKey: 'foot',
  }),
  muscle('muscle_abductor_hallucis', 'Abductor hallucis', 'foot', 1, 'cylinder', {
    layout: { position: [0.14, -1.42, 0.08], scale: [0.08, 0.04, 0.14] },
    cameraPresetKey: 'foot',
  }),
  muscle('muscle_flexor_digitorum_brevis', 'Flexor digitorum brevis', 'foot', 1, 'box', {
    layout: { position: [0.2, -1.41, 0.1], scale: [0.12, 0.03, 0.1] },
    cameraPresetKey: 'foot',
  }),
  muscle('muscle_lumbricals_foot', 'Lumbricals', 'foot', 1, 'cylinder', {
    layout: { position: [0.22, -1.4, 0.14], scale: [0.1, 0.03, 0.12] },
    cameraPresetKey: 'foot',
  }),
  muscle('muscle_extensor_digitorum_brevis', 'Extensor digitorum brevis', 'foot', 1, 'box', {
    layout: { position: [0.22, -1.4, 0.1], scale: [0.12, 0.04, 0.08] },
    cameraPresetKey: 'foot',
  }),
  muscle('muscle_peroneus_longus', 'Peroneus longus', 'foot', 1, 'cylinder', {
    layout: { position: [0.3, -1.35, -0.02], scale: [0.06, 0.2, 0.06] },
    cameraPresetKey: 'foot',
  }),
  joint('joint_ankle', 'Ankle joint', 'foot', 'hinge', {
    layout: { position: [0.2, -1.36, 0.04], scale: [0.07, 0.07, 0.07] },
    cameraPresetKey: 'foot',
  }),
  joint('joint_subtalar', 'Subtalar joint', 'foot', 'plane', {
    layout: { position: [0.2, -1.42, -0.02], scale: [0.06, 0.05, 0.06] },
    cameraPresetKey: 'foot',
  }),
];
