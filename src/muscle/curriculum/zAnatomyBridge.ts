/**
 * Maps Z-Anatomy Blender object names → Muscle Memory curriculum ids.
 * Source of truth: tools/muscle-anatomy/z_anatomy_name_map.csv
 * Regenerate: npm run muscle:sync-bridge
 */
import { armNodes } from './nodes/arm';
import { footNodes } from './nodes/foot';
import { fundamentalsNodes } from './nodes/fundamentals';
import { handNodes } from './nodes/hand';
import { legNodes } from './nodes/leg';
import { shoulderNeckNodes } from './nodes/shoulderNeck';
import { torsoNodes } from './nodes/torso';
import { atlasSupplementNodes } from './nodes/atlasSupplement';
import { atlasHeadFaceNodes } from './nodes/atlasHeadFace';
import { ATLAS_MESH_NODE_IDS } from './atlasMeshRegistry';

export type ZAnatomyBridgeEntry = {
  zAnatomyName: string;
  nodeId: string;
  region: string;
};

export const Z_ANATOMY_BRIDGE: readonly ZAnatomyBridgeEntry[] = [
  { zAnatomyName: "Frontal bone", nodeId: "bone_skull", region: "fundamentals" },
  { zAnatomyName: "Occipital bone", nodeId: "bone_skull", region: "fundamentals" },
  { zAnatomyName: "Parietal bone.r", nodeId: "bone_skull", region: "fundamentals" },
  { zAnatomyName: "Body of sternum", nodeId: "bone_sternum", region: "fundamentals" },
  { zAnatomyName: "Hip bone.r", nodeId: "bone_pelvis", region: "fundamentals" },
  { zAnatomyName: "Humerus.r", nodeId: "bone_humerus", region: "fundamentals" },
  { zAnatomyName: "Radius.r", nodeId: "bone_radius", region: "fundamentals" },
  { zAnatomyName: "Ulna.r", nodeId: "bone_ulna", region: "fundamentals" },
  { zAnatomyName: "Femur.r", nodeId: "bone_femur", region: "fundamentals" },
  { zAnatomyName: "Tibia.r", nodeId: "bone_tibia", region: "fundamentals" },
  { zAnatomyName: "Articular capsule of glenohumeral joint.r", nodeId: "joint_shoulder", region: "fundamentals" },
  { zAnatomyName: "Articular capsule of elbow.r", nodeId: "joint_elbow", region: "fundamentals" },
  { zAnatomyName: "1st rib.r", nodeId: "bone_ribcage", region: "torso" },
  { zAnatomyName: "2d rib.r", nodeId: "bone_ribcage", region: "torso" },
  { zAnatomyName: "3rd rib.r", nodeId: "bone_ribcage", region: "torso" },
  { zAnatomyName: "4th rib.r", nodeId: "bone_ribcage", region: "torso" },
  { zAnatomyName: "5th rib.r", nodeId: "bone_ribcage", region: "torso" },
  { zAnatomyName: "6th rib.r", nodeId: "bone_ribcage", region: "torso" },
  { zAnatomyName: "7th rib.r", nodeId: "bone_ribcage", region: "torso" },
  { zAnatomyName: "8th rib.r", nodeId: "bone_ribcage", region: "torso" },
  { zAnatomyName: "9th rib.r", nodeId: "bone_ribcage", region: "torso" },
  { zAnatomyName: "10th rib.r", nodeId: "bone_ribcage", region: "torso" },
  { zAnatomyName: "11th rib.r", nodeId: "bone_ribcage", region: "torso" },
  { zAnatomyName: "12th rib.r", nodeId: "bone_ribcage", region: "torso" },
  { zAnatomyName: "Rectus abdominis muscle.r", nodeId: "muscle_rectus_abdominis", region: "torso" },
  { zAnatomyName: "External abdominal oblique.r", nodeId: "muscle_external_oblique", region: "torso" },
  { zAnatomyName: "Serratus anterior muscle.r", nodeId: "muscle_serratus_anterior", region: "torso" },
  { zAnatomyName: "Latissimus dorsi muscle.r", nodeId: "muscle_latissimus_dorsi", region: "torso" },
  { zAnatomyName: "Longissimus thoracis muscle.r", nodeId: "muscle_erector_spinae", region: "torso" },
  { zAnatomyName: "Clavicular head of pectoralis major muscle.r", nodeId: "muscle_pectoralis_major", region: "torso" },
  { zAnatomyName: "Sternocostal head of pectoralis major muscle.r", nodeId: "muscle_pectoralis_major", region: "torso" },
  { zAnatomyName: "Abdominal part of pectoralis major muscle.r", nodeId: "muscle_pectoralis_major", region: "torso" },
  { zAnatomyName: "Clavicle.r", nodeId: "bone_clavicle", region: "shoulder_neck" },
  { zAnatomyName: "Scapula.r", nodeId: "bone_scapula", region: "shoulder_neck" },
  { zAnatomyName: "Clavicular part of deltoid muscle.r", nodeId: "muscle_deltoid_anterior", region: "shoulder_neck" },
  { zAnatomyName: "Acromial part of deltoid muscle.r", nodeId: "muscle_deltoid_lateral", region: "shoulder_neck" },
  { zAnatomyName: "Scapular part of deltoid uscle.r", nodeId: "muscle_deltoid_posterior", region: "shoulder_neck" },
  { zAnatomyName: "Ascending part of trapezius muscle.r", nodeId: "muscle_trapezius_upper", region: "shoulder_neck" },
  { zAnatomyName: "Descending part of trapezius muscle.r", nodeId: "muscle_trapezius_upper", region: "shoulder_neck" },
  { zAnatomyName: "Transverse part of trapezius muscle.r", nodeId: "muscle_trapezius_upper", region: "shoulder_neck" },
  { zAnatomyName: "Sternocleidomastoid muscle.r", nodeId: "muscle_sternocleidomastoid", region: "shoulder_neck" },
  { zAnatomyName: "Articular capsule of sternoclavicular joint*.r", nodeId: "joint_sternoclavicular", region: "shoulder_neck" },
  { zAnatomyName: "Long head of biceps brachii muscle.r", nodeId: "muscle_biceps_brachii", region: "arm" },
  { zAnatomyName: "Short head of biceps brachii.r", nodeId: "muscle_biceps_brachii", region: "arm" },
  { zAnatomyName: "Medial head of biceps brachii muscle.r", nodeId: "muscle_biceps_brachii", region: "arm" },
  { zAnatomyName: "Lateral head of triceps brachii muscle.r", nodeId: "muscle_triceps_long_head", region: "arm" },
  { zAnatomyName: "Brachialis muscle.r", nodeId: "muscle_brachialis", region: "arm" },
  { zAnatomyName: "Brachioradialis muscle.r", nodeId: "muscle_brachioradialis", region: "arm" },
  { zAnatomyName: "Extensor carpi radialis longus.r", nodeId: "muscle_extensor_carpi_radialis", region: "arm" },
  { zAnatomyName: "Flexor carpi radialis.r", nodeId: "muscle_flexor_carpi_radialis", region: "arm" },
  { zAnatomyName: "1st metacarpal bone.r", nodeId: "bone_metacarpals", region: "hand" },
  { zAnatomyName: "2d metacarpal bone.r", nodeId: "bone_metacarpals", region: "hand" },
  { zAnatomyName: "3d metacarpal bone.r", nodeId: "bone_metacarpals", region: "hand" },
  { zAnatomyName: "4th metacarpal bone.r", nodeId: "bone_metacarpals", region: "hand" },
  { zAnatomyName: "5th metacarpal bone.r", nodeId: "bone_metacarpals", region: "hand" },
  { zAnatomyName: "Thenar eminence.r", nodeId: "muscle_thenar_eminence", region: "hand" },
  { zAnatomyName: "Hypothenar eminence.r", nodeId: "muscle_hypothenar_eminence", region: "hand" },
  { zAnatomyName: "Flexor digitorum superficialis.r", nodeId: "muscle_flexor_digitorum_superficialis", region: "hand" },
  { zAnatomyName: "Extensor digitorum.r", nodeId: "muscle_extensor_digitorum", region: "hand" },
  { zAnatomyName: "Patella.r", nodeId: "bone_patella", region: "leg" },
  { zAnatomyName: "Rectus femoris muscle.r", nodeId: "muscle_quadriceps_rectus_femoris", region: "leg" },
  { zAnatomyName: "Rectus femoris muscle-Iliac insertion.r", nodeId: "muscle_quadriceps_rectus_femoris", region: "leg" },
  { zAnatomyName: "Vastus lateralis muscle.r", nodeId: "muscle_vastus_lateralis", region: "leg" },
  { zAnatomyName: "Long head of biceps femoris muscle.r", nodeId: "muscle_hamstrings_biceps_femoris", region: "leg" },
  { zAnatomyName: "Short head of biceps femoris muscle.r", nodeId: "muscle_hamstrings_biceps_femoris", region: "leg" },
  { zAnatomyName: "Short head of biceps femoris on lateral lip of linea aspera.r", nodeId: "muscle_hamstrings_biceps_femoris", region: "leg" },
  { zAnatomyName: "Medial head of gastrocnemius.r", nodeId: "muscle_gastrocnemius", region: "leg" },
  { zAnatomyName: "Lateral head of gastrocnemius.r", nodeId: "muscle_gastrocnemius", region: "leg" },
  { zAnatomyName: "Tibialis anterior muscle.r", nodeId: "muscle_tibialis_anterior", region: "leg" },
  { zAnatomyName: "Calcaneus.r", nodeId: "bone_calcaneus", region: "foot" },
  { zAnatomyName: "Talus.r", nodeId: "bone_talus", region: "foot" },
  { zAnatomyName: "1st metatarsal bone.r", nodeId: "bone_metatarsals", region: "foot" },
  { zAnatomyName: "2d metatarsal bone.r", nodeId: "bone_metatarsals", region: "foot" },
  { zAnatomyName: "3rd metatarsal bone.r", nodeId: "bone_metatarsals", region: "foot" },
  { zAnatomyName: "4th metatarsal bone.r", nodeId: "bone_metatarsals", region: "foot" },
  { zAnatomyName: "5th metatarsal bone.r", nodeId: "bone_metatarsals", region: "foot" },
  { zAnatomyName: "Abductor hallucis.r", nodeId: "muscle_abductor_hallucis", region: "foot" },
  { zAnatomyName: "Extensor digitorum brevis.r", nodeId: "muscle_extensor_digitorum_brevis", region: "foot" },
  { zAnatomyName: "Gluteus maximus muscle.r", nodeId: "muscle_gluteus_maximus", region: "atlas_supplement" },
  { zAnatomyName: "Gluteus maximus ending on gluteal surface.r", nodeId: "muscle_gluteus_maximus", region: "atlas_supplement" },
  { zAnatomyName: "Gluteus maximus muscle-Iliac insertion.r", nodeId: "muscle_gluteus_maximus", region: "atlas_supplement" },
  { zAnatomyName: "Gluteus medius muscle.r", nodeId: "muscle_gluteus_medius", region: "atlas_supplement" },
  { zAnatomyName: "Gluteus medius muscle-Iliac insertion.r", nodeId: "muscle_gluteus_medius", region: "atlas_supplement" },
  { zAnatomyName: "Gluteus minimus muscle.r", nodeId: "muscle_gluteus_minimus", region: "atlas_supplement" },
  { zAnatomyName: "Gluteus minimus muscle-Iliac insertion.r", nodeId: "muscle_gluteus_minimus", region: "atlas_supplement" },
  { zAnatomyName: "Inferior gemellus muscle.r", nodeId: "muscle_gemellus_inferior", region: "atlas_supplement" },
  { zAnatomyName: "Inferior gemellus muscle-Ischiatic insertion.r", nodeId: "muscle_gemellus_inferior", region: "atlas_supplement" },
  { zAnatomyName: "Superior gemellus muscle.r", nodeId: "muscle_gemellus_superior", region: "atlas_supplement" },
  { zAnatomyName: "Superior gemellus muscle-Ischiatic insertion.r", nodeId: "muscle_gemellus_superior", region: "atlas_supplement" },
  { zAnatomyName: "Obturator internus.r", nodeId: "muscle_obturator_internus", region: "atlas_supplement" },
  { zAnatomyName: "Quadratus femoris muscle.r", nodeId: "muscle_quadratus_femoris", region: "atlas_supplement" },
  { zAnatomyName: "Quadratus femoris-Ischiatic insertion.r", nodeId: "muscle_quadratus_femoris", region: "atlas_supplement" },
  { zAnatomyName: "Quadratus femoris ending on quadrate tubercle.r", nodeId: "muscle_quadratus_femoris", region: "atlas_supplement" },
  { zAnatomyName: "Piriformis muscle.r", nodeId: "muscle_piriformis", region: "atlas_supplement" },
  { zAnatomyName: "Iliacus muscle.r", nodeId: "muscle_iliacus", region: "atlas_supplement" },
  { zAnatomyName: "Vastus intermedius muscle.r", nodeId: "muscle_vastus_intermedius", region: "atlas_supplement" },
  { zAnatomyName: "Soleus muscle.r", nodeId: "muscle_soleus", region: "atlas_supplement" },
  { zAnatomyName: "Vastus medialis muscle.r", nodeId: "muscle_vastus_medialis", region: "atlas_supplement" },
  { zAnatomyName: "Gracilis muscle.r", nodeId: "muscle_gracilis", region: "atlas_supplement" },
  { zAnatomyName: "Adductor longus.r", nodeId: "muscle_adductor_longus", region: "atlas_supplement" },
  { zAnatomyName: "Adductor longus on medial surface of femur.r", nodeId: "muscle_adductor_longus", region: "atlas_supplement" },
  { zAnatomyName: "Semitendinosus muscle.r", nodeId: "muscle_semitendinosus", region: "atlas_supplement" },
  { zAnatomyName: "Semitendinosus muscle-Isciatic insertion.r", nodeId: "muscle_semitendinosus", region: "atlas_supplement" },
  { zAnatomyName: "Semitendinosus on 'patte d'oie'.r", nodeId: "muscle_semitendinosus", region: "atlas_supplement" },
  { zAnatomyName: "Semimembranosus muscle.r", nodeId: "muscle_semimembranosus", region: "atlas_supplement" },
  { zAnatomyName: "Semimembranosus muscle-Ischiatic insertion.r", nodeId: "muscle_semimembranosus", region: "atlas_supplement" },
  { zAnatomyName: "Semimembranosus on posterior surf. of med. condyle.r", nodeId: "muscle_semimembranosus", region: "atlas_supplement" },
  { zAnatomyName: "Sartorius muscle.r", nodeId: "muscle_sartorius", region: "atlas_supplement" },
  { zAnatomyName: "Tensor fasciae latae.r", nodeId: "muscle_tensor_fasciae_latae", region: "atlas_supplement" },
  { zAnatomyName: "Teres major muscle.r", nodeId: "muscle_teres_major", region: "atlas_supplement" },
  { zAnatomyName: "Infraspinatus muscle.r", nodeId: "muscle_infraspinatus", region: "atlas_supplement" },
  { zAnatomyName: "Supraspinatus muscle.r", nodeId: "muscle_supraspinatus", region: "atlas_supplement" },
  { zAnatomyName: "Rhomboid major muscle.r", nodeId: "muscle_rhomboid_major", region: "atlas_supplement" },
  { zAnatomyName: "Splenius capitis muscle.r", nodeId: "muscle_splenius_capitis", region: "atlas_supplement" },
  { zAnatomyName: "Omohyoid muscle.r", nodeId: "muscle_omohyoid", region: "atlas_supplement" },
  { zAnatomyName: "Fibularis longus.r", nodeId: "muscle_peroneus_longus", region: "foot" },
  { zAnatomyName: "Mandible", nodeId: "bone_mandible", region: "atlas_head_face" },
  { zAnatomyName: "Maxilla.r", nodeId: "bone_maxilla", region: "atlas_head_face" },
  { zAnatomyName: "Nasal bone.r", nodeId: "bone_nasal", region: "atlas_head_face" },
  { zAnatomyName: "Zygomatic bone.r", nodeId: "bone_zygomatic", region: "atlas_head_face" },
  { zAnatomyName: "Hyoid bone", nodeId: "bone_hyoid", region: "atlas_head_face" },
  { zAnatomyName: "Frontalis.r", nodeId: "muscle_frontalis", region: "atlas_head_face" },
  { zAnatomyName: "Superficial part of masseter.r", nodeId: "muscle_masseter", region: "atlas_head_face" },
  { zAnatomyName: "Deep part of masseter.r", nodeId: "muscle_masseter", region: "atlas_head_face" },
  { zAnatomyName: "Temporalis muscle.r", nodeId: "muscle_temporalis", region: "atlas_head_face" },
  { zAnatomyName: "Platysma.r", nodeId: "muscle_platysma", region: "atlas_head_face" },
  { zAnatomyName: "Zygomaticus major muscle.r", nodeId: "muscle_zygomaticus_major", region: "atlas_head_face" },
  { zAnatomyName: "Zygomaticus minor muscle.r", nodeId: "muscle_zygomaticus_minor", region: "atlas_head_face" },
  { zAnatomyName: "Orbicularis oris", nodeId: "muscle_orbicularis_oris", region: "atlas_head_face" },
  { zAnatomyName: "Palpebral part of orbicularis oculi.r", nodeId: "muscle_orbicularis_oculi", region: "atlas_head_face" },
  { zAnatomyName: "Orbital part of orbicularis oculi.r", nodeId: "muscle_orbicularis_oculi", region: "atlas_head_face" },
  { zAnatomyName: "Mentalis muscle.r", nodeId: "muscle_mentalis", region: "atlas_head_face" },
  { zAnatomyName: "Nasalis muscle.r", nodeId: "muscle_nasalis", region: "atlas_head_face" },
  { zAnatomyName: "Depressor anguli oris.r", nodeId: "muscle_depressor_anguli_oris", region: "atlas_head_face" },
  { zAnatomyName: "Levator labii superioris.r", nodeId: "muscle_levator_labii_superioris", region: "atlas_head_face" },
  { zAnatomyName: "Risorius.r", nodeId: "muscle_risorius", region: "atlas_head_face" },
  { zAnatomyName: "Bucinator.r", nodeId: "muscle_bucinator", region: "atlas_head_face" },
  { zAnatomyName: "Corrugator supercilii.r", nodeId: "muscle_corrugator_supercilii", region: "atlas_head_face" },
  { zAnatomyName: "Depressor labii superioris.r", nodeId: "muscle_depressor_labii_superioris", region: "atlas_head_face" },
  { zAnatomyName: "Depressor septi nasi.r", nodeId: "muscle_depressor_septi_nasi", region: "atlas_head_face" },
  { zAnatomyName: "Levator anguli oris.r", nodeId: "muscle_levator_anguli_oris", region: "atlas_head_face" },
  { zAnatomyName: "Levator nasolabialis.r", nodeId: "muscle_levator_nasolabialis", region: "atlas_head_face" },
  { zAnatomyName: "Procerus.r", nodeId: "muscle_procerus", region: "atlas_head_face" },
  { zAnatomyName: "Frontal region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Zygomatic region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Nasal region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Orbital region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Infraorbital region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Buccal region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Oral region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Mental region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Submental region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Auricular region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Temporal region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Occipital region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Parietal region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Mastoid region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Parotidomassetereic region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Posterior cervical region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Lateral cervical region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Sternocleidomastoid region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Presternal region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Pectoral region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Deltoid region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Inframammary region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Epigastric region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Umbilical region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Hypogastric region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Inguinal region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Hypochondriac region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Lumbar region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Sacral region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Gluteal region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Hip region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Infrascapular region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Scapular region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Vertebral region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Lateral retromalleolar region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Medial retromalleolar region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Heel region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Metatarsal region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Urogenital region.r", nodeId: "skin_envelope", region: "atlas_skin" },
  { zAnatomyName: "Anal region.r", nodeId: "skin_envelope", region: "atlas_skin" },
] as const;

