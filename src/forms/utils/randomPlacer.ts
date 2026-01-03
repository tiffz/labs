import type { FormConfig, FormType, PlacementConfig } from '../types';
import { createGeometry, getFormBoundingRadius } from './formGenerators';

/**
 * Generates a random ID for a form
 */
function generateId(): string {
  return `form-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Picks a random item from an array
 */
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generates a random number in a range
 */
function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Generates a random rotation (in radians)
 */
function randomRotation(): [number, number, number] {
  return [
    randomInRange(-Math.PI / 6, Math.PI / 6),
    randomInRange(0, Math.PI * 2),
    randomInRange(-Math.PI / 6, Math.PI / 6),
  ];
}

/**
 * Calculate distance between two 3D points
 */
function distance3D(
  p1: [number, number, number],
  p2: [number, number, number]
): number {
  return Math.sqrt(
    (p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2 + (p1[2] - p2[2]) ** 2
  );
}

/**
 * Normalize a 3D vector
 */
function normalize(v: [number, number, number]): [number, number, number] {
  const len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
  if (len === 0) return [1, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

/**
 * Attachment point on a form's surface for connecting new forms
 */
interface AttachmentPoint {
  position: [number, number, number];  // World position
  direction: [number, number, number]; // Outward direction (normalized)
  parentFormIndex: number;
  used: boolean;
}

/**
 * Get attachment points for a form type at a given position and scale
 * Returns 3-4 points at the form's edges/corners for tree-like branching
 */
function getAttachmentPoints(
  type: FormType,
  formIndex: number,
  position: [number, number, number],
  scale: number
): AttachmentPoint[] {
  const points: AttachmentPoint[] = [];
  
  switch (type) {
    case 'box': {
      // 4 face centers (front, back, left, right) - horizontal spread
      const faceOffset = scale * 0.5;
      const directions: [number, number, number][] = [
        [1, 0, 0],   // right
        [-1, 0, 0],  // left
        [0, 0, 1],   // front
        [0, 0, -1],  // back
      ];
      for (const dir of directions) {
        points.push({
          position: [
            position[0] + dir[0] * faceOffset,
            position[1] + dir[1] * faceOffset,
            position[2] + dir[2] * faceOffset,
          ],
          direction: dir,
          parentFormIndex: formIndex,
          used: false,
        });
      }
      break;
    }
    
    case 'sphere': {
      // 4 points around equator (N, S, E, W)
      const sphereRadius = scale * 0.5;
      const directions: [number, number, number][] = [
        [1, 0, 0],
        [-1, 0, 0],
        [0, 0, 1],
        [0, 0, -1],
      ];
      for (const dir of directions) {
        points.push({
          position: [
            position[0] + dir[0] * sphereRadius,
            position[1] + dir[1] * sphereRadius,
            position[2] + dir[2] * sphereRadius,
          ],
          direction: dir,
          parentFormIndex: formIndex,
          used: false,
        });
      }
      break;
    }
    
    case 'cylinder': {
      // 2 points on top edge + 2 points on bottom edge (opposite sides)
      const cylRadius = scale * 0.4;
      const cylHalfHeight = scale * 0.5;
      const topBottom: [number, number][] = [[cylHalfHeight, 1], [-cylHalfHeight, -0.3]];
      const sides: [number, number][] = [[1, 0], [-1, 0]];
      
      for (const [y, yDir] of topBottom) {
        for (const [x, z] of sides) {
          const dir = normalize([x * 0.7, yDir * 0.3, z * 0.7]);
          points.push({
            position: [
              position[0] + x * cylRadius,
              position[1] + y,
              position[2] + z * cylRadius,
            ],
            direction: dir,
            parentFormIndex: formIndex,
            used: false,
          });
        }
      }
      break;
    }
    
    case 'cone': {
      // 3 points around base circle + 1 near tip
      const coneRadius = scale * 0.5;
      const coneHalfHeight = scale * 0.5;
      
      // Base points (3 around the circle)
      for (let i = 0; i < 3; i++) {
        const angle = (i * 2 * Math.PI) / 3;
        const x = Math.cos(angle);
        const z = Math.sin(angle);
        const dir = normalize([x * 0.8, -0.2, z * 0.8]);
        points.push({
          position: [
            position[0] + x * coneRadius,
            position[1] - coneHalfHeight,
            position[2] + z * coneRadius,
          ],
          direction: dir,
          parentFormIndex: formIndex,
          used: false,
        });
      }
      // Tip point
      points.push({
        position: [position[0], position[1] + coneHalfHeight * 0.7, position[2]],
        direction: [0, 1, 0],
        parentFormIndex: formIndex,
        used: false,
      });
      break;
    }
    
    case 'pyramid': {
      // 4 base corners
      const pyrRadius = scale * 0.7;
      const pyrHalfHeight = scale * 0.5;
      const corners: [number, number][] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
      
      for (const [x, z] of corners) {
        const dir = normalize([x * 0.7, -0.3, z * 0.7]);
        points.push({
          position: [
            position[0] + x * pyrRadius * 0.7,
            position[1] - pyrHalfHeight,
            position[2] + z * pyrRadius * 0.7,
          ],
          direction: dir,
          parentFormIndex: formIndex,
          used: false,
        });
      }
      break;
    }
  }
  
  return points;
}

/**
 * Place a new form at an attachment point with moderate overlap for visible intersections
 */
function placeAtAttachmentPoint(
  attachPoint: AttachmentPoint,
  parentRadius: number,
  newRadius: number
): [number, number, number] {
  // Moderate overlap: 30-45% of combined radii for clear visible intersections
  const overlapRatio = randomInRange(0.30, 0.45);
  const combinedRadii = parentRadius + newRadius;
  const separation = combinedRadii * (1 - overlapRatio);
  
  // Place along the outward direction from the attachment point
  // The new form center is placed at: attachPoint + direction * (newRadius - small_overlap)
  const offset = separation - parentRadius;
  
  return [
    attachPoint.position[0] + attachPoint.direction[0] * offset,
    attachPoint.position[1] + attachPoint.direction[1] * offset,
    attachPoint.position[2] + attachPoint.direction[2] * offset,
  ];
}

/**
 * Check if a new position would collide too deeply with existing forms
 */
function checkCollisions(
  position: [number, number, number],
  radius: number,
  placedForms: { position: [number, number, number]; radius: number }[],
  parentIndex: number,
  maxOverlapRatio: number = 0.35
): { valid: boolean; intersectingIndices: number[] } {
  const intersectingIndices: number[] = [];
  
  for (let i = 0; i < placedForms.length; i++) {
    const form = placedForms[i];
    const dist = distance3D(position, form.position);
    const combinedRadii = radius + form.radius;
    const overlap = combinedRadii - dist;
    
    if (overlap > 0) {
      const overlapRatio = overlap / Math.min(radius, form.radius);
      
      // Allow shallow overlap with parent, reject deep overlaps with others
      if (i === parentIndex) {
        intersectingIndices.push(i);
      } else if (overlapRatio > maxOverlapRatio) {
        // Too deep collision with non-parent
        return { valid: false, intersectingIndices: [] };
      } else if (overlap > 0) {
        intersectingIndices.push(i);
      }
    }
  }
  
  return { valid: true, intersectingIndices };
}

/**
 * Mark nearby attachment points as used (exclusion zone)
 */
function markNearbyPointsAsUsed(
  allPoints: AttachmentPoint[],
  newPosition: [number, number, number],
  exclusionRadius: number
): void {
  for (const point of allPoints) {
    if (!point.used) {
      const dist = distance3D(point.position, newPosition);
      if (dist < exclusionRadius) {
        point.used = true;
      }
    }
  }
}

/**
 * Filter attachment points that face away from a direction (back toward parent)
 */
function filterPointsFacingAway(
  points: AttachmentPoint[],
  fromDirection: [number, number, number]
): AttachmentPoint[] {
  return points.filter(p => {
    // Dot product to check if pointing roughly same direction
    const dot = p.direction[0] * fromDirection[0] + 
                p.direction[1] * fromDirection[1] + 
                p.direction[2] * fromDirection[2];
    // Keep points that don't point back (dot > -0.5 means angle < 120 degrees)
    return dot > -0.5;
  });
}

/**
 * Main function to generate forms with tree-like placement
 * Forms branch outward from attachment points, creating a spread-out structure
 */
export function generateFormsWithIntersections(config: PlacementConfig): FormConfig[] {
  const { enabledFormTypes, formCount, formSizeRange } = config;
  
  if (enabledFormTypes.length === 0) {
    return [];
  }
  
  const forms: FormConfig[] = [];
  const placedForms: { position: [number, number, number]; radius: number }[] = [];
  const allAttachmentPoints: AttachmentPoint[] = [];
  
  // Track children count per form for balanced branching
  const childrenCount: number[] = [];
  
  // Create first form at origin
  const firstType = randomChoice(enabledFormTypes);
  const firstSize = randomInRange(formSizeRange[0], formSizeRange[1]);
  const firstRadius = getFormBoundingRadius(firstType, firstSize);
  
  const firstForm: FormConfig = {
    id: generateId(),
    type: firstType,
    position: [0, 0, 0],
    rotation: randomRotation(),
    scale: [firstSize, firstSize, firstSize],
    geometry: createGeometry(firstType, 1),
    radius: firstRadius,
  };
  
  forms.push(firstForm);
  placedForms.push({ position: [0, 0, 0], radius: firstRadius });
  childrenCount.push(0);
  
  // Add first form's attachment points
  const firstPoints = getAttachmentPoints(firstType, 0, [0, 0, 0], firstSize);
  allAttachmentPoints.push(...firstPoints);
  
  // Generate remaining forms using tree branching
  for (let i = 1; i < formCount; i++) {
    const type = randomChoice(enabledFormTypes);
    const size = randomInRange(formSizeRange[0], formSizeRange[1]);
    const radius = getFormBoundingRadius(type, size);
    
    // Get available attachment points, sorted by parent's children count (prefer balanced)
    const availablePoints = allAttachmentPoints
      .filter(p => !p.used)
      .sort((a, b) => childrenCount[a.parentFormIndex] - childrenCount[b.parentFormIndex]);
    
    let placed = false;
    let finalPosition: [number, number, number] = [0, 0, 0];
    let parentIndex = 0;
    let usedDirection: [number, number, number] = [1, 0, 0];
    
    // Try each available attachment point
    for (const attachPoint of availablePoints) {
      const parentRadius = placedForms[attachPoint.parentFormIndex].radius;
      const candidatePosition = placeAtAttachmentPoint(attachPoint, parentRadius, radius);
      
      // Check for collisions with existing forms
      const collision = checkCollisions(
        candidatePosition, 
        radius, 
        placedForms, 
        attachPoint.parentFormIndex
      );
      
      if (collision.valid && collision.intersectingIndices.length > 0) {
        finalPosition = candidatePosition;
        parentIndex = attachPoint.parentFormIndex;
        usedDirection = attachPoint.direction;
        attachPoint.used = true;
        placed = true;
        break;
      }
    }
    
    // Fallback: if no attachment point works, try random placement near a form
    if (!placed) {
      const targetIndex = Math.floor(Math.random() * placedForms.length);
      const targetForm = placedForms[targetIndex];
      
      // Random direction
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      usedDirection = [
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi),
      ];
      
      // Place with moderate overlap for visible intersections
      const overlapRatio = randomInRange(0.30, 0.45);
      const dist = (targetForm.radius + radius) * (1 - overlapRatio);
      
      finalPosition = [
        targetForm.position[0] + usedDirection[0] * dist,
        targetForm.position[1] + usedDirection[1] * dist,
        targetForm.position[2] + usedDirection[2] * dist,
      ];
      parentIndex = targetIndex;
    }
    
    // Create the new form
    const newForm: FormConfig = {
      id: generateId(),
      type,
      position: finalPosition,
      rotation: randomRotation(),
      scale: [size, size, size],
      geometry: createGeometry(type, 1),
      radius,
    };
    
    forms.push(newForm);
    placedForms.push({ position: finalPosition, radius });
    childrenCount.push(0);
    childrenCount[parentIndex]++;
    
    // Mark nearby attachment points as used (exclusion zone)
    const exclusionRadius = radius * 1.5;
    markNearbyPointsAsUsed(allAttachmentPoints, finalPosition, exclusionRadius);
    
    // Add new form's attachment points (excluding ones facing back toward parent)
    const newPoints = getAttachmentPoints(type, forms.length - 1, finalPosition, size);
    const filteredPoints = filterPointsFacingAway(newPoints, [
      -usedDirection[0],
      -usedDirection[1],
      -usedDirection[2],
    ]);
    allAttachmentPoints.push(...filteredPoints);
  }
  
  return forms;
}
