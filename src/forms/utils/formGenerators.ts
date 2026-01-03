import {
  BoxGeometry,
  SphereGeometry,
  CylinderGeometry,
  ConeGeometry,
  BufferGeometry,
} from 'three';
import type { FormType } from '../types';

/**
 * Creates a pyramid geometry (square base)
 * Three.js doesn't have a built-in pyramid, so we create one from a cone with 4 segments
 */
function createPyramidGeometry(size: number): BufferGeometry {
  // Use ConeGeometry with 4 radial segments for a pyramid
  return new ConeGeometry(size * 0.7, size, 4, 1);
}

/**
 * Creates the appropriate Three.js geometry for a given form type
 * Using medium poly counts - enough for smooth curves but not overwhelming
 */
export function createGeometry(type: FormType, size: number = 1): BufferGeometry {
  switch (type) {
    case 'box':
      return new BoxGeometry(size, size, size);
    
    case 'sphere':
      // Medium poly sphere - 16 segments for visible but clean facets
      return new SphereGeometry(size * 0.5, 16, 12);
    
    case 'cylinder':
      // Medium poly cylinder - 16 sides
      return new CylinderGeometry(size * 0.4, size * 0.4, size, 16, 1);
    
    case 'cone':
      // Medium poly cone - 16 sides
      return new ConeGeometry(size * 0.5, size, 16, 1);
    
    case 'pyramid':
      return createPyramidGeometry(size);
    
    default:
      return new BoxGeometry(size, size, size);
  }
}

/**
 * Returns an approximate bounding radius for a form type at a given size
 * Used for placement calculations
 */
export function getFormBoundingRadius(type: FormType, size: number = 1): number {
  switch (type) {
    case 'box':
      // Diagonal of a cube: size * sqrt(3) / 2
      return size * 0.866;
    
    case 'sphere':
      return size * 0.5;
    
    case 'cylinder':
      // sqrt(radius^2 + (height/2)^2)
      return Math.sqrt((size * 0.4) ** 2 + (size * 0.5) ** 2);
    
    case 'cone':
      return Math.sqrt((size * 0.5) ** 2 + (size * 0.5) ** 2);
    
    case 'pyramid':
      return Math.sqrt((size * 0.7) ** 2 + (size * 0.5) ** 2);
    
    default:
      return size * 0.866;
  }
}

/**
 * All available form types
 */
export const ALL_FORM_TYPES: FormType[] = ['box', 'sphere', 'cylinder', 'cone', 'pyramid'];

/**
 * Human-readable labels for form types
 */
export const FORM_TYPE_LABELS: Record<FormType, string> = {
  box: 'Box',
  sphere: 'Sphere',
  cylinder: 'Cylinder',
  cone: 'Cone',
  pyramid: 'Pyramid',
};
