import type { MuscleRegion } from '../types/node';

export interface StudyGroupNodeRef {
  nodeId: string;
}

export interface StudyGroup {
  id: string;
  label: string;
  moduleId: MuscleRegion;
  children: Array<StudyGroup | StudyGroupNodeRef>;
  defaultExpanded?: boolean;
}

export function isStudyGroupNodeRef(
  child: StudyGroup | StudyGroupNodeRef,
): child is StudyGroupNodeRef {
  return 'nodeId' in child;
}

/** Single-structure browse entry (not a multi-member muscle group). */
function leaf(id: string, label: string, moduleId: MuscleRegion, nodeId: string): StudyGroup {
  return { id, label, moduleId, children: [{ nodeId }] };
}

/**
 * Study tree for module guides and group focus.
 * Multi-member groups use standard anatomical names (deltoid, quadriceps, rotator cuff, etc.).
 * Regional buckets like "front torso" or "forearm" are intentionally avoided.
 */
export const STUDY_GROUPS_BY_MODULE: Partial<Record<MuscleRegion, StudyGroup[]>> = {
  fundamentals: [
    {
      id: 'fund_head_neck',
      label: 'Head & neck',
      moduleId: 'fundamentals',
      defaultExpanded: true,
      children: [{ nodeId: 'bone_skull' }],
    },
    {
      id: 'fund_torso_core',
      label: 'Torso core',
      moduleId: 'fundamentals',
      defaultExpanded: true,
      children: [
        { nodeId: 'bone_sternum' },
        { nodeId: 'bone_ribcage' },
        {
          id: 'fund_spine_group',
          label: 'Spine',
          moduleId: 'fundamentals',
          children: [{ nodeId: 'bone_spine' }],
        },
        { nodeId: 'bone_pelvis' },
      ],
    },
    {
      id: 'fund_arm',
      label: 'Arm',
      moduleId: 'fundamentals',
      defaultExpanded: true,
      children: [
        {
          id: 'fund_arm_bones',
          label: 'Bones',
          moduleId: 'fundamentals',
          children: [{ nodeId: 'bone_humerus' }, { nodeId: 'bone_radius' }, { nodeId: 'bone_ulna' }],
        },
        {
          id: 'fund_arm_joints',
          label: 'Joints',
          moduleId: 'fundamentals',
          children: [{ nodeId: 'joint_shoulder' }, { nodeId: 'joint_elbow' }],
        },
      ],
    },
    {
      id: 'fund_leg',
      label: 'Leg',
      moduleId: 'fundamentals',
      defaultExpanded: true,
      children: [
        {
          id: 'fund_leg_bones',
          label: 'Bones',
          moduleId: 'fundamentals',
          children: [{ nodeId: 'bone_femur' }, { nodeId: 'bone_tibia' }],
        },
        {
          id: 'fund_leg_joints',
          label: 'Joints',
          moduleId: 'fundamentals',
          children: [{ nodeId: 'joint_hip' }, { nodeId: 'joint_knee' }],
        },
      ],
    },
  ],
  torso: [
    {
      id: 'torso_bones',
      label: 'Bones',
      moduleId: 'torso',
      defaultExpanded: true,
      children: [{ nodeId: 'bone_ribcage' }],
    },
    leaf('torso_pectoralis_major', 'Pectoralis major', 'torso', 'muscle_pectoralis_major'),
    leaf('torso_rectus_abdominis', 'Rectus abdominis', 'torso', 'muscle_rectus_abdominis'),
    leaf('torso_external_oblique', 'External oblique', 'torso', 'muscle_external_oblique'),
    leaf('torso_serratus_anterior', 'Serratus anterior', 'torso', 'muscle_serratus_anterior'),
    leaf('torso_latissimus_dorsi', 'Latissimus dorsi', 'torso', 'muscle_latissimus_dorsi'),
    leaf('torso_erector_spinae', 'Erector spinae group', 'torso', 'muscle_erector_spinae'),
  ],
  shoulder_neck: [
    {
      id: 'sn_girdle',
      label: 'Shoulder girdle',
      moduleId: 'shoulder_neck',
      defaultExpanded: true,
      children: [
        {
          id: 'sn_girdle_bones',
          label: 'Bones',
          moduleId: 'shoulder_neck',
          children: [{ nodeId: 'bone_clavicle' }, { nodeId: 'bone_scapula' }],
        },
        { nodeId: 'joint_sternoclavicular' },
      ],
    },
    {
      id: 'sn_deltoid',
      label: 'Deltoid',
      moduleId: 'shoulder_neck',
      defaultExpanded: true,
      children: [
        { nodeId: 'muscle_deltoid_anterior' },
        { nodeId: 'muscle_deltoid_lateral' },
        { nodeId: 'muscle_deltoid_posterior' },
      ],
    },
    {
      id: 'sn_rotator_cuff',
      label: 'Rotator cuff',
      moduleId: 'shoulder_neck',
      defaultExpanded: true,
      children: [{ nodeId: 'muscle_supraspinatus' }, { nodeId: 'muscle_infraspinatus' }],
    },
    leaf('sn_trapezius', 'Upper trapezius', 'shoulder_neck', 'muscle_trapezius_upper'),
    leaf('sn_scm', 'Sternocleidomastoid', 'shoulder_neck', 'muscle_sternocleidomastoid'),
    leaf('sn_rhomboid_major', 'Rhomboid major', 'shoulder_neck', 'muscle_rhomboid_major'),
    leaf('sn_teres_major', 'Teres major', 'shoulder_neck', 'muscle_teres_major'),
  ],
  arm: [
    leaf('arm_biceps', 'Biceps brachii', 'arm', 'muscle_biceps_brachii'),
    leaf('arm_triceps', 'Triceps brachii', 'arm', 'muscle_triceps_long_head'),
    leaf('arm_brachialis', 'Brachialis', 'arm', 'muscle_brachialis'),
    leaf('arm_brachioradialis', 'Brachioradialis', 'arm', 'muscle_brachioradialis'),
    leaf('arm_ecr', 'Extensor carpi radialis', 'arm', 'muscle_extensor_carpi_radialis'),
    leaf('arm_fcr', 'Flexor carpi radialis', 'arm', 'muscle_flexor_carpi_radialis'),
  ],
  hand: [
    {
      id: 'hand_bones',
      label: 'Bones',
      moduleId: 'hand',
      defaultExpanded: true,
      children: [
        { nodeId: 'bone_carpals' },
        { nodeId: 'bone_metacarpals' },
        { nodeId: 'bone_phalanges_hand' },
      ],
    },
    {
      id: 'hand_thenar',
      label: 'Thenar muscles',
      moduleId: 'hand',
      defaultExpanded: true,
      children: [{ nodeId: 'muscle_thenar_eminence' }, { nodeId: 'muscle_flexor_pollicis_brevis' }],
    },
    leaf('hand_hypothenar', 'Hypothenar eminence', 'hand', 'muscle_hypothenar_eminence'),
    {
      id: 'hand_intrinsic',
      label: 'Intrinsic muscles of the hand',
      moduleId: 'hand',
      defaultExpanded: true,
      children: [{ nodeId: 'muscle_lumbricals_hand' }, { nodeId: 'muscle_dorsal_interossei_hand' }],
    },
    leaf('hand_fds', 'Flexor digitorum superficialis', 'hand', 'muscle_flexor_digitorum_superficialis'),
    leaf('hand_edc', 'Extensor digitorum', 'hand', 'muscle_extensor_digitorum'),
  ],
  leg: [
    {
      id: 'leg_quads',
      label: 'Quadriceps femoris',
      moduleId: 'leg',
      defaultExpanded: true,
      children: [
        { nodeId: 'muscle_quadriceps_rectus_femoris' },
        { nodeId: 'muscle_vastus_lateralis' },
        { nodeId: 'muscle_vastus_medialis' },
        { nodeId: 'muscle_vastus_intermedius' },
      ],
    },
    {
      id: 'leg_hamstrings',
      label: 'Hamstrings',
      moduleId: 'leg',
      defaultExpanded: true,
      children: [
        { nodeId: 'muscle_hamstrings_biceps_femoris' },
        { nodeId: 'muscle_semitendinosus' },
        { nodeId: 'muscle_semimembranosus' },
      ],
    },
    {
      id: 'leg_gluteal',
      label: 'Gluteal muscles',
      moduleId: 'leg',
      defaultExpanded: true,
      children: [
        { nodeId: 'muscle_gluteus_maximus' },
        { nodeId: 'muscle_gluteus_medius' },
        { nodeId: 'muscle_gluteus_minimus' },
      ],
    },
    leaf('leg_tfl', 'Tensor fasciae latae', 'leg', 'muscle_tensor_fasciae_latae'),
    leaf('leg_adductor_longus', 'Adductor longus', 'leg', 'muscle_adductor_longus'),
    leaf('leg_gastrocnemius', 'Gastrocnemius', 'leg', 'muscle_gastrocnemius'),
    leaf('leg_tibialis_anterior', 'Tibialis anterior', 'leg', 'muscle_tibialis_anterior'),
    {
      id: 'leg_bones',
      label: 'Bones',
      moduleId: 'leg',
      defaultExpanded: true,
      children: [{ nodeId: 'bone_femur' }, { nodeId: 'bone_tibia' }, { nodeId: 'bone_patella' }],
    },
  ],
  foot: [
    {
      id: 'foot_bones',
      label: 'Bones',
      moduleId: 'foot',
      defaultExpanded: true,
      children: [
        { nodeId: 'bone_calcaneus' },
        { nodeId: 'bone_talus' },
        { nodeId: 'bone_tarsals' },
        { nodeId: 'bone_metatarsals' },
        { nodeId: 'bone_phalanges_foot' },
      ],
    },
    leaf('foot_abductor_hallucis', 'Abductor hallucis', 'foot', 'muscle_abductor_hallucis'),
    leaf('foot_fdb', 'Flexor digitorum brevis', 'foot', 'muscle_flexor_digitorum_brevis'),
    leaf('foot_lumbricals', 'Lumbricals', 'foot', 'muscle_lumbricals_foot'),
    leaf('foot_edb', 'Extensor digitorum brevis', 'foot', 'muscle_extensor_digitorum_brevis'),
    leaf('foot_peroneus', 'Peroneus longus', 'foot', 'muscle_peroneus_longus'),
  ],
};

