import type { StructureDetails } from '../types/node';

/** Verified Wikipedia URLs — checked by scripts/verify-anatomy-links.mjs */
export const STRUCTURE_DETAILS_BY_ID: Record<string, StructureDetails> = {
  bone_skull: {
    definition:
      'The cranial egg sets portrait proportion: face plane tilts forward from the vertical axis.',
    colloquialNames: ['cranium'],
    latinName: 'Cranium',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Human_skull',
  },
  bone_sternum: {
    definition:
      'Chest keystone on the center line; the manubrium projects forward and anchors the clavicles.',
    latinName: 'Sternum',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Sternum',
  },
  bone_ribcage: {
    definition: 'Thoracic egg widening from sternum; ribs arc back and down, not a flat front plane.',
    colloquialNames: ['ribs', 'thoracic cage'],
    latinName: 'Thorax',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Rib_cage',
  },
  bone_spine: {
    definition:
      'Central post from skull base to pelvis; C7 and lumbar curves read in profile and back views.',
    colloquialNames: ['spine', 'backbone', 'vertebral column'],
    latinName: 'Vertebral column',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Vertebral_column',
  },
  bone_pelvis: {
    definition:
      'Torso base bucket; ASIS landmarks and pelvic tilt drive contrapposto and leg attachment.',
    colloquialNames: ['hip bone', 'pelvic girdle'],
    latinName: 'Pelvis',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Pelvis',
  },
  bone_humerus: {
    definition: 'Upper arm cylinder from shoulder to elbow; deltoid insertion creates outward taper.',
    latinName: 'Humerus',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Humerus',
  },
  bone_radius: {
    definition: 'Forearm bone that crosses the ulna in pronation; shapes the front forearm wedge.',
    latinName: 'Radius (bone)',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Radius_(bone)',
  },
  bone_ulna: {
    definition: 'Stable forearm post; the olecranon forms the sharp elbow point on extension.',
    latinName: 'Ulna',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Ulna',
  },
  bone_femur: {
    definition: 'Thigh column angled inward toward the knee; sets leg rhythm in standing poses.',
    latinName: 'Femur',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Femur',
  },
  bone_tibia: {
    definition: 'Shin bone carrying weight from knee to ankle; defines the front leg line.',
    colloquialNames: ['shin bone'],
    latinName: 'Tibia',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Tibia',
  },
  joint_shoulder: {
    definition: 'Ball-and-socket shoulder joint deep under the deltoid; most mobile joint in the body.',
    colloquialNames: ['glenohumeral joint'],
    latinName: 'Articulatio humeri',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Glenohumeral_joint',
  },
  joint_elbow: {
    definition: 'Hinge joint with a clear bony point; flexion stacks forearm mass on the humerus.',
    latinName: 'Articulatio cubiti',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Elbow',
  },
  joint_hip: {
    definition: 'Ball-and-socket hip joint medial in the pelvis; leg attachment and tilt read start here.',
    latinName: 'Articulatio coxae',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Hip_joint',
  },
  joint_knee: {
    definition: 'Hinge splitting the leg into readable masses; patella slides on flexion.',
    latinName: 'Articulatio genus',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Knee',
  },
  muscle_rectus_abdominis: {
    definition: 'Front torso segmentation (six-pack rhythm); compresses on the near side in twist.',
    colloquialNames: ['abs', 'six-pack'],
    latinName: 'Musculus rectus abdominis',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Rectus_abdominis_muscle',
  },
  muscle_external_oblique: {
    definition: 'Diagonal waist wrap; thickens on the compressed side in lateral flexion.',
    colloquialNames: ['obliques'],
    latinName: 'Musculus obliquus externus abdominis',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/External_oblique_muscle',
  },
  muscle_serratus_anterior: {
    definition: 'Finger-like slips on the rib cage side; visible on lean torsos when scapula protracts.',
    colloquialNames: ['serratus', 'boxer muscle'],
    latinName: 'Musculus serratus anterior',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Serratus_anterior_muscle',
  },
  muscle_latissimus_dorsi: {
    definition: 'Back wing from spine and pelvis to humerus; shapes armpit shadow in back views.',
    colloquialNames: ['lats'],
    latinName: 'Musculus latissimus dorsi',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Latissimus_dorsi_muscle',
  },
  muscle_erector_spinae: {
    definition: 'Twin columns along the spine in back views; thicken in extension and heavy lifts.',
    colloquialNames: ['spinal erectors'],
    latinName: 'Musculus erector spinae',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Erector_spinae_muscles',
  },
  muscle_pectoralis_major: {
    definition: 'Front chest fan from sternum to humerus; bunches when arms close horizontally.',
    colloquialNames: ['pecs', 'chest muscle'],
    latinName: 'Musculus pectoralis major',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Pectoralis_major',
  },
  bone_clavicle: {
    definition: 'Collar bridge from sternum to shoulder; pitches with arm elevation.',
    colloquialNames: ['collarbone'],
    latinName: 'Clavicula',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Clavicle',
  },
  bone_scapula: {
    definition: 'Shoulder blade sliding on the rib cage; spine and acromion read in back views.',
    colloquialNames: ['shoulder blade'],
    latinName: 'Scapula',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Scapula',
  },
  muscle_deltoid_anterior: {
    definition: 'Front shoulder cap; cascades downward and is thinner than the posterior head.',
    colloquialNames: ['front delt', 'anterior deltoid'],
    latinName: 'Musculus deltoideus',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Deltoid_muscle',
  },
  muscle_deltoid_lateral: {
    definition: 'Shoulder cap width in three-quarter views; caps the acromion and reads as the widest point of the shoulder.',
    colloquialNames: ['side delt', 'middle deltoid'],
    latinName: 'Musculus deltoideus',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Deltoid_muscle',
  },
  muscle_deltoid_posterior: {
    definition: 'Back shoulder cap; thinner and lower than the anterior head.',
    colloquialNames: ['rear delt', 'posterior deltoid'],
    latinName: 'Musculus deltoideus',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Deltoid_muscle',
  },
  muscle_trapezius_upper: {
    definition: 'Upper trap from neck to clavicle and scapula; bunches in a shoulder shrug.',
    colloquialNames: ['traps', 'upper trap'],
    latinName: 'Musculus trapezius',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Trapezius',
  },
  muscle_sternocleidomastoid: {
    definition: 'Neck V from sternum and clavicle to mastoid; prominent when head rotates away.',
    colloquialNames: ['SCM'],
    latinName: 'Musculus sternocleidomastoideus',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Sternocleidomastoid_muscle',
  },
  joint_sternoclavicular: {
    definition: 'Sternum–clavicle saddle joint; clavicle rotates like handlebars on arm lift.',
    latinName: 'Articulatio sternoclavicularis',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Sternoclavicular_joint',
  },
  joint_acromioclavicular: {
    definition: 'Plane joint where clavicle meets the acromion; glides when the shoulder elevates.',
    latinName: 'Articulatio acromioclavicularis',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Acromioclavicular_joint',
  },
  joint_proximal_radioulnar: {
    definition: 'Pivot joint at the elbow; radius rotates around the ulna for pronation and supination.',
    latinName: 'Articulatio radioulnaris proximalis',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Proximal_radioulnar_joint',
  },
  joint_wrist: {
    definition: 'Ellipsoid radiocarpal joint; flexion, extension, and radial/ulnar deviation at the wrist.',
    latinName: 'Articulatio radiocarpalis',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Wrist',
  },
  joint_thumb_cmc: {
    definition: 'Saddle joint at the thumb base; opposition and strong thumb mobility.',
    latinName: 'Articulatio carpometacarpalis pollicis',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Carpometacarpal_joint_of_thumb',
  },
  joint_intercarpal: {
    definition: 'Plane joints between carpals; small gliding movements stabilize the wrist block.',
    latinName: 'Articulationes intercarpales',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Intercarpal_joints',
  },
  joint_ankle: {
    definition: 'Hinge talocrural joint; dorsiflexion and plantarflexion at the ankle.',
    latinName: 'Articulatio talocruralis',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Ankle',
  },
  joint_subtalar: {
    definition: 'Plane subtalar joint below the ankle; inversion and eversion of the foot.',
    latinName: 'Articulatio subtalaris',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Subtalar_joint',
  },
  muscle_biceps_brachii: {
    definition: 'Front arm mass with two heads; bunches on elbow flexion over the brachialis.',
    colloquialNames: ['biceps'],
    latinName: 'Musculus biceps brachii',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Biceps',
  },
  muscle_triceps_long_head: {
    definition: 'Long head of back arm horseshoe; tightens on elbow extension.',
    colloquialNames: ['triceps'],
    latinName: 'Musculus triceps brachii',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Triceps',
  },
  muscle_brachialis: {
    definition: 'Deep front arm bulk under biceps; pushes biceps outward on flexion.',
    latinName: 'Musculus brachialis',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Brachialis_muscle',
  },
  muscle_brachioradialis: {
    definition: 'Lateral forearm tie-in ridge near the elbow; most visible in mid-pronation.',
    latinName: 'Musculus brachioradialis',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Brachioradialis',
  },
  muscle_extensor_carpi_radialis: {
    definition: 'Dorsal forearm ridge toward the hand; tightens on wrist extension.',
    latinName: 'Musculus extensor carpi radialis longus',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Extensor_carpi_radialis_longus',
  },
  muscle_flexor_carpi_radialis: {
    definition: 'Volar forearm ridge toward the palm; bunches on wrist flexion.',
    latinName: 'Musculus flexor carpi radialis',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Flexor_carpi_radialis_muscle',
  },
  bone_metacarpals: {
    definition: 'Palm arch bones fanning into fingers; knuckle row curves in a shallow cylinder.',
    latinName: 'Metacarpus',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Metacarpal_bones',
  },
  bone_carpals: {
    definition: 'Wrist block of eight bones; the scaphoid and pisiform read on the palm side.',
    colloquialNames: ['wrist bones'],
    latinName: 'Carpus',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Carpal_bones',
  },
  bone_phalanges_hand: {
    definition: 'Finger segments in three linked cylinders; knuckle spacing drives hand gesture.',
    colloquialNames: ['finger bones'],
    latinName: 'Phalanges of the hand',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Phalanx_bone',
  },
  muscle_thenar_eminence: {
    definition: 'Thumb pad mass on the palm; rolls across the palm in opposition.',
    colloquialNames: ['thenar'],
    latinName: 'Eminence thenar',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Thenar_eminence',
  },
  muscle_hypothenar_eminence: {
    definition: 'Pinky-side palm mound balancing hand volume.',
    colloquialNames: ['hypothenar'],
    latinName: 'Eminence hypothenar',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Hypothenar_eminence',
  },
  muscle_flexor_pollicis_brevis: {
    definition: 'Short thumb flexor forming the thenar pad with abductor pollicis.',
    latinName: 'Musculus flexor pollicis brevis',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Flexor_pollicis_brevis_muscle',
  },
  muscle_lumbricals_hand: {
    definition: 'Four small palm muscles between metacarpals; fine-tune finger spread and flexion.',
    latinName: 'Musculi lumbricales manus',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Lumbricals_of_the_hand',
  },
  muscle_dorsal_interossei_hand: {
    definition: 'Dorsal hand muscles spreading fingers apart from the metacarpals.',
    latinName: 'Musculi interossei dorsales manus',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Dorsal_interossei_of_the_hand',
  },
  muscle_flexor_digitorum_superficialis: {
    definition: 'Palm-side finger flexor tendons; rhythm along finger cylinders on flexion.',
    latinName: 'Musculus flexor digitorum superficialis',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Flexor_digitorum_superficialis_muscle',
  },
  muscle_extensor_digitorum: {
    definition: 'Dorsal tendons over knuckles; elevates on finger extension.',
    latinName: 'Musculus extensor digitorum',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Extensor_digitorum_muscle',
  },
  bone_patella: {
    definition: 'Kneecap sliding on flexion; front knee landmark in bent poses.',
    colloquialNames: ['kneecap'],
    latinName: 'Patella',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Patella',
  },
  muscle_quadriceps_rectus_femoris: {
    definition: 'Central quad strap from pelvis to patella; tightens on knee extension.',
    latinName: 'Musculus rectus femoris',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Rectus_femoris_muscle',
  },
  muscle_vastus_lateralis: {
    definition: 'Lateral thigh sweep pushing outward; widens the knee read from front views.',
    colloquialNames: ['outer quad'],
    latinName: 'Musculus vastus lateralis',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Vastus_lateralis_muscle',
  },
  muscle_hamstrings_biceps_femoris: {
    definition: 'Lateral hamstring on back thigh; bunches into the knee pit on flexion.',
    colloquialNames: ['lateral hamstring'],
    latinName: 'Musculus biceps femoris',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Biceps_femoris_muscle',
  },
  muscle_gastrocnemius: {
    definition: 'Twin calf diamond on the back leg; peaks on plantarflexion. Part of triceps surae with soleus.',
    colloquialNames: ['calf', 'calves'],
    latinName: 'Musculus gastrocnemius',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Gastrocnemius_muscle',
  },
  muscle_tibialis_anterior: {
    definition: 'Front shin wedge along the tibia; tightens on dorsiflexion.',
    colloquialNames: ['shin muscle'],
    latinName: 'Musculus tibialis anterior',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Tibialis_anterior_muscle',
  },
  bone_calcaneus: {
    definition: 'Heel block hitting the ground first; boxy, not pointed.',
    colloquialNames: ['heel bone'],
    latinName: 'Calcaneus',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Calcaneus',
  },
  bone_talus: {
    definition: 'Ankle stack bone carrying leg weight onto the foot arch.',
    latinName: 'Talus',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Talus_bone',
  },
  bone_metatarsals: {
    definition: 'Forefoot arch bones fanning to toes; weight rolls forward on push-off.',
    latinName: 'Metatarsus',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Metatarsal_bones',
  },
  bone_tarsals: {
    definition: 'Midfoot bridge between ankle and metatarsals; navicular and cuboid shape the arch.',
    colloquialNames: ['midfoot bones'],
    latinName: 'Tarsus',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Tarsus_(skeleton)',
  },
  bone_phalanges_foot: {
    definition: 'Toe segments in shorter cylinders than the hand; big toe has two, others three.',
    colloquialNames: ['toe bones'],
    latinName: 'Phalanges of the foot',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Phalanx_bone',
  },
  muscle_abductor_hallucis: {
    definition: 'Medial arch and big toe mound on the sole.',
    latinName: 'Musculus abductor hallucis',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Abductor_hallucis_muscle',
  },
  muscle_flexor_digitorum_brevis: {
    definition: 'Plantar muscle flexing the middle toes; shapes the forefoot pad on the sole.',
    latinName: 'Musculus flexor digitorum brevis',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Flexor_digitorum_brevis_muscle',
  },
  muscle_lumbricals_foot: {
    definition: 'Small sole muscles between metatarsals; stabilize toe flexion on push-off.',
    latinName: 'Musculi lumbricales pedis',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Lumbricals_of_the_foot',
  },
  muscle_extensor_digitorum_brevis: {
    definition: 'Dorsal foot volume above metatarsals; lifts on toe extension.',
    latinName: 'Musculus extensor digitorum brevis',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Extensor_digitorum_brevis_muscle',
  },
  muscle_peroneus_longus: {
    definition: 'Lateral ankle tendon wrapping to the outer foot; tight on eversion.',
    colloquialNames: ['fibularis longus'],
    latinName: 'Musculus fibularis longus',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Fibularis_longus_muscle',
  },
  // Phase 5 promotions
  muscle_gluteus_maximus: {
    definition: 'Largest buttock mass; drives hip extension and back-leg silhouette.',
    colloquialNames: ['glutes', 'butt muscle'],
    latinName: 'Musculus gluteus maximus',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Gluteus_maximus',
  },
  muscle_gluteus_medius: {
    definition: 'Upper lateral hip shelf; stabilizes pelvis in single-leg stance.',
    colloquialNames: ['glutes'],
    latinName: 'Musculus gluteus medius',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Gluteus_medius',
  },
  muscle_gluteus_minimus: {
    definition: 'Deep lateral hip stabilizer beneath the medius.',
    colloquialNames: ['glutes'],
    latinName: 'Musculus gluteus minimus',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Gluteus_minimus',
  },
  muscle_tensor_fasciae_latae: {
    definition: 'Small front hip muscle feeding the iliotibial band; shapes outer thigh sweep.',
    colloquialNames: ['TFL', 'IT band origin'],
    latinName: 'Musculus tensor fasciae latae',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Tensor_fasciae_latae_muscle',
  },
  muscle_adductor_longus: {
    definition: 'Inner thigh strap visible on abducted legs; part of the groin mass.',
    colloquialNames: ['adductors'],
    latinName: 'Musculus adductor longus',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Adductor_longus_muscle',
  },
  muscle_rhomboid_major: {
    definition: 'Rhomboid sheet between spine and scapula medial border; draws scapula toward spine.',
    colloquialNames: ['rhomboids'],
    latinName: 'Musculus rhomboideus major',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Rhomboid_muscles',
  },
  muscle_infraspinatus: {
    definition: 'Rotator cuff filling the scapula infraspinous fossa; external rotation of the arm.',
    latinName: 'Musculus infraspinatus',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Infraspinatus_muscle',
  },
  muscle_teres_major: {
    definition: 'Lower armpit strap from scapula to humerus; adducts and medially rotates the arm.',
    latinName: 'Musculus teres major',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Teres_major_muscle',
  },
  muscle_supraspinatus: {
    definition: 'Rotator cuff above the scapular spine; initiates arm abduction.',
    latinName: 'Musculus supraspinatus',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Supraspinatus_muscle',
  },
};

export const ATLAS_REFERENCE_DETAILS: StructureDetails = {
  definition: 'Reference detail in Full body atlas. Study curated structures in a module tab for reps.',
};

export function getStructureDetails(nodeId: string, displayName: string): StructureDetails {
  return (
    STRUCTURE_DETAILS_BY_ID[nodeId] ?? {
      definition: `Reference structure: ${displayName}. Visible in Full body for context.`,
    }
  );
}
