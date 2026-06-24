import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import LabsDebugDock from '../../../shared/components/LabsDebugDock';
import { isLabsDebugEnabled } from '../../../shared/debug/readLabsDebugParams';
import { ALL_NODES } from '../../curriculum';
import {
  REQUIRED_FULL_BODY_BONE_IDS,
  REQUIRED_SKIN_OVERLAY_NODE_IDS,
} from '../../anatomy/requiredMeshIds';
import {
  getMuscleAnatomyDebugSnapshot,
  publishMuscleAnatomyDebugWindow,
  subscribeMuscleAnatomyDebug,
} from '../../debug/muscleAnatomyDebugRegistry';

const MONO: CSSProperties = { fontFamily: 'ui-monospace, monospace', fontSize: 11, lineHeight: 1.45 };
const ROW: CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 };

function missingFromInventory(required: readonly string[], loaded: readonly string[]): string[] {
  const have = new Set(loaded);
  return required.filter((id) => !have.has(id));
}

export default function MuscleAnatomyDebugPanel() {
  const enabled = useMemo(
    () => typeof window !== 'undefined' && isLabsDebugEnabled(window.location.search),
    [],
  );
  const [snapshot, setSnapshot] = useState(getMuscleAnatomyDebugSnapshot);

  useEffect(() => {
    if (!enabled) return;
    return subscribeMuscleAnatomyDebug(() => {
      setSnapshot(getMuscleAnatomyDebugSnapshot());
      publishMuscleAnatomyDebugWindow();
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    publishMuscleAnatomyDebugWindow();
  }, [enabled, snapshot]);

  if (!enabled) return null;

  const missingBones = missingFromInventory(REQUIRED_FULL_BODY_BONE_IDS, snapshot.anatomyNodeIds);
  const missingSkin = missingFromInventory(REQUIRED_SKIN_OVERLAY_NODE_IDS, snapshot.skinNodeIds);
  const atlasOnlyLoaded = snapshot.anatomyNodeIds.filter((id) => id.startsWith('atlas_')).length;
  const curriculumLoaded = snapshot.anatomyNodeIds.filter((id) => !id.startsWith('atlas_')).length;

  return (
    <LabsDebugDock
      appId="muscle"
      accentColor="#c45c26"
      title="Muscle anatomy"
      defaultCollapsed
    >
      <div style={{ ...MONO, color: '#e2e8f0', padding: '4px 0 8px' }}>
        <div style={ROW}>
          <span>Anatomy meshes: {snapshot.anatomyNodeIds.length}</span>
          <span>Skin overlays: {snapshot.skinNodeIds.length}</span>
          <span>Catalog: {ALL_NODES.length} nodes</span>
        </div>
        <div style={ROW}>
          <span>Curriculum ids: {curriculumLoaded}</span>
          <span>Atlas fill: {atlasOnlyLoaded}</span>
        </div>
        {missingBones.length > 0 ? (
          <p style={{ color: '#fca5a5', margin: '6px 0' }}>
            Missing required bones ({missingBones.length}): {missingBones.join(', ')}
          </p>
        ) : (
          <p style={{ color: '#86efac', margin: '6px 0' }}>Required full-body bones loaded.</p>
        )}
        {missingSkin.length > 0 ? (
          <p style={{ color: '#fca5a5', margin: '6px 0' }}>
            Missing skin overlays ({missingSkin.length}): {missingSkin.join(', ')}
          </p>
        ) : (
          <p style={{ color: '#86efac', margin: '6px 0' }}>Required skin overlays loaded.</p>
        )}
        <p style={{ color: '#94a3b8', margin: '8px 0 0' }}>
          Compare loaded ids to catalog with <code>npm run muscle:coverage</code>. Boundary seam
          regressions: <code>npm run muscle:skin-boundary</code>.
        </p>
      </div>
    </LabsDebugDock>
  );
}
