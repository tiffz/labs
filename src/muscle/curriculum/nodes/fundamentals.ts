import { bone, joint } from '../nodeHelpers';

export const fundamentalsNodes = [
  bone(
    'bone_skull',
    'Skull',
    'fundamentals',
    'egg',
    {
      whyItMatters: 'Sets the cranial mass that every portrait proportion hangs from.',
      commonMistake: 'Drawing the skull as a perfect sphere instead of an egg that tilts forward.',
      movementEffect: 'Head rotation pivots around the atlas; the face plane shifts faster than the cranium.',
    },
    {
      layout: { position: [0, 2.2, 0], scale: [0.55, 0.65, 0.5] },
      cameraPresetKey: 'head',
    },
  ),
  bone(
    'bone_sternum',
    'Sternum',
    'fundamentals',
    'box',
    {
      whyItMatters: 'Anchors the chest keystone and the center line of the torso.',
      commonMistake: 'Making the sternum flat; it projects forward at the manubrium.',
      movementEffect: 'Arm elevation rotates the clavicles around the manubrium like bicycle handlebars.',
    },
    {
      layout: { position: [0, 1.2, 0.15], scale: [0.12, 0.35, 0.08] },
      subcutaneousLandmarks: ['Manubrium'],
      cameraPresetKey: 'chest',
    },
  ),
  bone(
    'bone_pelvis',
    'Pelvis',
    'fundamentals',
    'bucket',
    {
      whyItMatters: 'The pelvis is the torso base; its tilt drives contrapposto.',
      commonMistake: 'Drawing the pelvis as a flat bowl. The ASIS points forward and down.',
      movementEffect: 'Pelvic tilt shifts the lumbar curve and leg attachment angles.',
    },
    {
      layout: { position: [0, 0.2, 0], scale: [0.55, 0.25, 0.35] },
      subcutaneousLandmarks: ['ASIS', 'Iliac crest'],
      cameraPresetKey: 'pelvis',
    },
  ),
  bone(
    'bone_humerus',
    'Humerus',
    'fundamentals',
    'cylinder',
    {
      whyItMatters: 'The upper arm cylinder sets the shoulder-to-elbow rhythm.',
      commonMistake: 'Straight equal-width upper arm. The deltoid insertion creates a taper.',
      movementEffect: 'Shoulder flexion swings the humerus in an arc constrained by the scapula.',
    },
    {
      layout: { position: [0.55, 1.35, 0], rotation: [0, 0, -0.35], scale: [0.12, 0.45, 0.12] },
      cameraPresetKey: 'arm',
    },
  ),
  bone(
    'bone_radius',
    'Radius',
    'fundamentals',
    'cylinder',
    {
      whyItMatters: 'The radius crosses the ulna in pronation and shapes the forearm wedge.',
      commonMistake: 'Parallel forearm bones at every rotation.',
      movementEffect: 'Pronation pulls the radius across the ulna and twists the muscle bellies.',
    },
    {
      layout: { position: [0.5, 0.75, 0.08], scale: [0.08, 0.35, 0.08] },
      cameraPresetKey: 'forearm',
    },
  ),
  bone(
    'bone_ulna',
    'Ulna',
    'fundamentals',
    'cylinder',
    {
      whyItMatters: 'The ulna is the stable forearm post; the olecranon anchors the elbow point.',
      commonMistake: 'Hiding the olecranon on a straight-on view.',
      movementEffect: 'Elbow flexion exposes the olecranon as a sharp subcutaneous landmark.',
    },
    {
      layout: { position: [0.48, 0.75, -0.02], scale: [0.09, 0.36, 0.09] },
      subcutaneousLandmarks: ['Olecranon'],
      cameraPresetKey: 'forearm',
    },
  ),
  bone(
    'bone_femur',
    'Femur',
    'fundamentals',
    'cylinder',
    {
      whyItMatters: 'The femur angle creates the leg column and knee placement.',
      commonMistake: 'Vertical femur in contrapposto. It angles inward toward the knee.',
      movementEffect: 'Hip rotation swings the femoral head in the acetabulum.',
    },
    {
      layout: { position: [0.18, -0.35, 0], scale: [0.14, 0.55, 0.14] },
      cameraPresetKey: 'leg',
    },
  ),
  bone(
    'bone_tibia',
    'Tibia',
    'fundamentals',
    'cylinder',
    {
      whyItMatters: 'The tibia carries the shin line and knee-to-ankle weight read.',
      commonMistake: 'Symmetrical calves on both sides of the tibia.',
      movementEffect: 'Knee flexion compresses the calf mass posteriorly.',
    },
    {
      layout: { position: [0.18, -1.05, 0.05], scale: [0.11, 0.5, 0.11] },
      subcutaneousLandmarks: ['Tibial tuberosity'],
      cameraPresetKey: 'leg',
    },
  ),
  joint(
    'joint_shoulder',
    'Glenohumeral joint',
    'fundamentals',
    'ball_socket',
    {
      whyItMatters: 'The shoulder is the most mobile joint; its sweep defines arm gestures.',
      commonMistake: 'Drawing the shoulder joint at the acromion instead of deeper under the deltoid.',
      movementEffect: 'Abduction first rotates the humerus, then the scapula upwardly rotates.',
    },
    {
      layout: { position: [0.42, 1.55, 0], scale: [0.1, 0.1, 0.1] },
      cameraPresetKey: 'shoulder',
    },
  ),
  joint(
    'joint_elbow',
    'Elbow joint',
    'fundamentals',
    'hinge',
    {
      whyItMatters: 'The elbow is a hinge with a clear point for forearm direction.',
      commonMistake: 'Soft elbow with no bony point on extension.',
      movementEffect: 'Flexion brings the forearm mass toward the humerus on the medial side.',
    },
    {
      layout: { position: [0.52, 0.95, 0], scale: [0.09, 0.09, 0.09] },
      cameraPresetKey: 'elbow',
    },
  ),
  joint(
    'joint_hip',
    'Hip joint',
    'fundamentals',
    'ball_socket',
    {
      whyItMatters: 'Leg attachment and pelvic tilt read start at the hip joint.',
      commonMistake: 'Placing the hip joint at the iliac crest instead of medial in the pelvis.',
      movementEffect: 'Flexion lifts the femur; extension tucks it behind the torso.',
    },
    {
      layout: { position: [0.22, 0.05, 0], scale: [0.11, 0.11, 0.11] },
      cameraPresetKey: 'pelvis',
    },
  ),
  joint(
    'joint_knee',
    'Knee joint',
    'fundamentals',
    'hinge',
    {
      whyItMatters: 'Knee placement splits the leg into readable masses.',
      commonMistake: 'Ball-shaped knee. Use a boxy hinge with patella on flexion.',
      movementEffect: 'Flexion stacks the calf on the hamstrings and exposes the patella.',
    },
    {
      layout: { position: [0.2, -0.65, 0.05], scale: [0.1, 0.1, 0.1] },
      cameraPresetKey: 'knee',
    },
  ),
];
