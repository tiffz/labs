import { memo, useEffect, useMemo } from 'react';
import { useNearViewport } from '../hooks/useNearViewport';
import { usePackPreviewUrls } from '../hooks/usePackPreviewUrls';
import { GESTURE_PREVIEW_THUMB_WIDTH } from '../media/gestureMediaPolicy';
import {
  clearGesturePreviewResolveTier,
  setGesturePreviewResolveTier,
} from '../media/gesturePreviewResolvePriority';
import PackPreviewCell from './PackPreviewCell';

type PackPreviewStripProps = {
  driveFileIds: string[];
  limit?: number;
  className?: string;
  /** When false, only show cache hits (skip network). */
  previewFetchEnabled?: boolean;
  /** Drive thumbnail width — compact 2-up cards use a smaller default via caller. */
  thumbWidth?: number;
};

function PackPreviewStrip({
  driveFileIds,
  limit = 4,
  className,
  previewFetchEnabled = true,
  thumbWidth = GESTURE_PREVIEW_THUMB_WIDTH,
}: PackPreviewStripProps): React.ReactElement {
  const { ref, near } = useNearViewport('240px');
  const previewIds = useMemo(
    () => driveFileIds.slice(0, limit).filter(Boolean),
    [driveFileIds, limit],
  );
  const fetchEnabled = previewFetchEnabled;
  const { urls, loading, retryPreview } = usePackPreviewUrls(previewIds, limit, fetchEnabled, thumbWidth);
  const slots = previewIds.length > 0 ? previewIds.length : limit;

  useEffect(() => {
    if (!previewFetchEnabled || !near || previewIds.length === 0) return;
    setGesturePreviewResolveTier(previewIds, 0);
    return () => clearGesturePreviewResolveTier(previewIds);
  }, [near, previewFetchEnabled, previewIds]);

  return (
    <div
      ref={ref}
      className={`gesture-preview-strip${className ? ` ${className}` : ''}`}
      aria-hidden={previewIds.length === 0}
    >
      {Array.from({ length: slots }, (_, index) => (
        <PackPreviewCell
          key={previewIds[index] ?? `empty-${index}`}
          url={urls[index] || undefined}
          loading={!urls[index] && fetchEnabled && loading}
          eager={index === 0}
          priority={index === 0 ? 'high' : 'low'}
          onImageError={
            previewIds[index]
              ? () => {
                  void retryPreview(previewIds[index]!);
                }
              : undefined
          }
        />
      ))}
    </div>
  );
}

function arePackPreviewStripPropsEqual(
  a: PackPreviewStripProps,
  b: PackPreviewStripProps,
): boolean {
  if (a.limit !== b.limit || a.className !== b.className) return false;
  if (a.previewFetchEnabled !== b.previewFetchEnabled) return false;
  if (a.thumbWidth !== b.thumbWidth) return false;
  const limitA = a.limit ?? 4;
  const limitB = b.limit ?? 4;
  return a.driveFileIds.slice(0, limitA).join(',') === b.driveFileIds.slice(0, limitB).join(',');
}

export default memo(PackPreviewStrip, arePackPreviewStripPropsEqual);
