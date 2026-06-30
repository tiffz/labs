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
    {
      id: 'torso_pecs',
      label: 'Pecs (chest)',
      moduleId: 'torso',
      defaultExpanded: true,
      children: [{ nodeId: 'muscle_pectoralis_major' }],
    },
    {
      id: 'torso_front',
      label: 'Front torso',
      moduleId: 'torso',
      defaultExpanded: true,
      children: [
        { nodeId: 'muscle_rectus_abdominis' },
        { nodeId: 'muscle_external_oblique' },
        { nodeId: 'muscle_serratus_anterior' },
      ],
    },
    {
      id: 'torso_back',
      label: 'Back torso',
      moduleId: 'torso',
      defaultExpanded: true,
      children: [{ nodeId: 'muscle_latissimus_dorsi' }, { nodeId: 'muscle_erector_spinae' }],
    },
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
      id: 'sn_neck',
      label: 'Neck & upper back',
      moduleId: 'shoulder_neck',
      defaultExpanded: true,
      children: [
        { nodeId: 'muscle_trapezius_upper' },
        { nodeId: 'muscle_sternocleidomastoid' },
        { nodeId: 'muscle_rhomboid_major' },
      ],
    },
    {
      id: 'sn_rotator',
      label: 'Rotator cuff',
      moduleId: 'shoulder_neck',
      children: [
        { nodeId: 'muscle_infraspinatus' },
        { nodeId: 'muscle_teres_major' },
        { nodeId: 'muscle_supraspinatus' },
      ],
    },
  ],
  arm: [
    {
      id: 'arm_upper',
      label: 'Upper arm',
      moduleId: 'arm',
      defaultExpanded: true,
      children: [
        { nodeId: 'muscle_biceps_brachii' },
        { nodeId: 'muscle_triceps_long_head' },
        { nodeId: 'muscle_brachialis' },
      ],
    },
    {
      id: 'arm_forearm',
      label: 'Forearm',
      moduleId: 'arm',
      defaultExpanded: true,
      children: [
        { nodeId: 'muscle_brachioradialis' },
        { nodeId: 'muscle_extensor_carpi_radialis' },
        { nodeId: 'muscle_flexor_carpi_radialis' },
      ],
    },
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
      id: 'hand_palm',
      label: 'Palm masses',
      moduleId: 'hand',
      defaultExpanded: true,
      children: [
        { nodeId: 'muscle_thenar_eminence' },
        { nodeId: 'muscle_hypothenar_eminence' },
        { nodeId: 'muscle_flexor_pollicis_brevis' },
      ],
    },
    {
      id: 'hand_intrinsic',
      label: 'Intrinsic muscles',
      moduleId: 'hand',
      defaultExpanded: true,
      children: [
        { nodeId: 'muscle_lumbricals_hand' },
        { nodeId: 'muscle_dorsal_interossei_hand' },
      ],
    },
    {
      id: 'hand_tendons',
      label: 'Tendons',
      moduleId: 'hand',
      children: [
        { nodeId: 'muscle_flexor_digitorum_superficialis' },
        { nodeId: 'muscle_extensor_digitorum' },
      ],
    },
  ],
  leg: [
    {
      id: 'leg_quads',
      label: 'Quads (front thigh)',
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
      label: 'Hamstrings (back thigh)',
      moduleId: 'leg',
      defaultExpanded: true,
      children: [
        { nodeId: 'muscle_hamstrings_biceps_femoris' },
        { nodeId: 'muscle_semitendinosus' },
        { nodeId: 'muscle_semimembranosus' },
      ],
    },
    {
      id: 'leg_hip',
      label: 'Hip & butt',
      moduleId: 'leg',
      defaultExpanded: true,
      children: [
        { nodeId: 'muscle_gluteus_maximus' },
        { nodeId: 'muscle_gluteus_medius' },
        { nodeId: 'muscle_gluteus_minimus' },
        { nodeId: 'muscle_tensor_fasciae_latae' },
      ],
    },
    {
      id: 'leg_adductors',
      label: 'Inner thigh',
      moduleId: 'leg',
      children: [{ nodeId: 'muscle_adductor_longus' }],
    },
    {
      id: 'leg_calf',
      label: 'Calf & shin',
      moduleId: 'leg',
      children: [{ nodeId: 'muscle_gastrocnemius' }, { nodeId: 'muscle_tibialis_anterior' }],
    },
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
    {
      id: 'foot_arch',
      label: 'Arch & sole',
      moduleId: 'foot',
      defaultExpanded: true,
      children: [
        { nodeId: 'muscle_abductor_hallucis' },
        { nodeId: 'muscle_flexor_digitorum_brevis' },
        { nodeId: 'muscle_lumbricals_foot' },
      ],
    },
    {
      id: 'foot_dorsal',
      label: 'Dorsal foot',
      moduleId: 'foot',
      children: [{ nodeId: 'muscle_extensor_digitorum_brevis' }],
    },
    {
      id: 'foot_lateral',
      label: 'Lateral ankle',
      moduleId: 'foot',
      children: [{ nodeId: 'muscle_peroneus_longus' }],
    },
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
