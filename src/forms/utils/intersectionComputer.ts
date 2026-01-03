import {
  LineSegments,
  LineBasicMaterial,
  Group,
  EdgesGeometry,
  BoxGeometry,
  SphereGeometry,
  CylinderGeometry,
  ConeGeometry,
} from 'three';
import { Brush, Evaluator, INTERSECTION } from 'three-bvh-csg';
import type { FormConfig } from '../types';

// Cache the evaluator for reuse
let evaluator: Evaluator | null = null;

function getEvaluator(): Evaluator {
  if (!evaluator) {
    evaluator = new Evaluator();
  }
  return evaluator;
}

/**
 * Creates a unit-size geometry for CSG intersection computation
 * Uses higher polygon counts for smooth intersection curves on rounded forms
 */
function createUnitGeometry(type: string): BoxGeometry | SphereGeometry | CylinderGeometry | ConeGeometry {
  switch (type) {
    case 'box':
      return new BoxGeometry(1, 1, 1);
    case 'sphere':
      // High segment count for smooth intersection curves
      return new SphereGeometry(0.5, 48, 32);
    case 'cylinder':
      // High radial segments for smooth curves
      return new CylinderGeometry(0.4, 0.4, 1, 48, 1);
    case 'cone':
      // High radial segments for smooth curves
      return new ConeGeometry(0.5, 1, 48, 1);
    case 'pyramid':
      // Pyramid keeps 4 sides (it's meant to be angular)
      return new ConeGeometry(0.7, 1, 4, 1);
    default:
      return new BoxGeometry(1, 1, 1);
  }
}

/**
 * Creates a Brush from a FormConfig
 * Forms use unit-size geometry with scale applied
 */
function createBrushFromForm(form: FormConfig): Brush {
  // Create unit-size geometry (matching how forms are rendered)
  const geometry = createUnitGeometry(form.type);
  const brush = new Brush(geometry);
  
  // Apply position, rotation, and scale
  brush.position.set(form.position[0], form.position[1], form.position[2]);
  brush.rotation.set(form.rotation[0], form.rotation[1], form.rotation[2]);
  brush.scale.set(form.scale[0], form.scale[1], form.scale[2]);
  
  brush.updateMatrixWorld(true);
  
  return brush;
}

/**
 * Computes intersection curves between two forms
 */
export function computeIntersectionEdges(
  formA: FormConfig,
  formB: FormConfig,
  color: string
): LineSegments | null {
  try {
    const eval_ = getEvaluator();
    
    const brushA = createBrushFromForm(formA);
    const brushB = createBrushFromForm(formB);
    
    // Compute the intersection volume
    const result = eval_.evaluate(brushA, brushB, INTERSECTION);
    
    if (!result || !result.geometry || result.geometry.attributes.position.count === 0) {
      brushA.geometry.dispose();
      brushB.geometry.dispose();
      return null;
    }
    
    // Extract edges - use moderate threshold (60 degrees) to get the 
    // intersection curves while filtering some internal noise
    const edgesGeometry = new EdgesGeometry(result.geometry, 60);
    
    if (edgesGeometry.attributes.position.count === 0) {
      brushA.geometry.dispose();
      brushB.geometry.dispose();
      result.geometry.dispose();
      edgesGeometry.dispose();
      return null;
    }
    
    const material = new LineBasicMaterial({
      color,
      linewidth: 2,
    });
    
    const lines = new LineSegments(edgesGeometry, material);
    
    // Clean up
    brushA.geometry.dispose();
    brushB.geometry.dispose();
    result.geometry.dispose();
    
    return lines;
  } catch (error) {
    console.warn('Failed to compute intersection:', error);
    return null;
  }
}

/**
 * Computes all intersection curves for a set of forms
 */
export function computeAllIntersections(
  forms: FormConfig[],
  color: string
): Group {
  const group = new Group();
  
  for (let i = 0; i < forms.length; i++) {
    for (let j = i + 1; j < forms.length; j++) {
      if (!mightIntersect(forms[i], forms[j])) {
        continue;
      }
      
      const lines = computeIntersectionEdges(forms[i], forms[j], color);
      if (lines) {
        group.add(lines);
      }
    }
  }
  
  return group;
}

/**
 * Quick check if two forms might intersect based on bounding spheres
 */
export function mightIntersect(formA: FormConfig, formB: FormConfig): boolean {
  const dist = Math.sqrt(
    (formA.position[0] - formB.position[0]) ** 2 +
    (formA.position[1] - formB.position[1]) ** 2 +
    (formA.position[2] - formB.position[2]) ** 2
  );
  
  // Use stored radius (which accounts for actual form size)
  const radiusA = formA.radius || Math.max(...formA.scale) * 1.2;
  const radiusB = formB.radius || Math.max(...formB.scale) * 1.2;
  
  return dist < radiusA + radiusB;
}
