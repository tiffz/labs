import { joint, muscle } from '../nodeHelpers';

export const armNodes = [
  muscle('muscle_biceps_brachii', 'Biceps brachii', 'arm', 0, 'egg', {
    originBoneId: 'bone_scapula',
    insertionBoneId: 'bone_radius',
    layout: { position: [0.55, 1.15, 0.1], scale: [0.14, 0.28, 0.12] },
    cameraPresetKey: 'arm',
  }),
  muscle('muscle_triceps_long_head', 'Triceps (long head)', 'arm', 1, 'egg', {
    originBoneId: 'bone_scapula',
    insertionBoneId: 'bone_ulna',
    layout: { position: [0.52, 1.1, -0.08], scale: [0.13, 0.3, 0.11] },
    cameraPresetKey: 'arm',
  }),
  muscle('muscle_brachialis', 'Brachialis', 'arm', 1, 'egg', {
    layout: { position: [0.54, 1.0, 0.02], scale: [0.11, 0.18, 0.1] },
    cameraPresetKey: 'elbow',
  }),
  muscle('muscle_brachioradialis', 'Brachioradialis', 'arm', 0, 'cylinder', {
    layout: { position: [0.58, 0.88, 0.05], rotation: [0, 0, -0.2], scale: [0.08, 0.22, 0.08] },
    cameraPresetKey: 'forearm',
  }),
  muscle('muscle_extensor_carpi_radialis', 'Extensor carpi radialis', 'arm', 0, 'cylinder', {
    layout: { position: [0.56, 0.72, -0.04], scale: [0.07, 0.28, 0.07] },
    cameraPresetKey: 'forearm',
  }),
  muscle('muscle_flexor_carpi_radialis', 'Flexor carpi radialis', 'arm', 1, 'cylinder', {
    layout: { position: [0.54, 0.7, 0.08], scale: [0.06, 0.26, 0.06] },
    cameraPresetKey: 'forearm',
  }),
  joint('joint_proximal_radioulnar', 'Proximal radioulnar joint', 'arm', 'pivot', {
    layout: { position: [0.56, 0.95, 0.04], scale: [0.06, 0.06, 0.06] },
    cameraPresetKey: 'elbow',
  }),
  joint('joint_wrist', 'Radiocarpal joint', 'arm', 'ellipsoid', {
    layout: { position: [0.58, 0.56, 0.05], scale: [0.06, 0.05, 0.06] },
    cameraPresetKey: 'hand',
  }),
];
