import { useMemo, type ReactElement } from 'react';
import {
  getNodesForView,
  groupNodesByLayerDepth,
  isNodeVisibleAtPeelDepth,
  LAYER_DEPTH_LABELS,
} from '../../layerDepthView';
import { useMuscleStore } from '../../store/useMuscleStore';
import type { MuscleMemoryNode } from '../../types/node';

const LAYER_ORDER: ReadonlyArray<0 | 1 | 2 | 3> = [0, 1, 2, 3];

function typeAbbrev(type: MuscleMemoryNode['type']): string {
  if (type === 'muscle') return 'M';
  if (type === 'bone') return 'B';
  return 'J';
}

function StructureRow({ node }: { node: MuscleMemoryNode }) {
  const selectedNodeId = useMuscleStore((s) => s.selectedNodeId);
  const focusedNodeId = useMuscleStore((s) => s.focusedNodeId);
  const hoveredNodeId = useMuscleStore((s) => s.hoveredNodeId);
  const mode = useMuscleStore((s) => s.mode);
  const focusStructure = useMuscleStore((s) => s.focusStructure);
  const selectNode = useMuscleStore((s) => s.selectNode);
  const setHoveredNodeId = useMuscleStore((s) => s.setHoveredNodeId);

  const active = focusedNodeId === node.id || selectedNodeId === node.id;
  const hovered = hoveredNodeId === node.id;

  return (
    <button
      type="button"
      className={[
        'muscle-structure-row',
        active ? 'is-selected' : '',
        hovered ? 'is-hovered' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-current={active ? 'true' : undefined}
      onClick={() => {
        if (mode === 'warmup') focusStructure(node.id);
        else selectNode(node.id);
      }}
      onMouseEnter={() => setHoveredNodeId(node.id)}
      onMouseLeave={() => setHoveredNodeId(null)}
      onFocus={() => setHoveredNodeId(node.id)}
      onBlur={() => setHoveredNodeId(null)}
    >
      <span className={`muscle-structure-row__type muscle-structure-row__type--${node.type}`}>
        {typeAbbrev(node.type)}
      </span>
      <span className="muscle-structure-row__copy">
        <span className="muscle-structure-row__name">{node.name}</span>
        {node.latinName ? (
          <span className="muscle-structure-row__latin">{node.latinName}</span>
        ) : null}
      </span>
    </button>
  );
}

export default function StructureBrowser({ embedded = false }: { embedded?: boolean }): ReactElement {
  const bodyView = useMuscleStore((s) => s.bodyView);
  const activeModuleId = useMuscleStore((s) => s.activeModuleId);
  const layerPeelDepth = useMuscleStore((s) => s.layerPeelDepth);

  const grouped = useMemo(() => {
    const nodes = getNodesForView(bodyView, activeModuleId).filter((node) =>
      isNodeVisibleAtPeelDepth(node, layerPeelDepth),
    );
    return groupNodesByLayerDepth(nodes, layerPeelDepth);
  }, [activeModuleId, bodyView, layerPeelDepth]);

  return (
    <section
      className={`muscle-structure-browser${embedded ? ' muscle-structure-browser--embedded' : ''}`}
      aria-label="Structures in this module"
    >
      {!embedded ? (
        <header className="muscle-structure-browser__header">
          <h2 className="muscle-structure-browser__title">Structures</h2>
          <p className="muscle-structure-browser__hint">Tap a name to study it in the canvas.</p>
        </header>
      ) : null}
      <div className="muscle-structure-browser__groups">
        {LAYER_ORDER.map((layer) => {
          const nodes = grouped[layer];
          if (nodes.length === 0) return null;
          return (
            <div key={layer} className="muscle-structure-browser__group">
              <h3 className="muscle-structure-browser__group-label">
                {LAYER_DEPTH_LABELS[layer]}
                <span className="muscle-structure-browser__group-count">{nodes.length}</span>
              </h3>
              <div className="muscle-structure-browser__list">
                {nodes.map((node) => (
                  <StructureRow key={node.id} node={node} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
