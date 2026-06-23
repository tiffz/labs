import FaceRetouchingNaturalOutlinedIcon from '@mui/icons-material/FaceRetouchingNaturalOutlined';
import { useMemo } from 'react';
import {
  countVisibleNodesForView,
  isStudySkinVisibleAtPeel,
  LAYER_PEEL_STOPS,
  layerPeelDepthLabel,
  type LayerPeelDepth,
} from '../../layerDepthView';
import { useMuscleStore } from '../../store/useMuscleStore';

type LayerDepthControlProps = {
  /** Sidebar shows stop buttons; canvas overlay is slider-only. */
  variant?: 'panel' | 'canvas';
};

export default function LayerDepthControl({ variant = 'panel' }: LayerDepthControlProps) {
  const bodyView = useMuscleStore((s) => s.bodyView);
  const activeModuleId = useMuscleStore((s) => s.activeModuleId);
  const layerPeelDepth = useMuscleStore((s) => s.layerPeelDepth);
  const showSkinLayer = useMuscleStore((s) => s.showSkinLayer);
  const setLayerPeelDepth = useMuscleStore((s) => s.setLayerPeelDepth);
  const toggleSkinLayer = useMuscleStore((s) => s.toggleSkinLayer);

  const visibleNodeCount = useMemo(
    () => countVisibleNodesForView(bodyView, activeModuleId, layerPeelDepth),
    [activeModuleId, bodyView, layerPeelDepth],
  );

  const skinAvailable = bodyView === 'full_body' && isStudySkinVisibleAtPeel(layerPeelDepth, true);

  return (
    <div
      className={`muscle-layer-peel${variant === 'canvas' ? ' muscle-layer-peel--canvas' : ''}`}
      aria-label="Anatomy layer depth"
    >
      <div className="muscle-layer-peel__header">
        <span className="muscle-layer-peel__label" id="muscle-layer-peel-label">
          Depth
        </span>
        <span className="muscle-layer-peel__count">
          {layerPeelDepthLabel(layerPeelDepth)} · {visibleNodeCount}
        </span>
        {skinAvailable ? (
          <button
            type="button"
            className={`muscle-layer-peel__skin-btn${showSkinLayer ? ' is-active' : ''}`}
            onClick={toggleSkinLayer}
            aria-pressed={showSkinLayer}
            aria-label={showSkinLayer ? 'Hide skin layer' : 'Show skin layer'}
            title={showSkinLayer ? 'Hide skin' : 'Show skin'}
          >
            <FaceRetouchingNaturalOutlinedIcon fontSize="inherit" aria-hidden />
          </button>
        ) : null}
      </div>
      <div className="muscle-layer-peel__slider-wrap">
        <input
          type="range"
          className="muscle-layer-peel__slider"
          min={0}
          max={LAYER_PEEL_STOPS.length - 1}
          step={1}
          list="muscle-layer-peel-ticks"
          value={layerPeelDepth}
          aria-labelledby="muscle-layer-peel-label"
          aria-valuetext={`${layerPeelDepthLabel(layerPeelDepth)} · ${visibleNodeCount} structures visible`}
          onChange={(event) => setLayerPeelDepth(Number(event.target.value) as LayerPeelDepth)}
        />
        <datalist id="muscle-layer-peel-ticks">
          {LAYER_PEEL_STOPS.map((stop) => (
            <option key={stop.depth} value={stop.depth} label={stop.label} />
          ))}
        </datalist>
        <div className="muscle-layer-peel__notches" aria-hidden>
          {LAYER_PEEL_STOPS.map((stop) => (
            <span
              key={stop.depth}
              className={`muscle-layer-peel__notch${layerPeelDepth === stop.depth ? ' is-active' : ''}`}
            />
          ))}
        </div>
      </div>
      {variant === 'panel' ? (
        <div className="muscle-layer-peel__stops" role="radiogroup" aria-labelledby="muscle-layer-peel-label">
          {LAYER_PEEL_STOPS.map((stop) => {
            const active = layerPeelDepth === stop.depth;
            return (
              <button
                key={stop.depth}
                type="button"
                role="radio"
                aria-checked={active}
                title={stop.hint}
                className={`muscle-layer-peel__stop${active ? ' is-active' : ''}`}
                onClick={() => setLayerPeelDepth(stop.depth)}
              >
                <span className="muscle-layer-peel__stop-label">{stop.label}</span>
                <span className="muscle-layer-peel__stop-hint">{stop.hint}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
