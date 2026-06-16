import { useEffect, useState } from 'react';
import { observeNearViewport } from './gestureNearViewportObserver';

/** True once the element is near or inside the viewport (for lazy image work). */
export function useNearViewport(rootMargin = '320px'): {
  ref: (node: HTMLElement | null) => void;
  near: boolean;
} {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    if (!root || near) return;

    return observeNearViewport(root, rootMargin, (isIntersecting) => {
      if (isIntersecting) setNear(true);
    });
  }, [near, root, rootMargin]);

  return { ref: setRoot, near };
}
