import { useMemo } from 'react';
import {
  countVisibleRegionNodesAtPeel,
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
  const activeModuleId = useMuscleStore((s) => s.activeModuleId);
  const layerPeelDepth = useMuscleStore((s) => s.layerPeelDepth);
  const setLayerPeelDepth = useMuscleStore((s) => s.setLayerPeelDepth);

  const visibleNodeCount = useMemo(
    () => countVisibleRegionNodesAtPeel(activeModuleId, layerPeelDepth),
    [activeModuleId, layerPeelDepth],
  );

  const activeStop = LAYER_PEEL_STOPS[layerPeelDepth];

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
          {layerPeelDepthLabel(layerPeelDepth)} · {visibleNodeCount} visible
        </span>
      </div>
      <input
        type="range"
        className="muscle-layer-peel__slider"
        min={0}
        max={LAYER_PEEL_STOPS.length - 1}
        step={1}
        value={layerPeelDepth}
        aria-labelledby="muscle-layer-peel-label"
        aria-valuetext={`${layerPeelDepthLabel(layerPeelDepth)} · ${visibleNodeCount} structures visible`}
        onChange={(event) => setLayerPeelDepth(Number(event.target.value) as LayerPeelDepth)}
      />
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
                className={`muscle-layer-peel__stop${active ? ' is-active' : ''}`}
                onClick={() => setLayerPeelDepth(stop.depth)}
              >
                <span className="muscle-layer-peel__stop-label">{stop.label}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="muscle-layer-peel__canvas-hint">{activeStop?.hint}</p>
      )}
    </div>
  );
}
