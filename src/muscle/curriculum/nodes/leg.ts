import { bone, muscle } from '../nodeHelpers';

export const legNodes = [
  bone(
    'bone_patella',
    'Patella',
    'leg',
    'egg',
    {
      whyItMatters: 'The kneecap gives a clear front knee landmark in flexion.',
      commonMistake: 'Drawing the knee as a circle in all poses. The patella slides on flexion.',
      movementEffect: 'Deep flexion lifts the patella and compresses the quad tendon.',
    },
    {
      layout: { position: [0.2, -0.62, 0.12], scale: [0.08, 0.06, 0.04] },
      subcutaneousLandmarks: ['Patella'],
      cameraPresetKey: 'knee',
    },
  ),
  muscle(
    'muscle_quadriceps_rectus_femoris',
    'Rectus femoris',
    'leg',
    0,
    'egg',
    {
      whyItMatters: 'The quad mass shapes the front thigh and knee extension read.',
      commonMistake: 'Single tube thigh. Split rectus from vastus lateralis.',
      movementEffect: 'Knee extension tightens the rectus along the femur.',
    },
    {
      originBoneId: 'bone_pelvis',
      insertionBoneId: 'bone_patella',
      layout: { position: [0.2, -0.25, 0.1], scale: [0.14, 0.35, 0.14] },
      cameraPresetKey: 'leg',
    },
  ),
  muscle(
    'muscle_vastus_lateralis',
    'Vastus lateralis',
    'leg',
    0,
    'egg',
    {
      whyItMatters: 'Creates the lateral thigh sweep and knee width.',
      commonMistake: 'Narrow thighs on front views. The vastus lateral pushes outward.',
      movementEffect: 'Weight on one leg compresses the vastus on the stance side.',
    },
    {
      layout: { position: [0.28, -0.3, 0.02], scale: [0.12, 0.32, 0.13] },
      cameraPresetKey: 'leg',
    },
  ),
  muscle(
    'muscle_hamstrings_biceps_femoris',
    'Biceps femoris',
    'leg',
    0,
    'egg',
    {
      whyItMatters: 'The hamstring group defines back thigh and knee pit shadow.',
      commonMistake: 'Flat back of thigh. Split short and long heads on the lateral side.',
      movementEffect: 'Knee flexion bunches hamstrings into the popliteal fossa.',
    },
    {
      layout: { position: [0.22, -0.35, -0.08], scale: [0.13, 0.33, 0.12] },
      cameraPresetKey: 'leg',
    },
  ),
  muscle(
    'muscle_gastrocnemius',
    'Gastrocnemius',
    'leg',
    0,
    'egg',
    {
      whyItMatters: 'The calf diamond is a strong leg silhouette cue.',
      commonMistake: 'Symmetric calves on both tibia sides. Medial head sits higher.',
      movementEffect: 'Plantarflexion peaks the gastrocnemius bellies.',
    },
    {
      layout: { position: [0.2, -1.15, -0.06], scale: [0.14, 0.22, 0.12] },
      cameraPresetKey: 'leg',
    },
  ),
  muscle(
    'muscle_tibialis_anterior',
    'Tibialis anterior',
    'leg',
    0,
    'egg',
    {
      whyItMatters: 'Creates the front shin wedge and ankle transition.',
      commonMistake: 'Straight shin with no lateral mass. The TA wraps the tibia.',
      movementEffect: 'Dorsiflexion tightens the TA tendon at the ankle.',
    },
    {
      layout: { position: [0.24, -1.05, 0.1], scale: [0.1, 0.25, 0.08] },
      cameraPresetKey: 'leg',
    },
  ),
];