export function collectNodeIdsFromGroup(group: StudyGroup): string[] {
  const ids: string[] = [];
  for (const child of group.children) {
    if (isStudyGroupNodeRef(child)) ids.push(child.nodeId);
    else ids.push(...collectNodeIdsFromGroup(child));
  }
  return ids;
}

export function getStudyGroupsForModule(moduleId: MuscleRegion): StudyGroup[] {
  return STUDY_GROUPS_BY_MODULE[moduleId] ?? [];
}

export function findStudyGroupById(moduleId: MuscleRegion, groupId: string): StudyGroup | undefined {
  const walk = (groups: StudyGroup[]): StudyGroup | undefined => {
    for (const g of groups) {
      if (g.id === groupId) return g;
      const nested = g.children.filter((c): c is StudyGroup => !isStudyGroupNodeRef(c));
      const found = walk(nested);
      if (found) return found;
    }
    return undefined;
  };
  return walk(getStudyGroupsForModule(moduleId));
}

/** Match a focused set of node ids to the nearest study group (order-insensitive). */
export function findStudyGroupByNodeIds(
  moduleId: MuscleRegion,
  nodeIds: readonly string[],
): StudyGroup | undefined {
  if (nodeIds.length === 0) return undefined;
  const target = new Set(nodeIds);
  const walk = (groups: StudyGroup[]): StudyGroup | undefined => {
    for (const group of groups) {
      const groupIds = collectNodeIdsFromGroup(group);
      if (
        groupIds.length === target.size &&
        groupIds.every((id) => target.has(id))
      ) {
        return group;
      }
      const nested = group.children.filter((c): c is StudyGroup => !isStudyGroupNodeRef(c));
      const found = walk(nested);
      if (found) return found;
    }
    return undefined;
  };
  return walk(getStudyGroupsForModule(moduleId));
}
