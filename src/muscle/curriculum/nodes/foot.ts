import { bone, muscle } from '../nodeHelpers';

export const footNodes = [
  bone(
    'bone_calcaneus',
    'Calcaneus',
    'foot',
    'box',
    {
      whyItMatters: 'The heel block anchors weight and sets foot length.',
      commonMistake: 'Pointed heel. The calcaneus is a box that hits the ground first.',
      movementEffect: 'Heel strike compresses the fat pad over the calcaneus.',
    },
    {
      layout: { position: [0.2, -1.45, -0.06], scale: [0.08, 0.06, 0.12] },
      subcutaneousLandmarks: ['Calcaneal tuberosity'],
      cameraPresetKey: 'foot',
    },
  ),
  bone(
    'bone_talus',
    'Talus',
    'foot',
    'egg',
    {
      whyItMatters: 'The talus stacks the leg over the foot arch.',
      commonMistake: 'Ankle as a single hinge with no foot mass beneath.',
      movementEffect: 'Dorsiflexion opens the ankle gap anteriorly.',
    },
    {
      layout: { position: [0.2, -1.38, 0.02], scale: [0.07, 0.05, 0.09] },
      cameraPresetKey: 'foot',
    },
  ),
  muscle(
    'muscle_abductor_hallucis',
    'Abductor hallucis',
    'foot',
    1,
    'cylinder',
    {
      whyItMatters: 'Shapes the medial arch and big toe mound.',
      commonMistake: 'Flat foot bottom with no arch volume.',
      movementEffect: 'Toe spread lifts the medial longitudinal arch.',
    },
    {
      layout: { position: [0.14, -1.42, 0.08], scale: [0.08, 0.04, 0.14] },
      cameraPresetKey: 'foot',
    },
  ),
  muscle(
    'muscle_extensor_digitorum_brevis',
    'Extensor digitorum brevis',
    'foot',
    1,
    'box',
    {
      whyItMatters: 'Creates dorsal foot volume above the metatarsals.',
      commonMistake: 'Thin dorsal foot with toes only.',
      movementEffect: 'Toe extension lifts the dorsal muscle mass.',
    },
    {
      layout: { position: [0.22, -1.4, 0.1], scale: [0.12, 0.04, 0.08] },
      cameraPresetKey: 'foot',
    },
  ),
  muscle(
    'muscle_peroneus_longus',
    'Peroneus longus',
    'foot',
    1,
    'cylinder',
    {
      whyItMatters: 'Wraps the lateral ankle and shapes the outer foot.',
      commonMistake: 'Ankle as a single cylinder. Show lateral tendon path.',
      movementEffect: 'Plantarflexion and eversion tighten the peroneals.',
    },
    {
      layout: { position: [0.3, -1.35, -0.02], scale: [0.06, 0.2, 0.06] },
      cameraPresetKey: 'foot',
    },
  ),
];
