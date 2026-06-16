type NearViewportCallback = (isIntersecting: boolean) => void;

type ObserverBucket = {
  observer: IntersectionObserver;
  callbacks: Map<Element, NearViewportCallback>;
};

const buckets = new Map<string, ObserverBucket>();

function bucketKey(rootMargin: string): string {
  return rootMargin;
}

function getBucket(rootMargin: string): ObserverBucket {
  const key = bucketKey(rootMargin);
  let bucket = buckets.get(key);
  if (!bucket) {
    const callbacks = new Map<Element, NearViewportCallback>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          callbacks.get(entry.target)?.(entry.isIntersecting);
        }
      },
      { rootMargin },
    );
    bucket = { observer, callbacks };
    buckets.set(key, bucket);
  }
  return bucket;
}

function parseRootMarginPx(rootMargin: string): number {
  const match = /^(-?\d+(?:\.\d+)?)px/.exec(rootMargin.trim());
  return match ? Number.parseFloat(match[1]!) : 0;
}

/** Returns true when the element is already within rootMargin of the viewport. */
export function isElementNearViewport(element: HTMLElement, rootMargin: string): boolean {
  const margin = parseRootMarginPx(rootMargin);
  const rect = element.getBoundingClientRect();
  return (
    rect.bottom >= -margin &&
    rect.top <= window.innerHeight + margin &&
    rect.right >= -margin &&
    rect.left <= window.innerWidth + margin
  );
}

/** One shared IntersectionObserver per rootMargin — avoids N observers on large grids. */
export function observeNearViewport(
  element: HTMLElement,
  rootMargin: string,
  onChange: NearViewportCallback,
): () => void {
  const bucket = getBucket(rootMargin);
  bucket.callbacks.set(element, onChange);
  bucket.observer.observe(element);

  if (isElementNearViewport(element, rootMargin)) {
    onChange(true);
  }

  return () => {
    bucket.observer.unobserve(element);
    bucket.callbacks.delete(element);
  };
}
