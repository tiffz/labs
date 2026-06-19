import { bone, muscle } from '../nodeHelpers';

export const handNodes = [
  bone(
    'bone_metacarpals',
    'Metacarpals',
    'hand',
    'box',
    {
      whyItMatters: 'The metacarpal arch sets palm width and finger fan.',
      commonMistake: 'Flat palm box. Arc the knuckle row in a shallow cylinder.',
      movementEffect: 'Finger spread opens the web spaces between metacarpals.',
    },
    {
      layout: { position: [0.62, 0.52, 0.05], scale: [0.18, 0.06, 0.12] },
      cameraPresetKey: 'hand',
    },
  ),
  muscle(
    'muscle_thenar_eminence',
    'Thenar eminence',
    'hand',
    0,
    'sphere',
    {
      whyItMatters: 'The thumb pad mass separates the hand from a mitten shape.',
      commonMistake: 'Thumb sprouting from the palm edge with no thenar bulk.',
      movementEffect: 'Opposition rolls the thumb pad across the palm.',
    },
    {
      layout: { position: [0.58, 0.5, 0.12], scale: [0.08, 0.08, 0.08] },
      cameraPresetKey: 'hand',
    },
  ),
  muscle(
    'muscle_hypothenar_eminence',
    'Hypothenar eminence',
    'hand',
    0,
    'sphere',
    {
      whyItMatters: 'Balances the palm on the pinky side and sells hand volume.',
      commonMistake: 'Straight pinky edge with no hypothenar mound.',
      movementEffect: 'Pinky flexion bunches the hypothenar group.',
    },
    {
      layout: { position: [0.7, 0.48, 0.08], scale: [0.07, 0.07, 0.07] },
      cameraPresetKey: 'hand',
    },
  ),
  muscle(
    'muscle_flexor_digitorum_superficialis',
    'Flexor digitorum superficialis',
    'hand',
    1,
    'cylinder',
    {
      whyItMatters: 'Tendons show on the palm side and define finger cylinders.',
      commonMistake: 'Equal-width fingers with no tendon rhythm.',
      movementEffect: 'Finger flexion pulls tendons taut and sharpens knuckles.',
    },
    {
      layout: { position: [0.64, 0.45, 0.06], scale: [0.1, 0.08, 0.08] },
      cameraPresetKey: 'hand',
    },
  ),
  muscle(
    'muscle_extensor_digitorum',
    'Extensor digitorum',
    'hand',
    0,
    'cylinder',
    {
      whyItMatters: 'Dorsal tendons create knuckle read on the back of the hand.',
      commonMistake: 'Smooth back of hand with no knuckle boxes.',
      movementEffect: 'Extension elevates tendons over metacarpophalangeal joints.',
    },
    {
      layout: { position: [0.64, 0.52, -0.02], scale: [0.12, 0.05, 0.1] },
      cameraPresetKey: 'hand',
    },
  ),
];
