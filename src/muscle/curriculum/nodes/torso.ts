import { muscle } from '../nodeHelpers';

export const torsoNodes = [
  muscle('muscle_rectus_abdominis', 'Rectus abdominis', 'torso', 0, 'box', {
    originBoneId: 'bone_sternum',
    insertionBoneId: 'bone_pelvis',
    layout: { position: [0, 0.75, 0.18], scale: [0.22, 0.55, 0.08] },
    cameraPresetKey: 'chest',
  }),
  muscle('muscle_external_oblique', 'External oblique', 'torso', 0, 'box', {
    layout: { position: [0.28, 0.7, 0.1], scale: [0.15, 0.4, 0.2] },
    cameraPresetKey: 'chest',
  }),
  muscle('muscle_serratus_anterior', 'Serratus anterior', 'torso', 1, 'box', {
    layout: { position: [0.32, 1.05, 0.12], scale: [0.12, 0.25, 0.06] },
    cameraPresetKey: 'chest',
  }),
  muscle('muscle_latissimus_dorsi', 'Latissimus dorsi', 'torso', 1, 'box', {
    originBoneId: 'bone_pelvis',
    insertionBoneId: 'bone_humerus',
    layout: { position: [-0.15, 0.95, -0.12], scale: [0.35, 0.35, 0.12] },
    cameraPresetKey: 'back',
  }),
  muscle('muscle_erector_spinae', 'Erector spinae group', 'torso', 1, 'cylinder', {
    layout: { position: [0, 1.0, -0.15], scale: [0.12, 0.55, 0.1] },
    cameraPresetKey: 'back',
  }),
  muscle('muscle_pectoralis_major', 'Pectoralis major', 'torso', 0, 'box', {
    originBoneId: 'bone_sternum',
    insertionBoneId: 'bone_humerus',
    layout: { position: [0.18, 1.25, 0.14], scale: [0.28, 0.22, 0.1] },
    cameraPresetKey: 'chest',
  }),
];
