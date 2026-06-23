import { describe, expect, it } from 'vitest';

import {
  classifyMuscleLayerDepth,
  layerDepthForAtlasKind,
} from './muscleLayerClassification';

describe('muscleLayerClassification', () => {
  it('classifies superficial silhouette muscles', () => {
    expect(classifyMuscleLayerDepth('Gluteus maximus muscle.r')).toBe(0);
    expect(classifyMuscleLayerDepth('Pectoralis major muscle.r')).toBe(0);
  });

  it('classifies deep rotator cuff and hip rotators', () => {
    expect(classifyMuscleLayerDepth('Subscapular muscle.r')).toBe(2);
    expect(classifyMuscleLayerDepth('Gluteus minimus muscle.r')).toBe(2);
    expect(classifyMuscleLayerDepth('Piriformis muscle.r')).toBe(2);
  });

  it('defaults unknown muscles to intermediate', () => {
    expect(classifyMuscleLayerDepth('Teres major muscle.r')).toBe(1);
  });

  it('maps bones to skeleton layer', () => {
    expect(layerDepthForAtlasKind('bone', 'Femur.r')).toBe(3);
    expect(layerDepthForAtlasKind('muscle', 'Gluteus medius muscle.r')).toBe(1);
  });
});
