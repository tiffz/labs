import { useEffect, useState } from 'react';

type ClientSize = {
  width: number;
  height: number;
};

export function useElementClientSize<T extends HTMLElement>(): {
  ref: (node: T | null) => void;
  element: T | null;
  size: ClientSize;
} {
  const [node, setNode] = useState<T | null>(null);
  const [size, setSize] = useState<ClientSize>({ width: 0, height: 0 });

  useEffect(() => {
    if (!node) {
      setSize({ width: 0, height: 0 });
      return;
    }

    const sync = () => {
      setSize({ width: node.clientWidth, height: node.clientHeight });
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  return { ref: setNode, element: node, size };
}
