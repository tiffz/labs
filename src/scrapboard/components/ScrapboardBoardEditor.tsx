import type { ReactElement } from 'react';

import { PanelMockupSvg } from '../../shared/comic';
import type { MockupPaletteApplyResult } from '../../shared/palette';
import type { LabsPrintSpec } from '../../shared/zine';
import type {
  ComicCastMember,
  PanelBackgroundImage,
  PanelFillSpec,
  PanelLayoutSpec,
} from '../../shared/comic';
import { ScrapboardFitCanvas } from './ScrapboardFitCanvas';

export type ScrapboardBoardEditorProps = {
  layout: PanelLayoutSpec;
  fills: PanelFillSpec[];
  cast?: ComicCastMember[];
  colors?: MockupPaletteApplyResult;
  printSpec?: LabsPrintSpec;
  showBleedGuides?: boolean;
  allowBubbleEscape?: boolean;
  className?: string;
  selectedPanelIndex?: number;
  onPanelSelect?: (panelIndex: number) => void;
  pageBackgroundImage?: PanelBackgroundImage;
};

/** Scrapboard's own mockup canvas (sketchy skin). Lyrefly Thumbs renders the shared
 * `src/shared/comic` engine directly instead of embedding this component. */
export function ScrapboardBoardEditor({
  layout,
  fills,
  cast,
  colors,
  printSpec,
  showBleedGuides = false,
  allowBubbleEscape = false,
  className,
  selectedPanelIndex,
  onPanelSelect,
  pageBackgroundImage,
}: ScrapboardBoardEditorProps): ReactElement {
  return (
    <div className={['scrapboard-board', className].filter(Boolean).join(' ')} data-testid="scrapboard-board">
      <ScrapboardFitCanvas printSpec={printSpec}>
        {(size) => (
          <PanelMockupSvg
            layout={layout}
            fills={fills}
            cast={cast}
            colors={colors}
            width={size.width}
            height={size.height}
            printSpec={printSpec}
            showBleedGuides={showBleedGuides}
            allowBubbleEscape={allowBubbleEscape}
            selectedPanelIndex={selectedPanelIndex}
            onPanelSelect={onPanelSelect}
            pageBackgroundImage={pageBackgroundImage}
            sketchy
          />
        )}
      </ScrapboardFitCanvas>
    </div>
  );
}
