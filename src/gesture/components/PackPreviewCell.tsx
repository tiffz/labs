import { memo, useLayoutEffect, useRef, useState } from 'react';

type PackPreviewCellProps = {
  url?: string;
  loading?: boolean;
  /** First cell in a strip may load with higher browser priority. */
  priority?: 'high' | 'low' | 'auto';
  /** First cell loads eagerly; others defer to browser lazy loading. */
  eager?: boolean;
  /** Called when the browser fails to decode/display the current url (e.g. stale https thumb). */
  onImageError?: () => void;
};

function imageAlreadyLoaded(img: HTMLImageElement | null, url: string): boolean {
  return Boolean(img?.complete && img.naturalWidth > 0 && img.src === url);
}

function PackPreviewCell({
  url,
  loading = false,
  priority = 'auto',
  eager = false,
  onImageError,
}: PackPreviewCellProps): React.ReactElement {
  const imgRef = useRef<HTMLImageElement>(null);
  const onImageErrorRef = useRef(onImageError);
  onImageErrorRef.current = onImageError;
  const [visible, setVisible] = useState(() => Boolean(url));
  const [failed, setFailed] = useState(false);
  const loadedUrlRef = useRef<string | undefined>(url);

  useLayoutEffect(() => {
    if (!url) {
      loadedUrlRef.current = undefined;
      setVisible(false);
      setFailed(false);
      return;
    }

    const img = imgRef.current;
    if (loadedUrlRef.current === url && imageAlreadyLoaded(img, url)) {
      setVisible(true);
      setFailed(false);
      return;
    }

    if (loadedUrlRef.current === url && img && !img.complete) {
      return;
    }

    if (loadedUrlRef.current !== url) {
      loadedUrlRef.current = url;
      if (!imageAlreadyLoaded(img, url)) {
        setVisible(false);
      }
      setFailed(false);
    }

    if (!img) return;

    const onLoad = () => setVisible(true);
    const onError = () => {
      if (url?.startsWith('https:')) onImageErrorRef.current?.();
      setFailed(true);
    };
    img.addEventListener('load', onLoad);
    img.addEventListener('error', onError);
    if (imageAlreadyLoaded(img, url)) {
      onLoad();
    }

    return () => {
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onError);
    };
  }, [url]);

  const showPlaceholder = !visible && !failed;

  return (
    <div className="gesture-preview-cell">
      {showPlaceholder ? (
        <div className={`gesture-preview-placeholder${loading || url ? ' is-loading' : ''}`} />
      ) : null}
      {url && !failed ? (
        <img
          ref={imgRef}
          src={url}
          alt=""
          className={`gesture-preview-image${visible ? ' is-visible' : ''}`}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority}
        />
      ) : null}
    </div>
  );
}

export default memo(PackPreviewCell);
