import { bone, joint, muscle } from '../nodeHelpers';

export const shoulderNeckNodes = [
  bone('bone_clavicle', 'Clavicle', 'shoulder_neck', 'cylinder', {
    layout: { position: [0.2, 1.55, 0.05], rotation: [0, 0, -0.25], scale: [0.35, 0.05, 0.05] },
    subcutaneousLandmarks: ['Acromion end'],
    cameraPresetKey: 'shoulder',
  }),
  bone('bone_scapula', 'Scapula', 'shoulder_neck', 'box', {
    layout: { position: [-0.08, 1.4, -0.12], scale: [0.22, 0.28, 0.04] },
    subcutaneousLandmarks: ['Spine of scapula', 'Acromion process'],
    cameraPresetKey: 'back',
  }),
  muscle('muscle_deltoid_anterior', 'Anterior deltoid', 'shoulder_neck', 0, 'egg', {
    originBoneId: 'bone_clavicle',
    insertionBoneId: 'bone_humerus',
    layout: { position: [0.38, 1.52, 0.12], scale: [0.18, 0.2, 0.14] },
    cameraPresetKey: 'shoulder',
  }),
  muscle('muscle_deltoid_lateral', 'Lateral deltoid', 'shoulder_neck', 0, 'egg', {
    layout: { position: [0.48, 1.5, 0], scale: [0.16, 0.22, 0.16] },
    cameraPresetKey: 'shoulder',
  }),
  muscle('muscle_deltoid_posterior', 'Posterior deltoid', 'shoulder_neck', 0, 'egg', {
    layout: { position: [0.35, 1.45, -0.1], scale: [0.16, 0.18, 0.12] },
    cameraPresetKey: 'back',
  }),
  muscle('muscle_trapezius_upper', 'Upper trapezius', 'shoulder_neck', 0, 'box', {
    layout: { position: [0.05, 1.75, -0.05], scale: [0.35, 0.15, 0.1] },
    cameraPresetKey: 'shoulder',
  }),
  muscle('muscle_sternocleidomastoid', 'Sternocleidomastoid', 'shoulder_neck', 0, 'cylinder', {
    layout: { position: [0.08, 1.85, 0.1], rotation: [0.2, 0, 0.15], scale: [0.06, 0.35, 0.06] },
    cameraPresetKey: 'head',
  }),
  joint('joint_sternoclavicular', 'Sternoclavicular joint', 'shoulder_neck', 'saddle', {
    layout: { position: [0, 1.52, 0.12], scale: [0.07, 0.07, 0.07] },
    cameraPresetKey: 'chest',
  }),
  joint('joint_acromioclavicular', 'Acromioclavicular joint', 'shoulder_neck', 'plane', {
    layout: { position: [0.28, 1.58, 0.02], scale: [0.06, 0.06, 0.06] },
    cameraPresetKey: 'shoulder',
  }),
];
