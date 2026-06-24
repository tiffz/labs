import { describe, expect, it } from 'vitest';
import { resolveCurriculumNodeId } from '../../curriculum/zAnatomyBridge';
import { shouldIncludeAtlasCompleteMesh } from './fullBodyAtlasFilter';

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
  it('excludes curriculum duplicates and glute atlas fragments', () => {
    expect(shouldIncludeAtlasCompleteMesh('muscle_gluteus_maximus')).toBe(false);
    expect(shouldIncludeAtlasCompleteMesh('muscle_latissimus_dorsi')).toBe(false);
    expect(shouldIncludeAtlasCompleteMesh('atlas_gluteus_maximus_ending_on_gluteal_su_e5109520')).toBe(
      false,
    );
  });

  it('includes atlas registry fill nodes', () => {
    expect(shouldIncludeAtlasCompleteMesh('atlas_abductor_digiti_minimi_r_84af0e15')).toBe(true);
  });
});
