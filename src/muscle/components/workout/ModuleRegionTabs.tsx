import { isModuleUnlocked } from '../../srs/gatekeeper';
import { useModuleOptions, useMuscleStore } from '../../store/useMuscleStore';
import type { MuscleRegion } from '../../types/node';

export default function ModuleRegionTabs(): React.ReactElement {
  const modules = useModuleOptions();
  const activeModuleId = useMuscleStore((s) => s.activeModuleId);
  const setActiveModule = useMuscleStore((s) => s.setActiveModule);
  const progressByNode = useMuscleStore((s) => s.progressByNode);

  return (
    <div className="muscle-region-tabs" role="tablist" aria-label="Proko study regions">
      {modules.map((mod) => {
        const active = mod.id === activeModuleId;
        const unlocked = isModuleUnlocked(mod.id, progressByNode);
        return (
          <button
            key={mod.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`muscle-region-tabs__tab${active ? ' is-active' : ''}`}
            onClick={() => setActiveModule(mod.id as MuscleRegion)}
          >
            <span className="muscle-region-tabs__label">{mod.label}</span>
            {!unlocked && mod.id !== 'fundamentals' ? (
              <span className="muscle-region-tabs__lock" aria-hidden="true">
                🔒
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
