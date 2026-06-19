import { describe, expect, it } from 'vitest';
import {
  curriculumNodeIdFromZAnatomyName,
  resolveCurriculumNodeId,
  zAnatomyNamesForNodeId,
} from './zAnatomyBridge';

describe('zAnatomyBridge', () => {
  it('maps Z-Anatomy object names to curriculum ids', () => {
    expect(curriculumNodeIdFromZAnatomyName('Humerus.r')).toBe('bone_humerus');
    expect(curriculumNodeIdFromZAnatomyName('Unknown mesh')).toBeUndefined();
  });

  it('resolves direct curriculum ids and aliases', () => {
    expect(resolveCurriculumNodeId('bone_skull')).toBe('bone_skull');
    expect(resolveCurriculumNodeId('bone_sternum')).toBe('bone_sternum');
    expect(resolveCurriculumNodeId('muscle_pectoralis_major')).toBe('muscle_pectoralis_major');
    expect(resolveCurriculumNodeId('bone_humerus')).toBe('bone_humerus');
    expect(resolveCurriculumNodeId('Humerus.r')).toBe('bone_humerus');
  });

  it('lists Z-Anatomy names per node id', () => {
    expect(zAnatomyNamesForNodeId('bone_humerus')).toContain('Humerus.r');
  });
});