export const SKIN_OVERLAY_MESH_IDS = new Set([
  'skin_envelope',
  'eye_globes',
  'skin_face',
  'skin_neck_shoulder',
  'skin_back',
  'skin_limbs',
  'skin_torso',
  'skin_hand_digits',
  'skin_foot_digits',
  'skin_eminences',
]);

const CURRICULUM_NODE_IDS = new Set(
  [
    ...fundamentalsNodes,
    ...torsoNodes,
    ...shoulderNeckNodes,
    ...armNodes,
    ...handNodes,
    ...legNodes,
    ...footNodes,
  ].map((node) => node.id),
);

/** Atlas-only nodes exported with curriculum ids as GLB mesh names (not Z-Anatomy aliases). */
const ATLAS_ONLY_NODE_IDS = new Set(
  [...atlasSupplementNodes, ...atlasHeadFaceNodes].map((node) => node.id),
);

const zAnatomyNamesByNodeId = new Map<string, string[]>();
const nodeIdByZAnatomyName = new Map<string, string>();

for (const row of Z_ANATOMY_BRIDGE) {
  nodeIdByZAnatomyName.set(row.zAnatomyName, row.nodeId);
  const list = zAnatomyNamesByNodeId.get(row.nodeId) ?? [];
  list.push(row.zAnatomyName);
  zAnatomyNamesByNodeId.set(row.nodeId, list);
}

/** Curriculum node id for a Z-Anatomy mesh object name (if mapped). */
export function curriculumNodeIdFromZAnatomyName(zAnatomyName: string): string | undefined {
  return nodeIdByZAnatomyName.get(zAnatomyName);
}

/** Resolve a GLB mesh name to a curriculum node id (direct id or Z-Anatomy alias). */
export function resolveCurriculumNodeId(meshName: string): string | undefined {
  if (SKIN_OVERLAY_MESH_IDS.has(meshName)) return meshName;
  if (/^Skin_Generated/i.test(meshName) || /^grp\d/i.test(meshName)) return 'skin_back';
  if (ATLAS_ONLY_NODE_IDS.has(meshName)) return meshName;
  if (CURRICULUM_NODE_IDS.has(meshName)) return meshName;
  if (ATLAS_MESH_NODE_IDS.has(meshName)) return meshName;
  return nodeIdByZAnatomyName.get(meshName);
}

/** Known Z-Anatomy source names that collapse into one curriculum node. */
export function zAnatomyNamesForNodeId(nodeId: string): readonly string[] {
  return zAnatomyNamesByNodeId.get(nodeId) ?? [];
}
