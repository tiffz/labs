import type { ReactElement, ReactNode } from 'react';

import { MockupFitCanvas } from '../../shared/comic';
import type { LabsPrintSpec } from '../../shared/zine';

export type ScrapboardFitCanvasProps = {
  printSpec?: LabsPrintSpec;
  children: (size: { width: number; height: number }) => ReactNode;
};

/** Scale mockup to fit available stage height on laptop viewports. */
export function ScrapboardFitCanvas({ printSpec, children }: ScrapboardFitCanvasProps): ReactElement {
  return (
    <MockupFitCanvas
      printSpec={printSpec}
      className="scrapboard-fit-canvas"
      innerClassName="scrapboard-fit-canvas__inner"
      testId="scrapboard-fit-canvas"
    >
      {children}
    </MockupFitCanvas>
  );
}
