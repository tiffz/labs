import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';

import { mockupDimensionsForPrintSpec } from '../../shared/comic';
import type { LabsPrintSpec } from '../../shared/zine';

export type ScrapboardFitCanvasProps = {
  printSpec?: LabsPrintSpec;
  children: (size: { width: number; height: number }) => ReactNode;
};

/** Scale mockup to fit available stage height on laptop viewports. */
export function ScrapboardFitCanvas({ printSpec, children }: ScrapboardFitCanvasProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fitWidth, setFitWidth] = useState(440);
  const aspect = mockupDimensionsForPrintSpec(printSpec, 440);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const update = (): void => {
      const { width, height } = node.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      const ratio = aspect.width / aspect.height;
      const widthFromHeight = height * ratio;
      const nextWidth = Math.max(220, Math.min(width, widthFromHeight));
      setFitWidth(Math.round(nextWidth));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [aspect.width, aspect.height, printSpec]);

  const fitHeight = Math.round(fitWidth / (aspect.width / aspect.height));

  return (
    <div ref={containerRef} className="scrapboard-fit-canvas" data-testid="scrapboard-fit-canvas">
      <div
        className="scrapboard-fit-canvas__inner"
        style={{ width: fitWidth, height: fitHeight }}
      >
        {children({ width: fitWidth, height: fitHeight })}
      </div>
    </div>
  );
}
