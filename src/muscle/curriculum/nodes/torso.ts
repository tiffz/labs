import { bone, muscle } from '../nodeHelpers';

export const torsoNodes = [
  bone(
    'bone_ribcage',
    'Rib cage',
    'torso',
    'egg',
    {
      whyItMatters: 'The rib cage sets thoracic width and the oblique wrap of the torso.',
      commonMistake: 'Flat front plane. Ribs arc back and down from the sternum.',
      movementEffect: 'Breathing expands the lower ribs laterally more than the upper ribs.',
    },
    {
      layout: { position: [0, 1.15, 0], scale: [0.5, 0.45, 0.35] },
      cameraPresetKey: 'chest',
    },
  ),
  muscle(
    'muscle_rectus_abdominis',
    'Rectus abdominis',
    'torso',
    0,
    'box',
    {
      whyItMatters: 'The six-pack rhythm gives the front torso segmentation artists use for twist.',
      commonMistake: 'Symmetrical bricks on a turned torso. Segments compress on the near side.',
      movementEffect: 'Trunk flexion shortens the rectus and pulls the rib cage toward the pelvis.',
    },
    {
      originBoneId: 'bone_sternum',
      insertionBoneId: 'bone_pelvis',
      layout: { position: [0, 0.75, 0.18], scale: [0.22, 0.55, 0.08] },
      cameraPresetKey: 'chest',
    },
  ),
  muscle(
    'muscle_external_oblique',
    'External oblique',
    'torso',
    0,
    'box',
    {
      whyItMatters: 'Obliques wrap the waist and sell contrapposto compression.',
      commonMistake: 'Vertical side abs. Fibers run diagonally down toward the midline.',
      movementEffect: 'Lateral flexion thickens the oblique on the compressed side.',
    },
    {
      layout: { position: [0.28, 0.7, 0.1], scale: [0.15, 0.4, 0.2] },
      cameraPresetKey: 'chest',
    },
  ),
  muscle(
    'muscle_serratus_anterior',
    'Serratus anterior',
    'torso',
    1,
    'box',
    {
      whyItMatters: 'The serratus fingers show on lean physiques and anchor the scapula.',
      commonMistake: 'Drawing teeth on the wrong side during protraction.',
      movementEffect: 'Punching motions protract the scapula and lift the lower serratus fingers.',
    },
    {
      layout: { position: [0.32, 1.05, 0.12], scale: [0.12, 0.25, 0.06] },
      cameraPresetKey: 'chest',
    },
  ),
  muscle(
    'muscle_latissimus_dorsi',
    'Latissimus dorsi',
    'torso',
    1,
    'box',
    {
      whyItMatters: 'The lat creates the back wing and armpit shadow in poses.',
      commonMistake: 'Lat as a flat triangle. It wraps from spine to humerus.',
      movementEffect: 'Adduction pulls the arm down and flattens the lat against the ribs.',
    },
    {
      originBoneId: 'bone_pelvis',
      insertionBoneId: 'bone_humerus',
      layout: { position: [-0.15, 0.95, -0.12], scale: [0.35, 0.35, 0.12] },
      cameraPresetKey: 'back',
    },
  ),
  muscle(
    'muscle_erector_spinae',
    'Erector spinae group',
    'torso',
    1,
    'cylinder',
    {
      whyItMatters: 'The spinal column mass reads in back views and heavy lifts.',
      commonMistake: 'Single tube spine. Split into two columns with a valley.',
      movementEffect: 'Extension thickens the erectors along the lumbar region.',
    },
    {
      layout: { position: [0, 1.0, -0.15], scale: [0.12, 0.55, 0.1] },
      cameraPresetKey: 'back',
    },
  ),
  muscle(
    'muscle_pectoralis_major',
    'Pectoralis major',
    'torso',
    0,
    'box',
    {
      whyItMatters: 'The pec mass shapes the front chest and arm connection.',
      commonMistake: 'Pec fibers running vertically. They fan from sternum to humerus.',
      movementEffect: 'Horizontal adduction closes the arms and bunches the pec.',
    },
    {
      originBoneId: 'bone_sternum',
      insertionBoneId: 'bone_humerus',
      layout: { position: [0.18, 1.25, 0.14], scale: [0.28, 0.22, 0.1] },
      cameraPresetKey: 'chest',
    },
  ),
];
