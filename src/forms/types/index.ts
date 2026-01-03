import type { BufferGeometry } from 'three';

export type FormType = 'box' | 'sphere' | 'cylinder' | 'cone' | 'pyramid';

export interface FormConfig {
  id: string;
  type: FormType;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  geometry: BufferGeometry;
  radius: number; // For placement calculations
}

export interface PlacementConfig {
  enabledFormTypes: FormType[];
  formCount: number;
  maxIntersectionsPerForm: number;
  formSizeRange: [number, number]; // min, max size multiplier
}

export interface ViewSettings {
  formOpacity: number;
  showIntersections: boolean;
  intersectionColor: string;
  formEdgeColor: string;
}

export interface AppState {
  forms: FormConfig[];
  placementConfig: PlacementConfig;
  viewSettings: ViewSettings;
}

export const DEFAULT_PLACEMENT_CONFIG: PlacementConfig = {
  enabledFormTypes: ['box', 'sphere', 'cylinder', 'cone', 'pyramid'],
  formCount: 10, // More forms for better intersection practice
  maxIntersectionsPerForm: 4, // Allow more connections per form
  formSizeRange: [1.0, 1.6], // Slightly smaller for less clutter with more forms
};

export const DEFAULT_VIEW_SETTINGS: ViewSettings = {
  formOpacity: 0.4, // 40% opacity by default for better form visibility
  showIntersections: true, // Show intersection curves for study
  intersectionColor: '#1e40af', // Bold blue for intersection lines - stands out
  formEdgeColor: '#64748b', // Medium gray for form edges
};
