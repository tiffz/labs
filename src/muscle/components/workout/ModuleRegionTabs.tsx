import { handleSpaLinkClick } from '../../../shared/navigation/spaLinkClick';
import { isModuleUnlocked } from '../../srs/gatekeeper';
import { muscleModuleHref, syncMuscleModuleUrl } from '../../routes/muscleAppUrl';
import { useModuleOptions, useMuscleStore } from '../../store/useMuscleStore';
import { isAnatomyTermsStudyTab, isFullBodyAtlasTab } from '../../workout/workoutPanelRouting';
import type { MuscleRegion } from '../../types/node';

export default function ModuleRegionTabs(): React.ReactElement {
  const modules = useModuleOptions();
  const bodyView = useMuscleStore((s) => s.bodyView);
  const activeModuleId = useMuscleStore((s) => s.activeModuleId);
  const atlasTabActive = useMuscleStore((s) => s.atlasTabActive);
  const setBodyView = useMuscleStore((s) => s.setBodyView);
  const setActiveModule = useMuscleStore((s) => s.setActiveModule);
  const progressByNode = useMuscleStore((s) => s.progressByNode);

  return (
    <div className="muscle-region-tabs" role="tablist" aria-label="Proko study regions">
      <a
        href={muscleModuleHref(null)}
        role="tab"
        aria-selected={isFullBodyAtlasTab(bodyView, atlasTabActive)}
        className={`muscle-region-tabs__tab${isFullBodyAtlasTab(bodyView, atlasTabActive) ? ' is-active' : ''}`}
        onClick={(e) =>
          handleSpaLinkClick(e, () => {
            setBodyView('full_body');
            syncMuscleModuleUrl(null);
          })
        }
      >
        <span className="muscle-region-tabs__label">Full body</span>
      </a>
      {modules.map((mod) => {
        const active =
          mod.id === 'anatomy_terms'
            ? isAnatomyTermsStudyTab(activeModuleId, atlasTabActive)
            : bodyView === 'region' && mod.id === activeModuleId;
        const unlocked = isModuleUnlocked(mod.id, progressByNode);
        return (
          <a
            key={mod.id}
            href={muscleModuleHref(mod.id as MuscleRegion)}
            role="tab"
            aria-selected={active}
            className={`muscle-region-tabs__tab${active ? ' is-active' : ''}`}
            onClick={(e) =>
              handleSpaLinkClick(e, () => {
                setActiveModule(mod.id as MuscleRegion);
                syncMuscleModuleUrl(mod.id as MuscleRegion);
              })
            }
          >
            <span className="muscle-region-tabs__label">{mod.label}</span>
            {!unlocked && mod.id !== 'anatomy_terms' && mod.id !== 'fundamentals' ? (
              <span className="muscle-region-tabs__lock" aria-hidden="true">
                🔒
              </span>
            ) : null}
          </a>
        );
      })}
    </div>
  );
}
