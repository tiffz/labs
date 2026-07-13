import type { ReactElement } from 'react';

import { PanelMockupSvg } from '../../shared/comic';
import type { MockupPaletteApplyResult } from '../../shared/palette';
import type { LabsPrintSpec } from '../../shared/zine';
import type { PanelFillSpec, PanelLayoutSpec } from '../../shared/comic';
import { ScrapboardFitCanvas } from './ScrapboardFitCanvas';

export type ScrapboardBoardEditorProps = {
  layout: PanelLayoutSpec;
  fills: PanelFillSpec[];
  colors?: MockupPaletteApplyResult;
  printSpec?: LabsPrintSpec;
  showBleedGuides?: boolean;
  allowBubbleEscape?: boolean;
  className?: string;
  selectedPanelIndex?: number;
  onPanelSelect?: (panelIndex: number) => void;
};

/** Embeddable Scrapboard mockup canvas (standalone + Lyrefly Thumbs). */
export function ScrapboardBoardEditor({
  layout,
  fills,
  colors,
  printSpec,
  showBleedGuides = false,
  allowBubbleEscape = false,
  className,
  selectedPanelIndex,
  onPanelSelect,
}: ScrapboardBoardEditorProps): ReactElement {
  return (
    <div className={['scrapboard-board', className].filter(Boolean).join(' ')} data-testid="scrapboard-board">
      <ScrapboardFitCanvas printSpec={printSpec}>
        {(size) => (
          <PanelMockupSvg
            layout={layout}
            fills={fills}
            colors={colors}
            width={size.width}
            height={size.height}
            printSpec={printSpec}
            showBleedGuides={showBleedGuides}
            allowBubbleEscape={allowBubbleEscape}
            selectedPanelIndex={selectedPanelIndex}
            onPanelSelect={onPanelSelect}
            sketchy
          />
        )}
      </ScrapboardFitCanvas>
    </div>
  );
}
