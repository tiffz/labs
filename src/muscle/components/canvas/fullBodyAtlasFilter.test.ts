import { describe, expect, it } from 'vitest';
import { resolveCurriculumNodeId } from '../../curriculum/zAnatomyBridge';
import { shouldIncludeAtlasCompleteMesh, shouldIncludeHeadFaceAtlasMesh } from './fullBodyAtlasFilter';

describe('skin overlay node ids', () => {
  it('resolves detail skin overlay mesh names for GLB extraction', () => {
    for (const id of [
      'skin_envelope',
      'skin_face',
      'skin_neck_shoulder',
      'skin_back',
      'skin_hand_digits',
      'skin_foot_digits',
      'eye_globes',
    ]) {
      expect(resolveCurriculumNodeId(id), id).toBe(id);
    }
  });

  it('resolves orphan skin export mesh names to skin_back', () => {
    expect(resolveCurriculumNodeId('Skin_Generated_Mesh_From_X3D.050')).toBe('skin_back');
    expect(resolveCurriculumNodeId('grp1.010')).toBe('skin_back');
  });

  it('resolves atlas supplement GLB mesh names', () => {
    expect(resolveCurriculumNodeId('muscle_gluteus_maximus')).toBe('muscle_gluteus_maximus');
  });
});

describe('shouldIncludeAtlasCompleteMesh', () => {
  it('excludes curriculum duplicates and regional atlas fragments', () => {
    expect(shouldIncludeAtlasCompleteMesh('muscle_gluteus_maximus')).toBe(false);
    expect(shouldIncludeAtlasCompleteMesh('muscle_latissimus_dorsi')).toBe(false);
    expect(shouldIncludeAtlasCompleteMesh('atlas_gluteus_maximus_ending_on_gluteal_su_e5109520')).toBe(
      false,
    );
    expect(shouldIncludeAtlasCompleteMesh('atlas_pectoralis_major_muscle_clavicular_i_25190cac')).toBe(
      false,
    );
    expect(shouldIncludeAtlasCompleteMesh('atlas_deltoid_muscle_humeral_insertion_r_ed353102')).toBe(
      false,
    );
    expect(shouldIncludeAtlasCompleteMesh('atlas_ascending_part_of_trapezius_muscle_a_24ed9b10')).toBe(
      false,
    );
  });

  it('excludes atlas_complete orbital inserts', () => {
    expect(shouldIncludeAtlasCompleteMesh('atlas_sclera_r_001_c2981b7e')).toBe(false);
    expect(shouldIncludeAtlasCompleteMesh('atlas_abductor_digiti_minimi_r_84af0e15')).toBe(true);
  });
});

describe('shouldIncludeHeadFaceAtlasMesh', () => {
  it('excludes sclera and extraocular inserts for empty orbital sockets', () => {
    expect(shouldIncludeHeadFaceAtlasMesh('atlas_sclera_r_001_c2981b7e')).toBe(false);
    expect(shouldIncludeHeadFaceAtlasMesh('atlas_medial_rectus_muscle_r_ff5fdc86')).toBe(false);
    expect(shouldIncludeHeadFaceAtlasMesh('muscle_orbicularis_oculi')).toBe(true);
  });
});
