import { useMemo } from 'react';
import { getAnatomyTermById } from '../../curriculum/anatomyTerms';
import { useMuscleStore } from '../../store/useMuscleStore';
import { isAnatomyTermsStudyTab } from '../../workout/workoutPanelRouting';
import AnatomyTermPlane from './AnatomyTermPlane';
import {
  allPlaneKinds,
  PLANE_TERM_IDS,
  planeKindFromTermId,
  planeKindFromTermVisualization,
  planeSpecForKind,
  type TermPlaneKind,
} from './anatomyTermPlaneSpecs';
import TermDirectionIndicator from './TermDirectionIndicator';
import TermJointMotion from './TermJointMotion';
import { getActiveLessonTermId } from './useActiveTermHighlight';

function PlanesOverviewScene({
  selectedKind,
  onSelectKind,
}: {
  selectedKind: TermPlaneKind | null;
  onSelectKind: (kind: TermPlaneKind) => void;
}): React.ReactElement {
  const frame = useMuscleStore((s) => s.anatomyStageFrame);
  const specs = useMemo(() => allPlaneKinds().map((kind) => planeSpecForKind(kind, frame)), [frame]);

  return (
    <group>
      {specs.map((spec) => (
        <AnatomyTermPlane
          key={spec.kind}
          spec={spec}
          emphasis={selectedKind === spec.kind ? 'selected' : 'muted'}
          interactive
          onSelect={onSelectKind}
        />
      ))}
    </group>
  );
}

export default function TermSceneOverlay(): React.ReactElement | null {
  const activeModuleId = useMuscleStore((s) => s.activeModuleId);
  const atlasTabActive = useMuscleStore((s) => s.atlasTabActive);
  const activeTermId = useMuscleStore((s) => s.activeTermId);
  const setActiveTermId = useMuscleStore((s) => s.setActiveTermId);
  const lessonStepIndex = useMuscleStore(
    (s) => s.moduleGuideByModule.get('anatomy_terms')?.lessonStepIndex ?? 0,
  );
  const anatomyStageFrame = useMuscleStore((s) => s.anatomyStageFrame);

  const termId = getActiveLessonTermId({ activeTermId, lessonStepIndex });
  const term = termId ? getAnatomyTermById(termId) : undefined;

  if (!isAnatomyTermsStudyTab(activeModuleId, atlasTabActive) || !term) return null;

  if (term.visualization === 'planes_overview') {
    const selectedKind = activeTermId ? planeKindFromTermId(activeTermId) : null;
    return (
      <PlanesOverviewScene
        selectedKind={selectedKind}
        onSelectKind={(kind) => setActiveTermId(PLANE_TERM_IDS[kind])}
      />
    );
  }

  const planeKind = planeKindFromTermVisualization(term.visualization);
  if (planeKind) {
    const spec = planeSpecForKind(planeKind, anatomyStageFrame);
    return <AnatomyTermPlane spec={spec} emphasis="selected" />;
  }

  if (term.visualization === 'direction_arrow' && term.direction) {
    return <TermDirectionIndicator direction={term.direction} />;
  }

  if (term.visualization === 'joint_motion') {
    return <TermJointMotion term={term} />;
  }

  return null;
}
