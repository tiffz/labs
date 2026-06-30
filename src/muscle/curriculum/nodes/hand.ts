import { bone, joint, muscle } from '../nodeHelpers';

export const handNodes = [
  bone('bone_carpals', 'Carpals', 'hand', 'box', {
    layout: { position: [0.58, 0.54, 0.04], scale: [0.14, 0.05, 0.1] },
    subcutaneousLandmarks: ['Scaphoid', 'Pisiform'],
    cameraPresetKey: 'hand',
  }),
  bone('bone_metacarpals', 'Metacarpals', 'hand', 'box', {
    layout: { position: [0.62, 0.52, 0.05], scale: [0.18, 0.06, 0.12] },
    cameraPresetKey: 'hand',
  }),
  bone('bone_phalanges_hand', 'Finger phalanges', 'hand', 'box', {
    layout: { position: [0.66, 0.5, 0.08], scale: [0.16, 0.04, 0.14] },
    cameraPresetKey: 'hand',
  }),
  muscle('muscle_thenar_eminence', 'Thenar eminence', 'hand', 0, 'sphere', {
    layout: { position: [0.58, 0.5, 0.12], scale: [0.08, 0.08, 0.08] },
    cameraPresetKey: 'hand',
  }),
  muscle('muscle_hypothenar_eminence', 'Hypothenar eminence', 'hand', 0, 'sphere', {
    layout: { position: [0.7, 0.48, 0.08], scale: [0.07, 0.07, 0.07] },
    cameraPresetKey: 'hand',
  }),
  muscle('muscle_flexor_pollicis_brevis', 'Flexor pollicis brevis', 'hand', 0, 'sphere', {
    layout: { position: [0.56, 0.51, 0.14], scale: [0.06, 0.06, 0.06] },
    cameraPresetKey: 'hand',
  }),
  muscle('muscle_lumbricals_hand', 'Lumbricals', 'hand', 1, 'cylinder', {
    layout: { position: [0.64, 0.49, 0.1], scale: [0.1, 0.04, 0.08] },
    cameraPresetKey: 'hand',
  }),
  muscle('muscle_dorsal_interossei_hand', 'Dorsal interossei', 'hand', 1, 'box', {
    layout: { position: [0.64, 0.53, 0.04], scale: [0.1, 0.05, 0.08] },
    cameraPresetKey: 'hand',
  }),
  muscle('muscle_flexor_digitorum_superficialis', 'Flexor digitorum superficialis', 'hand', 1, 'cylinder', {
    layout: { position: [0.64, 0.45, 0.06], scale: [0.1, 0.08, 0.08] },
    cameraPresetKey: 'hand',
  }),
  muscle('muscle_extensor_digitorum', 'Extensor digitorum', 'hand', 0, 'cylinder', {
    layout: { position: [0.64, 0.52, -0.02], scale: [0.12, 0.05, 0.1] },
    cameraPresetKey: 'hand',
  }),
  joint('joint_thumb_cmc', 'Thumb carpometacarpal joint', 'hand', 'saddle', {
    layout: { position: [0.56, 0.52, 0.12], scale: [0.05, 0.05, 0.05] },
    cameraPresetKey: 'hand',
  }),
  joint('joint_intercarpal', 'Intercarpal joints', 'hand', 'plane', {
    layout: { position: [0.58, 0.54, 0.04], scale: [0.08, 0.04, 0.08] },
    cameraPresetKey: 'hand',
  }),
];
