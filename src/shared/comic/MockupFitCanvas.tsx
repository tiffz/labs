import { useEffect, useRef, useState, type CSSProperties, type ReactElement, type ReactNode } from 'react';

import { mockupDimensionsForPrintSpec } from './panelMockupDimensions';
import type { LabsPrintSpec } from '../zine/labsPrintSpec';

export type MockupFitCanvasProps = {
  printSpec?: LabsPrintSpec;
  /** Smallest width the mockup will shrink to before scrolling. Defaults to 220px. */
  minWidth?: number;
  /** Width used at the print spec's aspect ratio before fitting to the container. Defaults to 440px. */
  maxWidth?: number;
  className?: string;
  innerClassName?: string;
  testId?: string;
  children: (size: { width: number; height: number }) => ReactNode;
};

const OUTER_STYLE: CSSProperties = {
  width: '100%',
  height: '100%',
  minHeight: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

/**
 * Scales a print-spec-aware mockup to fit the available stage space (shared by Scrapboard and
 * Lyrefly Thumbs so neither app hand-rolls its own ResizeObserver fit logic).
 */
export function MockupFitCanvas({
  printSpec,
  minWidth = 220,
  maxWidth = 440,
  className,
  innerClassName,
  testId = 'comic-mockup-fit-canvas',
  children,
}: MockupFitCanvasProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fitWidth, setFitWidth] = useState(maxWidth);
  const aspect = mockupDimensionsForPrintSpec(printSpec, maxWidth);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const update = (): void => {
      const { width, height } = node.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      const ratio = aspect.width / aspect.height;
      const widthFromHeight = height * ratio;
      const nextWidth = Math.max(minWidth, Math.min(width, widthFromHeight));
      setFitWidth(Math.round(nextWidth));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [aspect.width, aspect.height, minWidth, printSpec]);

  const fitHeight = Math.round(fitWidth / (aspect.width / aspect.height));

  return (
    <div
      ref={containerRef}
      className={['comic-mockup-fit-canvas', className].filter(Boolean).join(' ')}
      data-testid={testId}
      style={OUTER_STYLE}
    >
      <div
        className={['comic-mockup-fit-canvas__inner', innerClassName].filter(Boolean).join(' ')}
        style={{ width: fitWidth, height: fitHeight, maxWidth: '100%', maxHeight: '100%' }}
      >
        {children({ width: fitWidth, height: fitHeight })}
      </div>
    </div>
  );
}
