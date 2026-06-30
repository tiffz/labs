import { bone, joint } from '../nodeHelpers';

export const fundamentalsNodes = [
  bone('bone_skull', 'Skull', 'fundamentals', 'egg', {
    layout: { position: [0, 2.2, 0], scale: [0.55, 0.65, 0.5] },
    cameraPresetKey: 'head',
  }),
  bone('bone_sternum', 'Sternum', 'fundamentals', 'box', {
    layout: { position: [0, 1.2, 0.15], scale: [0.12, 0.35, 0.08] },
    subcutaneousLandmarks: ['Manubrium'],
    cameraPresetKey: 'chest',
  }),
  bone('bone_ribcage', 'Rib cage', 'fundamentals', 'egg', {
    layout: { position: [0, 1.15, 0], scale: [0.5, 0.45, 0.35] },
    subcutaneousLandmarks: ['Costal arch'],
    cameraPresetKey: 'chest',
  }),
  bone('bone_spine', 'Vertebral column', 'fundamentals', 'cylinder', {
    layout: { position: [0, 1.0, -0.12], scale: [0.08, 0.9, 0.08] },
    subcutaneousLandmarks: ['C7 vertebra', 'Sacrum'],
    cameraPresetKey: 'back',
  }),
  bone('bone_pelvis', 'Pelvis', 'fundamentals', 'bucket', {
    layout: { position: [0, 0.2, 0], scale: [0.55, 0.25, 0.35] },
    subcutaneousLandmarks: ['ASIS', 'Iliac crest'],
    cameraPresetKey: 'pelvis',
  }),
  bone('bone_humerus', 'Humerus', 'fundamentals', 'cylinder', {
    layout: { position: [0.55, 1.35, 0], rotation: [0, 0, -0.35], scale: [0.12, 0.45, 0.12] },
    cameraPresetKey: 'arm',
  }),
  bone('bone_radius', 'Radius', 'fundamentals', 'cylinder', {
    layout: { position: [0.5, 0.75, 0.08], scale: [0.08, 0.35, 0.08] },
    cameraPresetKey: 'forearm',
  }),
  bone('bone_ulna', 'Ulna', 'fundamentals', 'cylinder', {
    layout: { position: [0.48, 0.75, -0.02], scale: [0.09, 0.36, 0.09] },
    subcutaneousLandmarks: ['Olecranon'],
    cameraPresetKey: 'forearm',
  }),
  bone('bone_femur', 'Femur', 'fundamentals', 'cylinder', {
    layout: { position: [0.18, -0.35, 0], scale: [0.14, 0.55, 0.14] },
    cameraPresetKey: 'leg',
  }),
  bone('bone_tibia', 'Tibia', 'fundamentals', 'cylinder', {
    layout: { position: [0.18, -1.05, 0.05], scale: [0.11, 0.5, 0.11] },
    subcutaneousLandmarks: ['Tibial tuberosity'],
    cameraPresetKey: 'leg',
  }),
  joint('joint_shoulder', 'Glenohumeral joint', 'fundamentals', 'ball_socket', {
    layout: { position: [0.42, 1.55, 0], scale: [0.1, 0.1, 0.1] },
    cameraPresetKey: 'shoulder',
  }),
  joint('joint_elbow', 'Elbow joint', 'fundamentals', 'hinge', {
    layout: { position: [0.52, 0.95, 0], scale: [0.09, 0.09, 0.09] },
    cameraPresetKey: 'elbow',
  }),
  joint('joint_hip', 'Hip joint', 'fundamentals', 'ball_socket', {
    layout: { position: [0.22, 0.05, 0], scale: [0.11, 0.11, 0.11] },
    cameraPresetKey: 'pelvis',
  }),
  joint('joint_knee', 'Knee joint', 'fundamentals', 'hinge', {
    layout: { position: [0.2, -0.65, 0.05], scale: [0.1, 0.1, 0.1] },
    cameraPresetKey: 'knee',
  }),
];
