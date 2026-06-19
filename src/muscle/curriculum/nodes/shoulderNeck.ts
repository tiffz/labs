import { bone, joint, muscle } from '../nodeHelpers';

export const shoulderNeckNodes = [
  bone(
    'bone_clavicle',
    'Clavicle',
    'shoulder_neck',
    'cylinder',
    {
      whyItMatters: 'The clavicle bridges sternum to shoulder and sets collar width.',
      commonMistake: 'Horizontal collar bones on every pose. They pitch with shoulder movement.',
      movementEffect: 'Arm lift rotates the clavicle upward at the sternoclavicular joint.',
    },
    {
      layout: { position: [0.2, 1.55, 0.05], rotation: [0, 0, -0.25], scale: [0.35, 0.05, 0.05] },
      subcutaneousLandmarks: ['Acromion end'],
      cameraPresetKey: 'shoulder',
    },
  ),
  bone(
    'bone_scapula',
    'Scapula',
    'shoulder_neck',
    'box',
    {
      whyItMatters: 'The scapula is the shoulder blade platform for arm mechanics.',
      commonMistake: 'Visible scapula on every front view. It slides around the rib cage.',
      movementEffect: 'Protraction wraps the medial border around the ribs.',
    },
    {
      layout: { position: [-0.08, 1.4, -0.12], scale: [0.22, 0.28, 0.04] },
      subcutaneousLandmarks: ['Spine of scapula', 'Acromion process'],
      cameraPresetKey: 'back',
    },
  ),
  muscle(
    'muscle_deltoid_anterior',
    'Anterior deltoid',
    'shoulder_neck',
    0,
    'egg',
    {
      whyItMatters: 'Dictates the silhouette sweep of the front shoulder.',
      commonMistake: 'Drawing this symmetrically to the posterior head. It steps downward cascadingly.',
      movementEffect: 'When pronated, the radius crosses the ulna, forcing the muscle belly to twist.',
    },
    {
      originBoneId: 'bone_clavicle',
      insertionBoneId: 'bone_humerus',
      layout: { position: [0.38, 1.52, 0.12], scale: [0.18, 0.2, 0.14] },
      cameraPresetKey: 'shoulder',
    },
  ),
  muscle(
    'muscle_deltoid_lateral',
    'Lateral deltoid',
    'shoulder_neck',
    0,
    'egg',
    {
      whyItMatters: 'The lateral head gives the shoulder cap width in three-quarter views.',
      commonMistake: 'Perfect hemisphere shoulder. The cap is offset forward of the acromion.',
      movementEffect: 'Abduction lifts the lateral head highest at mid-range.',
    },
    {
      layout: { position: [0.48, 1.5, 0], scale: [0.16, 0.22, 0.16] },
      cameraPresetKey: 'shoulder',
    },
  ),
  muscle(
    'muscle_deltoid_posterior',
    'Posterior deltoid',
    'shoulder_neck',
    0,
    'egg',
    {
      whyItMatters: 'Completes the shoulder cap and reads in back three-quarter poses.',
      commonMistake: 'Mirroring the anterior head on the back. It is thinner and lower.',
      movementEffect: 'Horizontal extension opens the posterior deltoid against the scapula.',
    },
    {
      layout: { position: [0.35, 1.45, -0.1], scale: [0.16, 0.18, 0.12] },
      cameraPresetKey: 'back',
    },
  ),
  muscle(
    'muscle_trapezius_upper',
    'Upper trapezius',
    'shoulder_neck',
    0,
    'box',
    {
      whyItMatters: 'The upper trap bridges neck to shoulder and shapes the neckline.',
      commonMistake: 'Trap as a triangle on the back only. It wraps to the clavicle.',
      movementEffect: 'Shrugging elevates the scapula and bunches the upper trap.',
    },
    {
      layout: { position: [0.05, 1.75, -0.05], scale: [0.35, 0.15, 0.1] },
      cameraPresetKey: 'shoulder',
    },
  ),
  muscle(
    'muscle_sternocleidomastoid',
    'Sternocleidomastoid',
    'shoulder_neck',
    0,
    'cylinder',
    {
      whyItMatters: 'The SCM is a key neck landmark in three-quarter portraits.',
      commonMistake: 'Parallel neck straps. They form a V from sternum and clavicle to mastoid.',
      movementEffect: 'Head rotation away makes the opposite SCM prominent.',
    },
    {
      layout: { position: [0.08, 1.85, 0.1], rotation: [0.2, 0, 0.15], scale: [0.06, 0.35, 0.06] },
      cameraPresetKey: 'head',
    },
  ),
  joint(
    'joint_sternoclavicular',
    'Sternoclavicular joint',
    'shoulder_neck',
    'saddle',
    {
      whyItMatters: 'Where the shoulder girdle meets the torso; clavicle rotation starts here.',
      commonMistake: 'Drawing the clavicle attached at the shoulder instead of the sternum.',
      movementEffect: 'Elevation pivots the clavicle on the manubrium.',
    },
    {
      layout: { position: [0, 1.52, 0.12], scale: [0.07, 0.07, 0.07] },
      cameraPresetKey: 'chest',
    },
  ),
];
