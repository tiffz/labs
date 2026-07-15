import type { ReactElement } from 'react';

import { PanelMockupSvg } from '../../shared/comic';
import type { GeneratedPanelLayout } from '../../shared/comic';

export type ScrapboardLayoutGalleryProps = {
  layouts: GeneratedPanelLayout[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export function ScrapboardLayoutGallery({
  layouts,
  selectedId,
  onSelect,
}: ScrapboardLayoutGalleryProps): ReactElement {
  return (
    <div className="scrapboard-layout-gallery" data-testid="scrapboard-layout-gallery">
      <p className="scrapboard-layout-gallery__hint">Layouts</p>
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
              <PanelMockupSvg layout={layout} fills={[]} width={64} height={84} showReadingOrder={false} />
              <span className="scrapboard-layout-gallery__label">{layout.label ?? layout.id}</span>
              <span
                className="scrapboard-layout-gallery__score"
                title="Layout familiarity, not speech-bubble quality"
              >
                {Math.round((layout.conventionality ?? 0) * 100)}% familiar
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
