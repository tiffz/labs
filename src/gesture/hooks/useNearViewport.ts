import { useEffect, useState } from 'react';

/** True once the element is near or inside the viewport (for lazy image work). */
export function useNearViewport(rootMargin = '320px'): {
  ref: (node: HTMLElement | null) => void;
  near: boolean;
} {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    if (!root || near) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setNear(true);
        }
      },
      { rootMargin },
    );
    observer.observe(root);

    // IntersectionObserver may not fire synchronously when the node is already on screen.
    const rect = root.getBoundingClientRect();
    const margin = Number.parseFloat(rootMargin) || 0;
    const alreadyVisible =
      rect.bottom >= -margin &&
      rect.top <= window.innerHeight + margin &&
      rect.right >= -margin &&
      rect.left <= window.innerWidth + margin;
    if (alreadyVisible) {
      setNear(true);
    }

    return () => observer.disconnect();
  }, [near, root, rootMargin]);

  return { ref: setRoot, near };
}
