import { useEffect, useRef, useState } from 'react';

type PackPreviewCellProps = {
  url?: string;
  loading?: boolean;
  /** First cell in a strip may load with higher browser priority. */
  priority?: 'high' | 'auto';
};

export default function PackPreviewCell({
  url,
  loading = false,
  priority = 'auto',
}: PackPreviewCellProps): React.ReactElement {
  const imgRef = useRef<HTMLImageElement>(null);
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setVisible(false);
    setFailed(false);
    const img = imgRef.current;
    if (!img || !url) return;

    const onLoad = () => setVisible(true);
    const onError = () => setFailed(true);
    img.addEventListener('load', onLoad);
    img.addEventListener('error', onError);
    if (img.complete && img.naturalWidth > 0) {
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
          loading="eager"
          decoding="async"
          fetchPriority={priority}
        />
      ) : null}
    </div>
  );
}
