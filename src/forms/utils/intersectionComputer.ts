import {
  Group,
  EdgesGeometry,
  BoxGeometry,
  SphereGeometry,
  CylinderGeometry,
  ConeGeometry,
  Color,
} from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
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
 * Very high polygon counts for smooth intersection curves
 */
function createUnitGeometry(type: string): BoxGeometry | SphereGeometry | CylinderGeometry | ConeGeometry {
  switch (type) {
    case 'box':
      return new BoxGeometry(1, 1, 1);
    case 'sphere':
      // Very high segments for smooth curved intersection lines
      return new SphereGeometry(0.5, 96, 72);
    case 'cylinder':
      // Very high radial segments for smooth curves
      return new CylinderGeometry(0.4, 0.4, 1, 96, 1);
    case 'cone':
      // Very high radial segments for smooth curves
      return new ConeGeometry(0.5, 1, 96, 1);
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
 * Returns a Group with two sets of lines:
 * - Subtle internal edges (portions of one form's surface inside the other)
 * - Prominent boundary edges (the actual intersection curve where surfaces meet)
 */
export function computeIntersectionEdges(
  formA: FormConfig,
  formB: FormConfig,
  color: string
): Group | null {
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
    
    // Use EdgesGeometry with very low threshold (10°) 
    // Captures nearly all intersection curves including shallow cone/pyramid angles
    const edgesGeometry = new EdgesGeometry(result.geometry, 10);
    
    if (edgesGeometry.attributes.position.count === 0) {
      brushA.geometry.dispose();
      brushB.geometry.dispose();
      result.geometry.dispose();
      edgesGeometry.dispose();
      return null;
    }
    
    // With 85° threshold, just use all edges - they should all be boundaries
    const positions = edgesGeometry.attributes.position.array as Float32Array;
    const boundaryPositions = Array.from(positions);
    
    const group = new Group();
    
    // Render boundary edges prominently (true intersection curve)
    // Like drawing with a sharpie on the surface where forms intersect
    // Forms in front should still occlude these lines
    if (boundaryPositions.length > 0) {
      // Use LineSegments2 with LineMaterial for actual thick lines
      const lineGeometry = new LineSegmentsGeometry();
      lineGeometry.setPositions(boundaryPositions);
      
      const lineMaterial = new LineMaterial({
        color: new Color(color).getHex(),
        linewidth: 1.5, // Thinner lines for cleaner look
        depthTest: true, // Forms in front CAN occlude these lines
        depthWrite: false, // Don't write to depth buffer
        transparent: true,
        opacity: 0.85, // Slight transparency for softer appearance
        worldUnits: false, // Use screen-space pixels for line width
        polygonOffset: true,
        polygonOffsetFactor: -4, // Render slightly in front of surface to avoid z-fighting
        polygonOffsetUnits: -4,
      });
      // LineMaterial requires resolution to be set
      lineMaterial.resolution.set(window.innerWidth, window.innerHeight);
      
      const boundaryLines = new LineSegments2(lineGeometry, lineMaterial);
      boundaryLines.renderOrder = 10; // Render AFTER forms so depth test works correctly
      boundaryLines.computeLineDistances();
      group.add(boundaryLines);
    }
    
    // Clean up
    brushA.geometry.dispose();
    brushB.geometry.dispose();
    result.geometry.dispose();
    edgesGeometry.dispose();
    
    return group.children.length > 0 ? group : null;
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
      
      const intersectionGroup = computeIntersectionEdges(forms[i], forms[j], color);
      if (intersectionGroup) {
        // Add all children from the intersection group
        while (intersectionGroup.children.length > 0) {
          group.add(intersectionGroup.children[0]);
        }
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
