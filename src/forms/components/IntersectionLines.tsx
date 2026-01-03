import { useMemo, useEffect } from 'react';
import type { FormConfig, ViewSettings } from '../types';
import { computeAllIntersections } from '../utils/intersectionComputer';

interface IntersectionLinesProps {
  forms: FormConfig[];
  viewSettings: ViewSettings;
}

function IntersectionLines({ forms, viewSettings }: IntersectionLinesProps) {
  // Compute intersections when forms change
  // Renders intersection curves as lines
  const intersectionGroup = useMemo(() => {
    if (!viewSettings.showIntersections || forms.length < 2) {
      return null;
    }
    
    // Render intersection edges with the intersection color
    return computeAllIntersections(forms, viewSettings.intersectionColor);
  }, [forms, viewSettings.showIntersections, viewSettings.intersectionColor]);
  
  // Clean up old intersection group when it changes
  useEffect(() => {
    return () => {
      if (intersectionGroup) {
        intersectionGroup.traverse((child) => {
          if ('geometry' in child && child.geometry) {
            (child.geometry as { dispose: () => void }).dispose();
          }
          if ('material' in child && child.material) {
            (child.material as { dispose: () => void }).dispose();
          }
        });
      }
    };
  }, [intersectionGroup]);
  
  if (!intersectionGroup || !viewSettings.showIntersections) {
    return null;
  }
  
  return <primitive object={intersectionGroup} />;
}

export default IntersectionLines;
