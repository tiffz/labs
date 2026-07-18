import type { ReactElement } from 'react';

import { PanelMockupSvg, type GeneratedPanelLayout } from '../../shared/comic';
import { ScrapboardScopeActions } from './ScrapboardScopeActions';

export type ScrapboardLayoutGalleryProps = {
  layouts: GeneratedPanelLayout[];
  selectedId: string;
  onSelect: (id: string) => void;
  onRandomizeLayout: () => void;
  layoutLocked: boolean;
  onToggleLayoutLock: () => void;
};

export function ScrapboardLayoutGallery({
  layouts,
  selectedId,
  onSelect,
  onRandomizeLayout,
  layoutLocked,
  onToggleLayoutLock,
}: ScrapboardLayoutGalleryProps): ReactElement {
  return (
    <div className="scrapboard-layout-gallery" data-testid="scrapboard-layout-gallery">
      <div className="scrapboard-layout-gallery__header">
        <p className="scrapboard-layout-gallery__hint">Layouts</p>
        <ScrapboardScopeActions
          scopeLabel="layout"
          locked={layoutLocked}
          onToggleLock={onToggleLayoutLock}
          onRandomize={onRandomizeLayout}
          testIdPrefix="scrapboard-layout"
          density="plain"
        />
      </div>
      <div className="scrapboard-layout-gallery__strip" role="list">
        {layouts.map((layout) => {
          const active = layout.id === selectedId;
          return (
            <button
              key={layout.id}
              type="button"
              className={[
                'scrapboard-layout-gallery__thumb',
                active ? 'scrapboard-layout-gallery__thumb--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelect(layout.id)}
              aria-pressed={active}
              data-testid={`scrapboard-layout-${layout.id}`}
            >
              <PanelMockupSvg
                layout={layout}
                fills={[]}
                width={64}
                height={84}
                showReadingOrder={false}
              />
              <span className="scrapboard-layout-gallery__label">{layout.label ?? layout.id}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
