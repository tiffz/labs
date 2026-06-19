import { muscle } from '../nodeHelpers';

export const armNodes = [
  muscle(
    'muscle_biceps_brachii',
    'Biceps brachii',
    'arm',
    0,
    'egg',
    {
      whyItMatters: 'The biceps short head shapes the front arm mass and elbow fold.',
      commonMistake: 'Two equal biceps heads on every view. The short head sits medial.',
      movementEffect: 'Flexion bunches the biceps and exposes the brachialis beneath.',
    },
    {
      originBoneId: 'bone_scapula',
      insertionBoneId: 'bone_radius',
      layout: { position: [0.55, 1.15, 0.1], scale: [0.14, 0.28, 0.12] },
      cameraPresetKey: 'arm',
    },
  ),
  muscle(
    'muscle_triceps_long_head',
    'Triceps (long head)',
    'arm',
    1,
    'egg',
    {
      whyItMatters: 'The long head creates the back arm horseshoe and arm width.',
      commonMistake: 'Flat back of arm. Split lateral and long heads around the humerus.',
      movementEffect: 'Extension tightens the triceps and points the olecranon.',
    },
    {
      originBoneId: 'bone_scapula',
      insertionBoneId: 'bone_ulna',
      layout: { position: [0.52, 1.1, -0.08], scale: [0.13, 0.3, 0.11] },
      cameraPresetKey: 'arm',
    },
  ),
  muscle(
    'muscle_brachialis',
    'Brachialis',
    'arm',
    1,
    'egg',
    {
      whyItMatters: 'The brachialis pushes the biceps outward and defines elbow depth.',
      commonMistake: 'Omitting the brachialis mass on flexed arms.',
      movementEffect: 'Flexion makes the brachialis the deepest front arm bulk.',
    },
    {
      layout: { position: [0.54, 1.0, 0.02], scale: [0.11, 0.18, 0.1] },
      cameraPresetKey: 'elbow',
    },
  ),
  muscle(
    'muscle_brachioradialis',
    'Brachioradialis',
    'arm',
    0,
    'cylinder',
    {
      whyItMatters: 'Creates the forearm tie-in and lateral forearm ridge.',
      commonMistake: 'Straight forearm with no tie-in bump near the elbow.',
      movementEffect: 'Mid-pronation makes the brachioradialis most prominent.',
    },
    {
      layout: { position: [0.58, 0.88, 0.05], rotation: [0, 0, -0.2], scale: [0.08, 0.22, 0.08] },
      cameraPresetKey: 'forearm',
    },
  ),
  muscle(
    'muscle_extensor_carpi_radialis',
    'Extensor carpi radialis',
    'arm',
    0,
    'cylinder',
    {
      whyItMatters: 'Defines the dorsal forearm ridge artists use for pronated hands.',
      commonMistake: 'Single tube forearm on the back. Split extensor group into ridges.',
      movementEffect: 'Wrist extension tightens the extensors along the radius.',
    },
    {
      layout: { position: [0.56, 0.72, -0.04], scale: [0.07, 0.28, 0.07] },
      cameraPresetKey: 'forearm',
    },
  ),
  muscle(
    'muscle_flexor_carpi_radialis',
    'Flexor carpi radialis',
    'arm',
    1,
    'cylinder',
    {
      whyItMatters: 'Shows on the volar forearm and points toward the hand.',
      commonMistake: 'Missing flexor ridge on supinated forearms.',
      movementEffect: 'Wrist flexion bunches flexors toward the medial epicondyle.',
    },
    {
      layout: { position: [0.54, 0.7, 0.08], scale: [0.06, 0.26, 0.06] },
      cameraPresetKey: 'forearm',
    },
  ),
];
