import { useEffect } from 'react';
import type { RefObject } from 'react';

export function useWordsStickyObservers(
  stickyControlsRef: RefObject<HTMLElement | null>,
  scoreActionsRef: RefObject<HTMLDivElement | null>,
  setIsStickyControlsStuck: (value: boolean | ((previous: boolean) => boolean)) => void,
  setIsScoreActionsStuck: (value: boolean | ((previous: boolean) => boolean)) => void
): void {
  useEffect(() => {
    let frameId = 0;
    const checkStickyState = () => {
      frameId = 0;
      if (stickyControlsRef.current) {
        const nextIsStuck =
          stickyControlsRef.current.getBoundingClientRect().top <= 0;
        setIsStickyControlsStuck((previous) =>
          previous === nextIsStuck ? previous : nextIsStuck
        );
      }
      if (scoreActionsRef.current) {
        const stickyTop = Number.parseFloat(
          window.getComputedStyle(scoreActionsRef.current).top || '0'
        );
        const nextScoreStuck =
          scoreActionsRef.current.getBoundingClientRect().top <= stickyTop + 0.5;
        setIsScoreActionsStuck((previous) =>
          previous === nextScoreStuck ? previous : nextScoreStuck
        );
      }
    };
    const onScrollOrResize = () => {
      if (frameId !== 0) return;
      frameId = window.requestAnimationFrame(checkStickyState);
    };
    onScrollOrResize();
    window.addEventListener('scroll', onScrollOrResize, {
      passive: true,
      capture: true,
    });
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      if (frameId !== 0) window.cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [stickyControlsRef, scoreActionsRef, setIsStickyControlsStuck, setIsScoreActionsStuck]);
}
